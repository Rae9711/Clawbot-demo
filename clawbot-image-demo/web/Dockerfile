FROM node:22-bookworm AS builder

WORKDIR /app

# Copy package files first
COPY web/package*.json ./
RUN npm ci

# Copy source and build
COPY web/ ./
ARG VITE_WS_URL=ws://localhost:8080
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build

FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
