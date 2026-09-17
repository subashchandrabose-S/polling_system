package database

import (
	"context"
	"log"
	"time"

	"github.com/pooling_system/backend/internal/config"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// MongoInstance wraps the MongoDB client and database reference
type MongoInstance struct {
	Client   *mongo.Client
	Database *mongo.Database
}

// ConnectMongo initializes and pings the MongoDB instance
func ConnectMongo(cfg *config.Config) (*MongoInstance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}

	// Ping the primary node
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, err
	}

	db := client.Database(cfg.MongoDB)
	log.Printf("Successfully connected to MongoDB database: %s", cfg.MongoDB)

	return &MongoInstance{
		Client:   client,
		Database: db,
	}, nil
}

// Disconnect gracefully shuts down the MongoDB client connection
func (m *MongoInstance) Disconnect(ctx context.Context) error {
	if m.Client != nil {
		return m.Client.Disconnect(ctx)
	}
	return nil
}
