# =========================================================
# CityCenter — Production Dockerfile
# =========================================================
# Base image: node:20-slim (Debian-based, includes glibc for sharp)
# Why not alpine: sharp requires glibc-based build tools and libvips.
# Why not node:20 (full): larger image (~900MB vs ~200MB).
# =========================================================

FROM node:20-slim AS base

# Set environment variables for production
ENV NODE_ENV=production \
    PORT=3514 \
    TZ=Asia/Tehran

# Install build dependencies for sharp, plus tini for proper signal handling.
# We install these in the same RUN as the cleanup to keep the layer small.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        libvips-dev \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# =========================================================
# Stage 1: Install dependencies (cached layer)
# =========================================================
# Copy only package files first so that npm ci is cached
# when source code changes but dependencies do not.
COPY package*.json ./

RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# =========================================================
# Stage 2: Copy source code
# =========================================================
COPY . .

# Create required directories and set ownership to the non-root user.
# The `node` user is provided by the base image (UID 1000).
RUN mkdir -p logs public/uploads/originals public/uploads/compressed backups \
    && chown -R node:node /app

# Switch to the non-root user for security.
USER node

# Expose the application port (documentation only — actual port is set by ENV).
EXPOSE 3514

# Use tini as PID 1 to properly forward signals (SIGTERM, SIGINT) to Node.
# This ensures graceful shutdown of the server and cleanup of resources.
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the application.
CMD ["node", "server.js"]
