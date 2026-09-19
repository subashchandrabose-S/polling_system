# ⚡ VoteHub — Real-Time Polling & Analytics Engine

VoteHub is a production-ready, full-stack, real-time polling platform. Built with **Go**, **Redis Pub/Sub**, **MongoDB**, and **React**, it enables creators to generate polls, share direct links or QR codes, and monitor incoming votes live with sub-100ms latency.

---

## 🌟 Key Features

- ⚡ **Real-Time Sync**: Instant WebSocket broadcasting powered by Redis Pub/Sub streams vote counts live to all connected clients.
- 📊 **Live Analytics Control Room (`/analytics`)**: Interactive analytics dashboard featuring poll selection sidebars, live activity feeds, animated percentage breakdown bars, and real-time WebSocket connection waveforms.
- 🌐 **Public Poll Gallery (`/polls`)**: Browse live polls created by the community, filter by active/closed status, search by keywords, and vote directly.
- 🔑 **Instant Poll Code Join**: Type or paste any 8-character poll code (e.g. `sG5NqoU9`) on the landing, explore, or voting page to enter the voting booth instantly.
- 📱 **QR Access & 1-Click Sharing**: Auto-generated QR codes for mobile scanning, 1-click link copying, and instant WhatsApp & Twitter/X share links.
- 🛡️ **Smart Vote Deduplication**: Multi-layer deduplication using SHA-256 fingerprinting (UserID + IP + UserAgent), Redis `SETNX` keys (24-hour TTL), and browser session storage.
- 🔑 **Flexible Authentication**: JWT email/password auth plus **Google OAuth** and **GitHub OAuth 2.0** Single Sign-On.
- 🌗 **Dynamic Light & Dark Theme**: Sleek glassmorphism UI supporting both dark mode and high-contrast light mode with CSS variable design tokens.
- ⏳ **Poll Expiry Management**: Set custom expiration timestamps for automatic poll conclusion and validation.

---

## 🏗️ Architecture & Flow

```text
               +----------------------------------+
               |     Frontend (React 19 + Vite)   |
               +----------------+-----------------+
                                |
                   HTTP REST    |    WebSockets
                   (Axios/Fetch)|    (ws://...)
                                v
               +----------------+-----------------+
               |     Backend (Go / Gin Engine)    |
               +-------+------------------+-------+
                       |                  |
           Database    |                  |  Pub/Sub & Deduplication
           Storage     v                  v
               +-------+--------+   +-----+--------+
               | MongoDB Atlas  |   | Redis Cache  |
               +----------------+   +--------------+
```

1. **Vote Submission**: Voter submits an option via `/api/v1/polls/:shareCode/vote`.
2. **Deduplication Check**: Redis verifies fingerprint with `SetNX("voted:<shareCode>:<fingerprint>", "1")`.
3. **Storage & Counters**: Vote document is saved to MongoDB; option counters are atomically incremented in Redis (`HIncrBy`).
4. **Live Broadcast**: Redis publishes payload to `poll:<shareCode>` channel; Go WebSocket Hub broadcasts payload to all connected clients instantly.

---

## 🛠️ Tech Stack

### Backend
- **Language**: Go 1.22+
- **HTTP Framework**: Gin Web Framework
- **WebSockets**: Gorilla WebSocket
- **Caching & Real-Time**: Go-Redis v9 (Pub/Sub & HASH counters)
- **Database**: MongoDB Go Driver (bson/primitive)
- **Authentication**: JWT (golang-jwt/jwt v5), Bcrypt, OAuth2 (Google & GitHub)

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Vanilla CSS Variables, Tailwind CSS v4
- **Animations**: Framer Motion, Canvas Confetti
- **Icons**: Lucide React Icons
- **QR Code**: QRCodeSVG (`qrcode.react`)

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: v20+
- **Go**: 1.22+
- **Docker & Docker Compose** (Optional for local Redis & Mongo)

---

### 1. Clone & Setup Infrastructure

```bash
git clone https://github.com/your-username/pooling_system.git
cd pooling_system
```

If using Docker for local MongoDB and Redis:
```bash
docker-compose up -d
```

---

### 2. Configure Environment Variables

#### Backend Configuration (`backend/.env`)
Create `backend/.env`:
```env
PORT=8080
ENV=development
MONGO_URI=mongodb://localhost:27017
MONGO_DB=polling_system
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET=super-secret-jwt-key-32-chars-min
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Optional OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

#### Frontend Configuration (`frontend/.env`)
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8080
VITE_PUBLIC_URL=http://localhost:5173
```

---

### 3. Run Backend

```bash
cd backend
go mod tidy
go run ./cmd/server
```
Backend API will listen on **`http://localhost:8080`**.

---

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend app will run on **`http://localhost:5173`**.

---

## 📡 API Reference

### 🔓 Public Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/ping` | `GET` | Health check & uptime |
| `/api/v1/polls` | `GET` | List recent public polls |
| `/api/v1/polls/:shareCode` | `GET` | Fetch details & options for a poll |
| `/api/v1/polls/:shareCode/vote` | `POST` | Cast a vote (optional auth, session-deduplicated) |
| `/ws/poll/:shareCode` | `GET` | WebSocket connection for real-time live tally updates |

### 🔐 Authentication Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/signup` | `POST` | Register a new user account |
| `/api/v1/auth/login` | `POST` | Login with email & password |
| `/api/v1/auth/oauth/google` | `GET` | Initiate Google OAuth Single Sign-On |
| `/api/v1/auth/oauth/github` | `GET` | Initiate GitHub OAuth Single Sign-On |

### 🛡️ Protected Creator Endpoints (JWT Required)

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/polls` | `POST` | Create a new poll with options & optional expiry |
| `/api/v1/polls/me` | `GET` | Retrieve polls created by authenticated user |
| `/api/v1/polls/:shareCode/close` | `PUT` | Manually close voting on a poll |

---

## 📂 Project Structure

```text
pooling_system/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go           # Server entry point & route definitions
│   ├── internal/
│   │   ├── config/               # Environment & app config loader
│   │   ├── database/             # MongoDB & Redis client initializers
│   │   ├── handlers/             # Auth, Poll, Vote, OAuth & WS handlers
│   │   ├── hub/                  # WebSocket connection manager hub
│   │   ├── middleware/           # Auth & CORS middleware
│   │   ├── models/               # MongoDB BSON & JSON data structures
│   │   └── utils/                # Password hashing & JWT helpers
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                  # Typed fetch API client
│   │   ├── components/           # Navbar, Sidebar, Toast, AnimatedCounter
│   │   ├── context/              # Auth & Theme context providers
│   │   ├── hooks/                # useAuth, useLivePoll, useTheme
│   │   ├── pages/                # Landing, Dashboard, Poll, Analytics, Explore
│   │   ├── utils/                # confetti, pollUrl helpers
│   │   ├── App.tsx               # Route declarations & Framer Motion transitions
│   │   └── index.css             # CSS Variables & theme tokens
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).