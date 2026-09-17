package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimiter creates a Redis-backed sliding window / fixed window counter rate limiting middleware
func RateLimiter(rdb *redis.Client, maxRequests int, windowSeconds int) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Identify client by user ID if authenticated, otherwise fallback to Client IP
		var identifier string
		if val, exists := c.Get(ContextUserIDKey); exists && val != nil {
			identifier = fmt.Sprintf("user:%v", val)
		} else {
			identifier = fmt.Sprintf("ip:%s", c.ClientIP())
		}

		key := fmt.Sprintf("ratelimit:%s:%s", c.FullPath(), identifier)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		pipe := rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		ttlCmd := pipe.TTL(ctx, key)
		_, err := pipe.Exec(ctx)

		if err != nil {
			// If Redis is unreachable, allow request to proceed but log warning
			c.Next()
			return
		}

		currentCount := incrCmd.Val()
		ttlDuration := ttlCmd.Val()

		// Set key expiry on first request
		if currentCount == 1 || ttlDuration < 0 {
			rdb.Expire(ctx, key, time.Duration(windowSeconds)*time.Second)
			ttlDuration = time.Duration(windowSeconds) * time.Second
		}

		// Set standard RateLimit headers
		remaining := maxRequests - int(currentCount)
		if remaining < 0 {
			remaining = 0
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(maxRequests))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(ttlDuration).Unix(), 10))

		if currentCount > int64(maxRequests) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Too many requests. Rate limit exceeded.",
				"retry_after": int(ttlDuration.Seconds()),
			})
			return
		}

		c.Next()
	}
}
