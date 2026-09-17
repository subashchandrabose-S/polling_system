package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PollOption represents an individual choice in a poll
type PollOption struct {
	ID        string `bson:"id" json:"id"`
	Text      string `bson:"text" json:"text"`
	VoteCount int64  `bson:"vote_count" json:"vote_count"`
}

// PollSettings contains configuration rules for how the poll behaves
type PollSettings struct {
	AllowMultiple bool `bson:"allow_multiple" json:"allow_multiple"`
	IsAnonymous   bool `bson:"is_anonymous" json:"is_anonymous"`
	RequireAuth   bool `bson:"require_auth" json:"require_auth"`
}

// Poll represents a user-created polling event
type Poll struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CreatorID   primitive.ObjectID `bson:"creator_id" json:"creator_id"`
	ShareCode   string             `bson:"share_code" json:"share_code"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Options     []PollOption       `bson:"options" json:"options"`
	Settings    PollSettings       `bson:"settings" json:"settings"`
	IsActive    bool               `bson:"is_active" json:"is_active"`
	TotalVotes  int64              `bson:"total_votes" json:"total_votes"`
	ExpiresAt   *time.Time         `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}
