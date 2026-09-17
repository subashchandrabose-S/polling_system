FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /polling-server ./cmd/server

# Final lightweight image
FROM alpine:3.19

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /polling-server .

# Expose port (will be overridden by Railway's PORT env var)
EXPOSE 8080

# Run the binary
CMD ["./polling-server"]
