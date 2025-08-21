# Multi-stage build for optimal image size
FROM golang:1.23.4-alpine AS builder

# Set working directory
WORKDIR /app

# Install necessary tools
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o aggregator .

# Final stage - minimal image
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN adduser -D -s /bin/sh aggregator

# Set working directory
WORKDIR /home/aggregator

# Copy the binary from builder stage
COPY --from=builder /app/aggregator .

# Copy any additional files needed
COPY --from=builder /app/docs ./docs

# Change ownership
RUN chown -R aggregator:aggregator /home/aggregator

# Switch to non-root user
USER aggregator

# Expose port (if needed for future web interface)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ./aggregator --health-check || exit 1

# Run the application
ENTRYPOINT ["./aggregator"]

# Default command
CMD ["--help"]