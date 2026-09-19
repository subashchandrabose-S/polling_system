package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pooling_system/backend/internal/config"
	"github.com/pooling_system/backend/internal/models"
	"github.com/pooling_system/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// OAuthHandler handles Google and GitHub OAuth flows
type OAuthHandler struct {
	cfg       *config.Config
	usersColl *mongo.Collection
}

// NewOAuthHandler creates a new OAuthHandler
func NewOAuthHandler(cfg *config.Config, db *mongo.Database) *OAuthHandler {
	return &OAuthHandler{
		cfg:       cfg,
		usersColl: db.Collection("users"),
	}
}

// ── State helpers ──────────────────────────────────────────────────────────────

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

// GoogleLogin redirects the user to Google's OAuth consent screen
// GET /api/v1/auth/oauth/google
func (h *OAuthHandler) GoogleLogin(c *gin.Context) {
	if h.cfg.GoogleClientID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google OAuth is not configured"})
		return
	}

	state := generateState()
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)

	redirectURI := h.cfg.FrontendURL + "/auth/callback/google"
	params := url.Values{
		"client_id":     {h.cfg.GoogleClientID},
		"redirect_uri":  {redirectURI},
		"response_type": {"code"},
		"scope":         {"openid email profile"},
		"state":         {state},
		"access_type":   {"offline"},
		"prompt":        {"select_account"},
	}
	c.Redirect(http.StatusTemporaryRedirect, "https://accounts.google.com/o/oauth2/v2/auth?"+params.Encode())
}

// GoogleCallback handles the OAuth code from Google and issues a JWT
// GET /api/v1/auth/oauth/google/callback
func (h *OAuthHandler) GoogleCallback(c *gin.Context) {
	// Verify state
	storedState, _ := c.Cookie("oauth_state")
	if storedState == "" || storedState != c.Query("state") {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=invalid_state")
		return
	}
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=no_code")
		return
	}

	// Exchange code for token
	redirectURI := h.cfg.FrontendURL + "/auth/callback/google"
	tokenData, err := exchangeGoogleCode(h.cfg.GoogleClientID, h.cfg.GoogleClientSecret, code, redirectURI)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=token_exchange_failed")
		return
	}

	// Fetch user profile from Google
	profile, err := fetchGoogleProfile(tokenData["access_token"])
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=profile_fetch_failed")
		return
	}

	user, err := h.upsertOAuthUser(profile["sub"], "google", profile["email"], profile["name"], profile["picture"])
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=db_error")
		return
	}

	jwt, _ := utils.GenerateToken(user.ID.Hex(), user.Email, user.Username, h.cfg.JWTSecret, h.cfg.JWTExpireHours)
	c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("%s/auth/callback?token=%s", h.cfg.FrontendURL, jwt))
}

func exchangeGoogleCode(clientID, clientSecret, code, redirectURI string) (map[string]string, error) {
	resp, err := http.PostForm("https://oauth2.googleapis.com/token", url.Values{
		"code":          {code},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]string
	body, _ := io.ReadAll(resp.Body)
	// Google returns numbers for some fields, use interface map
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	result = make(map[string]string)
	for k, v := range raw {
		result[k] = fmt.Sprintf("%v", v)
	}
	return result, nil
}

func fetchGoogleProfile(accessToken string) (map[string]string, error) {
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result map[string]string
	body, _ := io.ReadAll(resp.Body)
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	result = make(map[string]string)
	for k, v := range raw {
		result[k] = fmt.Sprintf("%v", v)
	}
	return result, nil
}

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

// GithubLogin redirects to GitHub's OAuth consent screen
// GET /api/v1/auth/oauth/github
func (h *OAuthHandler) GithubLogin(c *gin.Context) {
	if h.cfg.GithubClientID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "GitHub OAuth is not configured"})
		return
	}

	state := generateState()
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)

	params := url.Values{
		"client_id": {h.cfg.GithubClientID},
		"scope":     {"user:email"},
		"state":     {state},
	}
	c.Redirect(http.StatusTemporaryRedirect, "https://github.com/login/oauth/authorize?"+params.Encode())
}

// GithubCallback handles the OAuth code from GitHub and issues a JWT
// GET /api/v1/auth/oauth/github/callback
func (h *OAuthHandler) GithubCallback(c *gin.Context) {
	storedState, _ := c.Cookie("oauth_state")
	if storedState == "" || storedState != c.Query("state") {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=invalid_state")
		return
	}
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=no_code")
		return
	}

	// Exchange code for access token
	accessToken, err := exchangeGithubCode(h.cfg.GithubClientID, h.cfg.GithubClientSecret, code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=token_exchange_failed")
		return
	}

	// Fetch user profile
	profile, err := fetchGithubProfile(accessToken)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=profile_fetch_failed")
		return
	}

	// Fetch primary verified email if not in profile
	email := profile["email"]
	if email == "" || email == "<nil>" {
		email, _ = fetchGithubPrimaryEmail(accessToken)
	}
	if email == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=no_email")
		return
	}

	user, err := h.upsertOAuthUser(profile["id"], "github", email, profile["login"], profile["avatar_url"])
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.cfg.FrontendURL+"/login?error=db_error")
		return
	}

	jwt, _ := utils.GenerateToken(user.ID.Hex(), user.Email, user.Username, h.cfg.JWTSecret, h.cfg.JWTExpireHours)
	c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("%s/auth/callback?token=%s", h.cfg.FrontendURL, jwt))
}

func exchangeGithubCode(clientID, clientSecret, code string) (string, error) {
	body := url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
	}
	req, _ := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(body.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	token, ok := result["access_token"].(string)
	if !ok {
		return "", fmt.Errorf("no access_token in response")
	}
	return token, nil
}

func fetchGithubProfile(accessToken string) (map[string]string, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}
	result := make(map[string]string)
	for k, v := range raw {
		result[k] = fmt.Sprintf("%v", v)
	}
	return result, nil
}

func fetchGithubPrimaryEmail(accessToken string) (string, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var emails []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", err
	}
	for _, e := range emails {
		if prim, _ := e["primary"].(bool); prim {
			if verified, _ := e["verified"].(bool); verified {
				if email, ok := e["email"].(string); ok {
					return email, nil
				}
			}
		}
	}
	return "", fmt.Errorf("no primary verified email found")
}

// ── Shared DB helper ──────────────────────────────────────────────────────────

func (h *OAuthHandler) upsertOAuthUser(oauthID, provider, email, name, avatarURL string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	email = strings.ToLower(strings.TrimSpace(email))
	username := sanitizeUsername(name)

	// Try to find by oauth_id + provider
	var user models.User
	err := h.usersColl.FindOne(ctx, bson.M{
		"oauth_id":       oauthID,
		"oauth_provider": provider,
	}).Decode(&user)

	if err == nil {
		// Update avatar/username if changed
		_, _ = h.usersColl.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{
			"avatar_url": avatarURL,
			"updated_at": time.Now().UTC(),
		}})
		return &user, nil
	}

	// Try to find by email (link existing account)
	err = h.usersColl.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == nil {
		// Link OAuth to existing account
		_, _ = h.usersColl.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{
			"oauth_id":       oauthID,
			"oauth_provider": provider,
			"avatar_url":     avatarURL,
			"updated_at":     time.Now().UTC(),
		}})
		return &user, nil
	}

	// Create new user
	now := time.Now().UTC()
	newUser := models.User{
		ID:            primitive.NewObjectID(),
		Username:      username,
		Email:         email,
		OAuthProvider: provider,
		OAuthID:       oauthID,
		AvatarURL:     avatarURL,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := h.usersColl.InsertOne(ctx, newUser); err != nil {
		return nil, err
	}
	return &newUser, nil
}

// sanitizeUsername creates a valid username from OAuth display name
func sanitizeUsername(name string) string {
	name = strings.TrimSpace(name)
	// Replace spaces with underscores, keep alphanumeric + underscore
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			result.WriteRune(r)
		} else if r == ' ' || r == '-' {
			result.WriteRune('_')
		}
	}
	s := result.String()
	if len(s) < 3 {
		s = s + "_user"
	}
	if len(s) > 32 {
		s = s[:32]
	}
	return s
}
