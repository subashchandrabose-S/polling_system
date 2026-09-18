# PollStream — Real-Time Polling System

A full-stack, real-time polling application where creators can generate polls, share links (or QR codes), and watch votes come in live. Built with a focus on high performance, modern UI, and immediate feedback.

## 🚀 Features

- **Real-Time Updates**: WebSocket integration pushes new votes to all clients instantly.
- **Vote Deduplication**: Redis `SETNX` fingerprinting (SHA-256 of UserID+IP+UserAgent) prevents double voting without hitting the database.
- **Modern UI**: Dark-themed, glassmorphism UI with Framer Motion animations for option bars and transitions.
- **Dashboard**: Creators can track all their polls, see live total votes, and close polls when finished.
- **Mobile First**: Fully responsive design with an integrated QR code generator for easy sharing.
- **Secure Auth**: JWT-based authentication for poll creators.

## 🏗️ Architecture

```
[ Frontend (React/Vite) ] <--- WebSockets ---> [ Backend (Go/Gin) ]
           |                                          |
           | REST API                                 |
           v                                          |
     [ Vercel CDN ]                            +------+------+
                                               |             |
                                      [ Redis ] (Pub/Sub)  [ MongoDB ] (Storage)
```

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, React Router DOM, Lucide Icons.
- **Backend**: Go (1.22), Gin Web Framework, Gorilla WebSocket, Go-Redis, Mongo-Driver, JWT, Bcrypt.
- **Database**: MongoDB (Atlas) for persistent storage of users, polls, and vote records.
- **Cache/Realtime**: Redis for rate-limiting, vote deduplication, fast counters, and Pub/Sub broadcasting to WebSocket hubs.

## 🛠️ Local Development Setup

### Prerequisites
- Go 1.22+
- Node.js 20+
- Docker & Docker Compose (for local Redis/Mongo)

### 1. Start Infrastructure (Redis & MongoDB)
```bash
docker-compose up -d
```

### 2. Run the Backend
```bash
cd backend
# Create a .env file based on .env.example
# The default local setup works out of the box with the docker-compose services
go mod tidy
go run ./cmd/server
```
*Backend runs on http://localhost:8080*

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on http://localhost:5173* (Vite proxies `/api` and `/ws` to the backend)

## 🚢 Deployment Guide

### Backend (Railway / Fly.io / Render)
1. Provide the `backend` folder to your PaaS.
2. The included `Dockerfile` builds a lightweight alpine image.
3. Set Environment Variables:
   - `PORT`: (Auto-provided by most PaaS)
   - `ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `MONGO_DB`: `polling_system`
   - `REDIS_ADDR`: Your managed Redis URL
   - `REDIS_PASSWORD`: (if applicable)
   - `JWT_SECRET`: A strong, secure 32+ character random string
   - `CORS_ALLOWED_ORIGINS`: Your frontend URL (e.g., `https://pollstream.vercel.app`)

### Frontend (Vercel / Netlify)
1. Deploy the `frontend` directory.
2. Framework Preset: Vite
3. Include the `vercel.json` for proper SPA routing.
4. Set Environment Variables:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://polling-backend.up.railway.app`). Do not include trailing slashes.

## 📡 API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/signup` | POST | Public | Create an account |
| `/api/v1/auth/login` | POST | Public | Get JWT token |
| `/api/v1/polls` | POST | Required | Create a new poll |
| `/api/v1/polls/me` | GET | Required | List user's polls |
| `/api/v1/polls/:shareCode` | GET | Public | View poll data |
| `/api/v1/polls/:shareCode/vote` | POST | Optional | Submit a vote |
| `/api/v1/polls/:shareCode/close`| PUT | Owner | Close a poll |
| `/ws/poll/:shareCode` | GET | Public | WebSocket for live updates |


but i seeing the fail to crfeating polling so correct and then giving the link and qr to the attend that polling then that i set expiry date is not working...then i need more animatic responce in the any screen viewing