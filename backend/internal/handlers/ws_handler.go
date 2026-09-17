package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/pooling_system/backend/internal/hub"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins; adjust for production
		return true
	},
}

// WSHandler manages WebSocket connections for live poll updates
type WSHandler struct {
	rdb *redis.Client
	hub *hub.Hub
}

// NewWSHandler creates a new WSHandler
func NewWSHandler(rdb *redis.Client, h *hub.Hub) *WSHandler {
	return &WSHandler{rdb: rdb, hub: h}
}

// ServeWS handles GET /ws/poll/:shareCode
// It upgrades the connection to WebSocket and subscribes to Redis pub/sub
// for the given poll, streaming updates to the client in real time.
func (h *WSHandler) ServeWS(c *gin.Context) {
	shareCode := c.Param("shareCode")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error for poll %s: %v", shareCode, err)
		return
	}

	client := &hub.Client{
		ShareCode: shareCode,
		Conn:      conn,
		Send:      make(chan []byte, 64),
	}

	h.hub.Register(client)
	defer h.hub.Unregister(client)

	// Start writing goroutine — pumps messages from Send channel to WebSocket
	go h.writePump(client)

	// Subscribe to Redis pub/sub for this poll in a separate goroutine
	// so we can also forward messages when the vote handler publishes
	go h.redisPump(client)

	// Read pump — keeps connection alive and detects client disconnect
	h.readPump(client)
}

// readPump drains incoming WebSocket messages (ping/pong/close) and blocks
// until the client disconnects. Closing is handled by Unregister.
func (h *WSHandler) readPump(client *hub.Client) {
	defer client.Conn.Close()
	client.Conn.SetReadLimit(512)
	client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Unexpected close for poll %s: %v", client.ShareCode, err)
			}
			break
		}
	}
}

// writePump sends messages from the Send channel to the WebSocket connection
// and sends periodic pings to keep the connection alive.
func (h *WSHandler) writePump(client *hub.Client) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub closed the channel
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("[WS] Write error for poll %s: %v", client.ShareCode, err)
				return
			}

		case <-ticker.C:
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// redisPump subscribes to the Redis channel for this poll and forwards every
// published message into the client's Send channel (and thus to all hub clients
// via Broadcast). This is the Redis → WebSocket bridge.
func (h *WSHandler) redisPump(client *hub.Client) {
	if h.rdb == nil {
		return
	}

	ctx := context.Background()
	channel := "poll:" + client.ShareCode
	pubsub := h.rdb.Subscribe(ctx, channel)
	defer pubsub.Close()

	log.Printf("[WS] Redis subscriber started for channel %s", channel)

	for msg := range pubsub.Channel() {
		// Broadcast the Redis message to all hub clients for this poll
		h.hub.Broadcast(client.ShareCode, []byte(msg.Payload))
	}

	log.Printf("[WS] Redis subscriber ended for channel %s", channel)
}
