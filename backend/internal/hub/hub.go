package hub

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Client represents a single WebSocket connection subscribed to a poll
type Client struct {
	ShareCode string
	Conn      *websocket.Conn
	Send      chan []byte
}

// Hub manages all active WebSocket clients grouped by poll shareCode
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]struct{}
}

// New creates and returns a new Hub instance
func New() *Hub {
	return &Hub{
		clients: make(map[string]map[*Client]struct{}),
	}
}

// Register adds a client to the hub under the given shareCode
func (h *Hub) Register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client.ShareCode]; !ok {
		h.clients[client.ShareCode] = make(map[*Client]struct{})
	}
	h.clients[client.ShareCode][client] = struct{}{}
	log.Printf("[Hub] Client registered for poll %s (total: %d)", client.ShareCode, len(h.clients[client.ShareCode]))
}

// Unregister removes a client from the hub and closes its send channel
func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if group, ok := h.clients[client.ShareCode]; ok {
		if _, exists := group[client]; exists {
			delete(group, client)
			close(client.Send)
			if len(group) == 0 {
				delete(h.clients, client.ShareCode)
			}
			log.Printf("[Hub] Client unregistered from poll %s", client.ShareCode)
		}
	}
}

// Broadcast sends a message to all connected clients for a given poll shareCode
func (h *Hub) Broadcast(shareCode string, message []byte) {
	h.mu.RLock()
	group, ok := h.clients[shareCode]
	if !ok {
		h.mu.RUnlock()
		return
	}
	// Copy client set to avoid holding lock during send
	targets := make([]*Client, 0, len(group))
	for client := range group {
		targets = append(targets, client)
	}
	h.mu.RUnlock()

	for _, client := range targets {
		select {
		case client.Send <- message:
		default:
			// Client is too slow — unregister it
			h.Unregister(client)
		}
	}
}
