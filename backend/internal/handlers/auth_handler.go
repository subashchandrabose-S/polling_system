package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pooling_system/backend/internal/config"
	"github.com/pooling_system/backend/internal/models"
	"github.com/pooling_system/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	cfg       *config.Config
	usersColl *mongo.Collection
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(cfg *config.Config, db *mongo.Database) *AuthHandler {
	return &AuthHandler{
		cfg:       cfg,
		usersColl: db.Collection("users"),
	}
}

// signupRequest defines the expected body for /auth/signup
type signupRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

// loginRequest defines the expected body for /auth/login
type loginRequest struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Signup handles POST /api/v1/auth/signup
func (h *AuthHandler) Signup(c *gin.Context) {
	var req signupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Basic email format check
	if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check for duplicate email
	var existing models.User
	err := h.usersColl.FindOne(ctx, bson.M{"email": strings.ToLower(req.Email)}).Decode(&existing)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "An account with this email already exists"})
		return
	}
	if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Build user document
	now := time.Now().UTC()
	user := models.User{
		ID:        primitive.NewObjectID(),
		Username:  strings.TrimSpace(req.Username),
		Email:     strings.ToLower(strings.TrimSpace(req.Email)),
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := user.SetPassword(req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	if _, err := h.usersColl.InsertOne(ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Issue token immediately upon signup
	token, err := utils.GenerateToken(
		user.ID.Hex(), user.Email, user.Username,
		h.cfg.JWTSecret, h.cfg.JWTExpireHours,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user":  user,
	})
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	err := h.usersColl.FindOne(ctx, bson.M{"email": strings.ToLower(req.Email)}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		// Use generic message to prevent email enumeration
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !user.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, err := utils.GenerateToken(
		user.ID.Hex(), user.Email, user.Username,
		h.cfg.JWTSecret, h.cfg.JWTExpireHours,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}
