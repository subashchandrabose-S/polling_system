package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// originMatches checks if the request origin matches an allowed origin.
// Supports exact matches and wildcard suffix patterns like "*.vercel.app".
func originMatches(allowed, origin string) bool {
	if allowed == "*" {
		return true
	}
	if strings.EqualFold(allowed, origin) {
		return true
	}
	// Wildcard suffix match: "*.vercel.app" matches "https://foo.vercel.app"
	if strings.HasPrefix(allowed, "*.") {
		suffix := allowed[1:] // e.g. ".vercel.app"
		lowerOrigin := strings.ToLower(origin)
		// Strip scheme to get host
		host := lowerOrigin
		if idx := strings.Index(host, "://"); idx != -1 {
			host = host[idx+3:]
		}
		// Strip port if present
		if idx := strings.LastIndex(host, ":"); idx != -1 {
			host = host[:idx]
		}
		return strings.HasSuffix(host, strings.ToLower(suffix))
	}
	return false
}

// CORSMiddleware provides configured Cross-Origin Resource Sharing handling.
// Entries in allowedOrigins may be exact origins or wildcard patterns like "*.vercel.app".
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		isAllowed := false
		for _, allowed := range allowedOrigins {
			if originMatches(strings.TrimSpace(allowed), origin) {
				isAllowed = true
				break
			}
		}

		if isAllowed && origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else if len(allowedOrigins) > 0 && allowedOrigins[0] == "*" {
			c.Header("Access-Control-Allow-Origin", "*")
		}

		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, Upgrade, Connection")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")
		c.Header("Access-Control-Expose-Headers", "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

