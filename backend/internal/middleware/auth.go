package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pooling_system/backend/internal/utils"
)

const (
	ContextUserIDKey   = "currentUserID"
	ContextEmailKey    = "currentUserEmail"
	ContextUsernameKey = "currentUsername"
)

// AuthRequired ensures that the request carries a valid Bearer JWT token
func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && strings.EqualFold(parts[0], "Bearer")) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization format must be Bearer {token}",
			})
			return
		}

		tokenString := strings.TrimSpace(parts[1])
		claims, err := utils.ValidateToken(tokenString, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			return
		}

		// Store user identity details in gin context for handlers
		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextEmailKey, claims.Email)
		c.Set(ContextUsernameKey, claims.Username)

		c.Next()
	}
}

// OptionalAuth parses the token if provided, but does not abort if absent
func OptionalAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				tokenString := strings.TrimSpace(parts[1])
				if claims, err := utils.ValidateToken(tokenString, jwtSecret); err == nil {
					c.Set(ContextUserIDKey, claims.UserID)
					c.Set(ContextEmailKey, claims.Email)
					c.Set(ContextUsernameKey, claims.Username)
				}
			}
		}
		c.Next()
	}
}
