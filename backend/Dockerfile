# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage - Switch to Ubuntu for better Ollama compatibility
FROM node:20-slim AS production

# Install dependencies for Ollama and NestJS
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    procps \
    net-tools \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security (Ubuntu syntax)
RUN groupadd -g 1001 nodejs
RUN useradd -u 1001 -g nodejs -s /bin/bash -m nestjs

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy startup script
COPY --chown=nestjs:nodejs start.sh ./
RUN chmod +x start.sh

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads
RUN mkdir -p /app/logs && chown nestjs:nodejs /app/logs
RUN mkdir -p /app/.ollama && chown nestjs:nodejs /app/.ollama

# Switch to non-root user
USER nestjs

# Expose the port your app runs on
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application with Ollama
CMD ["./start.sh"]