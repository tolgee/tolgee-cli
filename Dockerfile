# Use Node.js 18 Alpine for smaller image size
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for better Docker layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies needed by the built code)
RUN npm ci && npm cache clean --force

# Copy built application files (as specified in package.json "files" section)
COPY dist/ ./dist/
COPY textmate/ ./textmate/
COPY extractor.d.ts ./
COPY schema.json ./
COPY README.md ./
COPY LICENSE ./

# Copy node_modules for runtime dependencies
COPY node_modules/ ./node_modules/

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
