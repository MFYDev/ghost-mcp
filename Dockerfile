# --- Build stage ---
FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY types/ ./types/
RUN npm ci

COPY src/ ./src/
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine

WORKDIR /app

# Only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Compiled JS
COPY --from=builder /app/build/ ./build/

# Spew version just for diagnostics
RUN echo "ghost-mcp $(node -e "console.log(require('./package.json').version)")" > /app/.version

# Defaults — override at runtime
ENV MCP_TRANSPORT=http
ENV PORT=3210
ENV HOST=0.0.0.0
ENV GHOST_API_VERSION=v5.0

EXPOSE 3210

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3210/health 2>/dev/null || exit 1

CMD ["node", "build/server.js"]