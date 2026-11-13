# =============================================================
# SyncSpend Pro • Server Dockerfile
# (For building directly from inside server/ directory)
# =============================================================

FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . ./

RUN mkdir -p /app/data/uploads/receipts && \
    chown -R node:node /app

USER node

EXPOSE 3000

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "server.js"]
