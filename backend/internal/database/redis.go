package database

import (
	"context"
	"log"
	"time"

	"github.com/pooling_system/backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// RedisInstance wraps the Redis client
type RedisInstance struct {
	Client *redis.Client
}

// ConnectRedis initializes and pings the Redis client
func ConnectRedis(cfg *config.Config) (*RedisInstance, error) {
	var rdb *redis.Client

	if cfg.RedisURL != "" {
		opt, err := redis.ParseURL(cfg.RedisURL)
		if err != nil {
			return nil, err
		}
		rdb = redis.NewClient(opt)
	} else {
		rdb = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPassword,
			DB:       cfg.RedisDB,
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	log.Printf("Successfully connected to Redis at: %s (DB: %d)", cfg.RedisAddr, cfg.RedisDB)

	return &RedisInstance{
		Client: rdb,
	}, nil
}

// Close closes the Redis connection
func (r *RedisInstance) Close() error {
	if r.Client != nil {
		return r.Client.Close()
	}
	return nil
}
