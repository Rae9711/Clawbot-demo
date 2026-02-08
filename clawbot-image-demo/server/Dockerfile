FROM node:22-bookworm

WORKDIR /app

# Copy package files first (for better layer caching)
COPY server/package*.json ./
RUN npm ci --only=production

# Build frontend first (for backend to serve)
FROM node:22-bookworm AS frontend-builder
WORKDIR /frontend
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
# VITE_WS_URL will be auto-detected at runtime from current hostname
# Pass a default for build, but it will be overridden by auto-detection
ARG VITE_WS_URL=ws://localhost:8080
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build

# Back to backend
FROM node:22-bookworm
WORKDIR /app

# Copy package files
COPY server/package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY server/ ./
RUN npm run build

# Copy frontend dist (for serving in production)
COPY --from=frontend-builder /frontend/dist ./web-dist

# Allow non-root user to read web-dist
RUN chown -R node:node /app/web-dist

# Allow non-root user to write temp files
RUN chown -R node:node /app

# Security: Run as non-root user
USER node

# Expose port (Railway/Render will set PORT env var)
EXPOSE 8080

CMD ["node", "dist/index.js"]
