package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all backend configuration values
type Config struct {
	Port                string
	Env                 string
	MongoURI            string
	MongoDB             string
	RedisURL            string
	RedisAddr           string
	RedisPassword       string
	RedisDB             int
	JWTSecret           string
	JWTExpireHours      int
	RateLimitRequests   int
	RateLimitWindowSecs int
	CORSAllowedOrigins  []string
}

// LoadConfig reads configuration from environment variables with fallback defaults
func LoadConfig() *Config {
	// Try to load .env file if present, ignore if not found
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables and defaults")
	}

	origins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	var allowedOrigins []string
	for _, origin := range strings.Split(origins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	return &Config{
		Port:                getEnv("PORT", "8080"),
		Env:                 getEnv("ENV", "development"),
		MongoURI:            getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:             getEnv("MONGO_DB", "polling_system"),
		RedisURL:            getEnv("REDIS_URL", ""),
		RedisAddr:           getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:       getEnv("REDIS_PASSWORD", ""),
		RedisDB:             getEnvAsInt("REDIS_DB", 0),
		JWTSecret:           getEnv("JWT_SECRET", "supersecretjwtkey_change_in_production_min32bytes!"),
		JWTExpireHours:      getEnvAsInt("JWT_EXPIRE_HOURS", 72),
		RateLimitRequests:   getEnvAsInt("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindowSecs: getEnvAsInt("RATE_LIMIT_WINDOW_SECONDS", 60),
		CORSAllowedOrigins:  allowedOrigins,
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	valStr := os.Getenv(key)
	if valStr == "" {
		return fallback
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return fallback
	}
	return val
}
