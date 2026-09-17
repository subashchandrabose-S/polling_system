package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pooling_system/backend/internal/hub"
	"github.com/pooling_system/backend/internal/middleware"
	"github.com/pooling_system/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// VoteHandler handles voting requests
type VoteHandler struct {
	pollsColl *mongo.Collection
	votesColl *mongo.Collection
	rdb       *redis.Client
	hub       *hub.Hub
}

// NewVoteHandler creates a new VoteHandler
func NewVoteHandler(db *mongo.Database, rdb *redis.Client, h *hub.Hub) *VoteHandler {
	return &VoteHandler{
		pollsColl: db.Collection("polls"),
		votesColl: db.Collection("votes"),
		rdb:       rdb,
		hub:       h,
	}
}

// voteRequest defines the expected body for POST /polls/:shareCode/vote
type voteRequest struct {
	OptionID string `json:"option_id" binding:"required"`
}

// voteResultPayload is published to Redis and broadcast over WebSocket
type voteResultPayload struct {
	ShareCode   string            `json:"share_code"`
	TotalVoters int64             `json:"total_voters"`
	Counts      map[string]int64  `json:"counts"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// Vote handles POST /api/v1/polls/:shareCode/vote (optional auth)
func (h *VoteHandler) Vote(c *gin.Context) {
	shareCode := c.Param("shareCode")

	var req voteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// ── 1. Fetch poll and validate it is active ──────────────────────────────
	var poll models.Poll
	if err := h.pollsColl.FindOne(ctx, bson.M{"share_code": shareCode}).Decode(&poll); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !poll.IsActive {
		c.JSON(http.StatusConflict, gin.H{"error": "This poll is closed"})
		return
	}

	// Check expiry
	if poll.ExpiresAt != nil && time.Now().UTC().After(*poll.ExpiresAt) {
		c.JSON(http.StatusConflict, gin.H{"error": "This poll has expired"})
		return
	}

	// Validate chosen option belongs to this poll
	validOption := false
	for _, opt := range poll.Options {
		if opt.ID == req.OptionID {
			validOption = true
			break
		}
	}
	if !validOption {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid option ID"})
		return
	}

	// ── 2. Fingerprint for double-vote prevention ────────────────────────────
	userIDStr := ""
	if val, exists := c.Get(middleware.ContextUserIDKey); exists {
		userIDStr = val.(string)
	}
	fingerprint := buildFingerprint(userIDStr, c.ClientIP(), c.Request.UserAgent())
	dedupeKey := fmt.Sprintf("voted:%s:%s", shareCode, fingerprint)

	set, err := h.rdb.SetNX(ctx, dedupeKey, "1", 24*time.Hour).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Redis error during vote deduplication"})
		return
	}
	if !set {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already voted on this poll"})
		return
	}

	// ── 3. Save vote document to MongoDB ────────────────────────────────────
	now := time.Now().UTC()
	vote := models.Vote{
		ID:        primitive.NewObjectID(),
		PollID:    poll.ID,
		OptionID:  req.OptionID,
		VoterIP:   c.ClientIP(),
		SessionID: fingerprint,
		CreatedAt: now,
	}
	if userIDStr != "" {
		uid, _ := primitive.ObjectIDFromHex(userIDStr)
		vote.UserID = &uid
	}

	if _, err := h.votesColl.InsertOne(ctx, vote); err != nil {
		// Rollback dedup key so voter can retry
		h.rdb.Del(ctx, dedupeKey)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record vote"})
		return
	}

	// ── 4. Increment Redis counters ──────────────────────────────────────────
	votesKey := "poll:votes:" + shareCode
	votersKey := "poll:voters:" + shareCode

	pipe := h.rdb.Pipeline()
	pipe.HIncrBy(ctx, votesKey, req.OptionID, 1)
	pipe.Incr(ctx, votersKey)
	if _, err := pipe.Exec(ctx); err != nil {
		// Non-fatal: counters can be rebuilt from MongoDB if needed
		// Vote is already committed; continue
	}

	// ── 5. Build current tally and publish to Redis channel ──────────────────
	payload := h.buildVotePayload(ctx, shareCode, poll)
	payloadBytes, _ := json.Marshal(payload)

	h.rdb.Publish(ctx, "poll:"+shareCode, string(payloadBytes))

	// ── 6. Broadcast directly to WebSocket clients via Hub ───────────────────
	if h.hub != nil {
		h.hub.Broadcast(shareCode, payloadBytes)
	}

	c.JSON(http.StatusOK, payload)
}

// buildFingerprint creates a SHA-256 hash from voter identity signals
func buildFingerprint(userID, ip, userAgent string) string {
	raw := fmt.Sprintf("%s|%s|%s", userID, ip, userAgent)
	sum := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", sum)
}

// buildVotePayload reads current Redis counters and returns a structured tally
func (h *VoteHandler) buildVotePayload(ctx context.Context, shareCode string, poll models.Poll) voteResultPayload {
	counts := make(map[string]int64)

	if h.rdb != nil {
		rawCounts, err := h.rdb.HGetAll(ctx, "poll:votes:"+shareCode).Result()
		if err == nil {
			for optID, val := range rawCounts {
				if n, err := strconv.ParseInt(val, 10, 64); err == nil {
					counts[optID] = n
				}
			}
		}
	}

	var totalVoters int64
	if h.rdb != nil {
		if val, err := h.rdb.Get(ctx, "poll:voters:"+shareCode).Result(); err == nil {
			totalVoters, _ = strconv.ParseInt(val, 10, 64)
		}
	}

	return voteResultPayload{
		ShareCode:   shareCode,
		TotalVoters: totalVoters,
		Counts:      counts,
		UpdatedAt:   time.Now().UTC(),
	}
}
