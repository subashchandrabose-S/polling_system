package handlers

import (
	"testing"
	"time"
	"unicode"

	"github.com/pooling_system/backend/internal/models"
)

func TestGenerateShareCode(t *testing.T) {
	for range 100 {
		code := generateShareCode()
		if len(code) != 8 {
			t.Fatalf("generateShareCode() length = %d, want 8", len(code))
		}
		for _, char := range code {
			if !unicode.IsLetter(char) && !unicode.IsDigit(char) {
				t.Fatalf("generateShareCode() produced non-alphanumeric character %q", char)
			}
		}
	}
}

func TestIsExpiredPoll(t *testing.T) {
	now := time.Date(2026, 9, 19, 12, 0, 0, 0, time.UTC)
	expiredAt := now.Add(-time.Minute)
	poll := &models.Poll{ExpiresAt: &expiredAt, IsActive: true}
	if !isExpiredPoll(poll, now) {
		t.Fatal("expected expired active poll to be detected")
	}

	futureAt := now.Add(time.Hour)
	poll.ExpiresAt = &futureAt
	if isExpiredPoll(poll, now) {
		t.Fatal("expected future poll to remain active")
	}

	poll.IsActive = false
	if isExpiredPoll(poll, now.Add(time.Hour*2)) {
		t.Fatal("expected inactive poll to remain inactive without expiry transition")
	}
}
