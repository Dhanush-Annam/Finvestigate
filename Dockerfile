# Stage 1: Build Frontend SPA and Backend API
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig*.json vite.config.ts ./
RUN npm ci

# Copy source code and assets
COPY src/ ./src/
COPY index.html ./
COPY data/ ./data/

# Build client SPA and backend TypeScript
RUN npm run build
RUN npm run build:api

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server-dist
COPY --from=builder /app/data ./data

# Use unprivileged node user
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server-dist/server/api/server.js"]
