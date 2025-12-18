# Multi-stage Docker build for Tolgee CLI
# Stage 1: Build stage with dev dependencies
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for building)
RUN npm ci && npm cache clean --force

# Copy source files
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tsconfig*.json ./

# Copy additional files needed for build
COPY textmate/ ./textmate/
COPY extractor.d.ts ./
COPY schema.json ./

# Build the CLI
RUN npm run build

# Stage 2: Production stage with only runtime dependencies
FROM node:24-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application files from builder stage
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/textmate/ ./textmate/
COPY --from=builder /app/extractor.d.ts ./
COPY --from=builder /app/schema.json ./

# Copy documentation files
COPY README.md ./
COPY LICENSE ./

# Make the CLI binary executable
RUN chmod +x ./dist/cli.js

# Create a non-root user for security
RUN addgroup -g 1001 -S tolgee && \
    adduser -S tolgee -u 1001

# Switch to non-root user
USER tolgee

# Set the entrypoint to the CLI binary
ENTRYPOINT ["node", "./dist/cli.js"]

# Default command shows help
CMD ["--help"]
