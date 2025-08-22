# Use official Bun image
FROM oven/bun:1.1.38-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy application code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R botuser:nodejs /app
USER botuser

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["bun", "src/main.ts"]