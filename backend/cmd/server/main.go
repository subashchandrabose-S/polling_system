package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pooling_system/backend/internal/config"
	"github.com/pooling_system/backend/internal/database"
	"github.com/pooling_system/backend/internal/handlers"
	"github.com/pooling_system/backend/internal/hub"
	"github.com/pooling_system/backend/internal/middleware"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	cfg := config.LoadConfig()

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// ── MongoDB ───────────────────────────────────────────────────────────────
	mongoInstance, err := database.ConnectMongo(cfg)
	if err != nil {
		log.Printf("[WARNING] MongoDB connection failed: %v. Running in degraded mode.", err)
	} else {
		defer func() {
			disconnectCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := mongoInstance.Disconnect(disconnectCtx); err != nil {
				log.Printf("Error disconnecting MongoDB: %v", err)
			}
		}()
		// Ensure DB indexes on startup
		ensureIndexes(mongoInstance.Database)
	}

	// ── Redis ─────────────────────────────────────────────────────────────────
	redisInstance, err := database.ConnectRedis(cfg)
	if err != nil {
		log.Printf("[WARNING] Redis connection failed: %v. Rate-limiting fallback will be active.", err)
	} else {
		defer func() {
			if err := redisInstance.Close(); err != nil {
				log.Printf("Error closing Redis: %v", err)
			}
		}()
	}

	// ── WebSocket Hub ─────────────────────────────────────────────────────────
	wsHub := hub.New()

	// ── Handlers ──────────────────────────────────────────────────────────────
	var (
		authHandler  *handlers.AuthHandler
		oauthHandler *handlers.OAuthHandler
		pollHandler  *handlers.PollHandler
		voteHandler  *handlers.VoteHandler
		wsHandler    *handlers.WSHandler
	)

	if mongoInstance != nil {
		authHandler = handlers.NewAuthHandler(cfg, mongoInstance.Database)
		oauthHandler = handlers.NewOAuthHandler(cfg, mongoInstance.Database)
		var rdbClient interface{ Close() error } = redisInstance

		var rdb interface{} = nil
		if redisInstance != nil {
			rdb = redisInstance.Client
		}
		_ = rdbClient
		_ = rdb

		if redisInstance != nil {
			pollHandler = handlers.NewPollHandler(mongoInstance.Database, redisInstance.Client)
			voteHandler = handlers.NewVoteHandler(mongoInstance.Database, redisInstance.Client, wsHub)
			wsHandler = handlers.NewWSHandler(redisInstance.Client, wsHub)
		} else {
			pollHandler = handlers.NewPollHandler(mongoInstance.Database, nil)
			voteHandler = handlers.NewVoteHandler(mongoInstance.Database, nil, wsHub)
			wsHandler = handlers.NewWSHandler(nil, wsHub)
		}
	}

	// ── Router ────────────────────────────────────────────────────────────────
	router := gin.Default()
	router.RedirectTrailingSlash = true
	router.RedirectFixedPath = true

	// Global Middlewares
	router.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigins))

	if redisInstance != nil {
		router.Use(middleware.RateLimiter(redisInstance.Client, cfg.RateLimitRequests, cfg.RateLimitWindowSecs))
	}

	// Status response handler for root/api routes
	statusHandler := func(c *gin.Context) {
		accept := c.GetHeader("Accept")
		if strings.Contains(accept, "text/html") {
			c.Header("Content-Type", "text/html")
			c.String(http.StatusOK, `
				<!DOCTYPE html>
				<html>
				<head>
					<title>PollStream Backend API</title>
					<style>
						body { font-family: system-ui, sans-serif; background: #080b14; color: #fff; text-align: center; padding-top: 20vh; margin: 0; }
						.box { display: inline-block; padding: 2rem; border-radius: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
						h1 { color: #22d3ee; margin-top: 0; }
						p { color: #94a3b8; }
						.status { display: inline-flex; items-center; gap: 0.5rem; background: rgba(52,211,153,0.1); color: #34d399; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; }
						.dot { width: 8px; height: 8px; background-color: #34d399; border-radius: 50%; box-shadow: 0 0 8px #34d399; }
					</style>
				</head>
				<body>
					<div class="box">
						<div class="status"><div class="dot"></div>API is running</div>
						<h1>PollStream Backend</h1>
						<p>The PollStream Real-Time API is online and accepting connections.</p>
						<p style="font-size: 0.8em; margin-top: 2rem; color: #64748b;">Endpoints: /api/v1 | /ws/poll/:shareCode | /health</p>
					</div>
				</body>
				</html>
			`)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"service": "PollStream Real-Time Polling Engine",
			"status":  "online",
			"version": "v1",
			"time":    time.Now().UTC().Format(time.RFC3339),
			"endpoints": gin.H{
				"root":      "/",
				"health":    "/health",
				"api_v1":    "/api/v1",
				"ping":      "/api/v1/ping",
				"signup":    "/api/v1/auth/signup",
				"login":     "/api/v1/auth/login",
				"polls":     "/api/v1/polls",
				"websocket": "/ws/poll/:shareCode",
			},
		})
	}

	// ── Root & Base API Endpoints (GET/HEAD for health checks & browsers) ─────
	router.Any("/", statusHandler)
	router.Any("/api", statusHandler)
	router.Any("/api/v1", statusHandler)
	router.Any("/api/v1/", statusHandler)

	// ── Health Check ──────────────────────────────────────────────────────────
	healthHandler := func(c *gin.Context) {
		mongoStatus := "disconnected"
		if mongoInstance != nil {
			mongoStatus = "connected"
		}
		redisStatus := "disconnected"
		if redisInstance != nil {
			redisStatus = "connected"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "polling-system-backend",
			"time":    time.Now().UTC().Format(time.RFC3339),
			"dependencies": gin.H{
				"mongodb": mongoStatus,
				"redis":   redisStatus,
			},
		})
	}
	router.Any("/health", healthHandler)
	router.Any("/healthz", healthHandler)

	// ── Custom 404 Handler ────────────────────────────────────────────────────
	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Endpoint not found",
			"path":    c.Request.URL.Path,
			"method":  c.Request.Method,
			"message": "Verify the URL path. API routes are under /api/v1/ and WebSocket under /ws/poll/:shareCode",
			"available_endpoints": gin.H{
				"root":      "/",
				"health":    "/health",
				"api_ping":  "/api/v1/ping",
				"auth":      "/api/v1/auth",
				"polls":     "/api/v1/polls",
				"websocket": "/ws/poll/:shareCode",
			},
		})
	})

	// ── WebSocket Route (outside /api/v1 to avoid rate limiter) ──────────────
	if wsHandler != nil {
		router.GET("/ws/poll/:shareCode", wsHandler.ServeWS)
	}

	// ── API v1 ────────────────────────────────────────────────────────────────
	v1 := router.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		// ── Auth routes ───────────────────────────────────────────────────────
		if authHandler != nil {
			auth := v1.Group("/auth")
			{
				auth.POST("/signup", authHandler.Signup)
				auth.POST("/login", authHandler.Login)

				// OAuth — Google & GitHub
				if oauthHandler != nil {
					oauth := auth.Group("/oauth")
					{
						oauth.GET("/google", oauthHandler.GoogleLogin)
						oauth.GET("/google/callback", oauthHandler.GoogleCallback)
						oauth.GET("/github", oauthHandler.GithubLogin)
						oauth.GET("/github/callback", oauthHandler.GithubCallback)
					}
				}
			}
		}

		// ── Poll routes ───────────────────────────────────────────────────────
		if pollHandler != nil {
			polls := v1.Group("/polls")
			{
				// Public
				polls.GET("/:shareCode", pollHandler.GetPollByShareCode)

				// Auth required
				pollsAuth := polls.Group("")
				pollsAuth.Use(middleware.AuthRequired(cfg.JWTSecret))
				{
					pollsAuth.POST("", pollHandler.CreatePoll)
					pollsAuth.GET("/me", pollHandler.GetMyPolls)
					pollsAuth.PUT("/:shareCode/close", pollHandler.ClosePoll)
				}
			}
		}

		// ── Vote routes ───────────────────────────────────────────────────────
		if voteHandler != nil {
			v1.POST("/polls/:shareCode/vote",
				middleware.OptionalAuth(cfg.JWTSecret),
				voteHandler.Vote,
			)
		}
	}

	// ── HTTP Server ───────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		log.Printf("Backend HTTP server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server startup failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down backend server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Backend server exited cleanly")
}

// ensureIndexes creates required MongoDB indexes on startup
func ensureIndexes(db *mongo.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// users: unique email
	db.Collection("users").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	// polls: unique share_code
	db.Collection("polls").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "share_code", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	// polls: creator_id for fast "my polls" lookup
	db.Collection("polls").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "creator_id", Value: 1}},
	})

	// votes: compound index for dedup audit
	db.Collection("votes").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "poll_id", Value: 1},
			{Key: "session_id", Value: 1},
		},
	})

	log.Println("[DB] MongoDB indexes ensured")
}
