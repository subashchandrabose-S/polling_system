package handlers

import (
	"context"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pooling_system/backend/internal/middleware"
	"github.com/pooling_system/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const shareCodeChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// PollHandler handles poll-related HTTP requests
type PollHandler struct {
	pollsColl *mongo.Collection
	rdb       *redis.Client
}

// NewPollHandler creates a new PollHandler
func NewPollHandler(db *mongo.Database, rdb *redis.Client) *PollHandler {
	return &PollHandler{
		pollsColl: db.Collection("polls"),
		rdb:       rdb,
	}
}

// createPollRequest defines the expected body for POST /polls
type createPollRequest struct {
	Title       string              `json:"title"       binding:"required,min=3,max=200"`
	Description string              `json:"description" binding:"max=1000"`
	Options     []createPollOption  `json:"options"     binding:"required,min=2,max=10"`
	Settings    models.PollSettings `json:"settings"`
	ExpiresAt   *time.Time          `json:"expires_at"`
}

type createPollOption struct {
	Text string `json:"text" binding:"required,min=1,max=200"`
}

// generateShareCode produces a random 8-character alphanumeric code
func generateShareCode() string {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, 8)
	for i := range b {
		b[i] = shareCodeChars[rng.Intn(len(shareCodeChars))]
	}
	return string(b)
}

// CreatePoll handles POST /api/v1/polls (auth required)
func (h *PollHandler) CreatePoll(c *gin.Context) {
	var req createPollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	creatorIDStr, _ := c.Get(middleware.ContextUserIDKey)
	creatorID, err := primitive.ObjectIDFromHex(creatorIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user identity"})
		return
	}

	// Build options list
	options := make([]models.PollOption, 0, len(req.Options))
	for i, opt := range req.Options {
		options = append(options, models.PollOption{
			ID:        primitive.NewObjectID().Hex()[:8] + string(rune('0'+i)),
			Text:      strings.TrimSpace(opt.Text),
			VoteCount: 0,
		})
	}

	now := time.Now().UTC()
	poll := models.Poll{
		ID:          primitive.NewObjectID(),
		CreatorID:   creatorID,
		ShareCode:   generateShareCode(),
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		Options:     options,
		Settings:    req.Settings,
		IsActive:    true,
		TotalVotes:  0,
		ExpiresAt:   req.ExpiresAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Retry share code generation on collision (extremely rare)
	for attempt := 0; attempt < 5; attempt++ {
		_, err = h.pollsColl.InsertOne(ctx, poll)
		if err == nil {
			break
		}
		if mongo.IsDuplicateKeyError(err) {
			poll.ShareCode = generateShareCode()
			continue
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create poll"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create poll after retries"})
		return
	}

	c.JSON(http.StatusCreated, poll)
}

// GetPollByShareCode handles GET /api/v1/polls/:shareCode (public)
func (h *PollHandler) GetPollByShareCode(c *gin.Context) {
	shareCode := c.Param("shareCode")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var poll models.Poll
	if err := h.pollsColl.FindOne(ctx, bson.M{"share_code": shareCode}).Decode(&poll); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Check if poll has passed expiry time
	if poll.ExpiresAt != nil && time.Now().UTC().After(*poll.ExpiresAt) {
		poll.IsActive = false
	}

	// Merge live Redis vote counts if available
	if h.rdb != nil {
		redisKey := "poll:votes:" + shareCode
		counts, err := h.rdb.HGetAll(ctx, redisKey).Result()
		if err == nil && len(counts) > 0 {
			for i, opt := range poll.Options {
				if val, ok := counts[opt.ID]; ok {
					var count int64
					for _, ch := range val {
						count = count*10 + int64(ch-'0')
					}
					poll.Options[i].VoteCount = count
				}
			}
			// Recalculate total from Redis voter counter
			totalStr, err := h.rdb.Get(ctx, "poll:voters:"+shareCode).Result()
			if err == nil {
				var total int64
				for _, ch := range totalStr {
					total = total*10 + int64(ch-'0')
				}
				poll.TotalVotes = total
			}
		}
	}

	c.JSON(http.StatusOK, poll)
}

// GetMyPolls handles GET /api/v1/polls/me (auth required)
func (h *PollHandler) GetMyPolls(c *gin.Context) {
	creatorIDStr, _ := c.Get(middleware.ContextUserIDKey)
	creatorID, err := primitive.ObjectIDFromHex(creatorIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user identity"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := h.pollsColl.Find(ctx, bson.M{"creator_id": creatorID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode polls"})
		return
	}

	if polls == nil {
		polls = []models.Poll{}
	}
	c.JSON(http.StatusOK, gin.H{"polls": polls, "count": len(polls)})
}

// ClosePoll handles PUT /api/v1/polls/:shareCode/close (auth required + ownership)
func (h *PollHandler) ClosePoll(c *gin.Context) {
	shareCode := c.Param("shareCode")
	creatorIDStr, _ := c.Get(middleware.ContextUserIDKey)
	creatorID, err := primitive.ObjectIDFromHex(creatorIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user identity"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Fetch poll to verify ownership
	var poll models.Poll
	if err := h.pollsColl.FindOne(ctx, bson.M{"share_code": shareCode}).Decode(&poll); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if poll.CreatorID != creatorID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this poll"})
		return
	}

	if !poll.IsActive {
		c.JSON(http.StatusConflict, gin.H{"error": "Poll is already closed"})
		return
	}

	now := time.Now().UTC()
	update := bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": now,
		},
	}
	if _, err := h.pollsColl.UpdateOne(ctx, bson.M{"share_code": shareCode}, update); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to close poll"})
		return
	}

	poll.IsActive = false
	poll.UpdatedAt = now
	c.JSON(http.StatusOK, poll)
}
