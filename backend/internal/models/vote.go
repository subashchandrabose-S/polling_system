package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Vote records an individual ballot cast for a poll option
type Vote struct {
	ID         primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	PollID     primitive.ObjectID  `bson:"poll_id" json:"poll_id"`
	OptionID   string              `bson:"option_id" json:"option_id"`
	UserID     *primitive.ObjectID `bson:"user_id,omitempty" json:"user_id,omitempty"`
	VoterIP    string              `bson:"voter_ip" json:"-"`
	SessionID  string              `bson:"session_id,omitempty" json:"-"`
	CreatedAt  time.Time           `bson:"created_at" json:"created_at"`
}
