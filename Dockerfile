# =============================================================
# SyncSpend Pro • Multi-Platform Dockerfile
# Based on Node.js 22 LTS with native SQLite & Wasm OCR
# Compatible with: x86_64 (Intel/AMD), ARM64 (Raspberry Pi, Apple Silicon),
# Home NAS (Synology, QNAP, Unraid, TrueNAS), VPS, and Cloud Containers.
# =============================================================

FROM node:22-bookworm-slim AS base

# Install dumb-init for proper signal handling (PID 1 zombie/signal reaping)
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set default production environment
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

# Copy package manifests and install production dependencies
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY server/ ./

# Create persistent storage directories with proper permissions for the node user
RUN mkdir -p /app/data/uploads/receipts && \
    chown -R node:node /app

# Run as non-root user for security best practices
USER node

# Expose HTTP service port
EXPOSE 3000

# Declare persistent volume mount for database & bill uploads
VOLUME ["/app/data"]

# Native healthcheck using Node 22 built-in fetch (zero external curl/wget dependencies)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Use dumb-init as entrypoint to reap zombie processes and forward SIGTERM/SIGINT cleanly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application server
CMD ["node", "server.js"]
