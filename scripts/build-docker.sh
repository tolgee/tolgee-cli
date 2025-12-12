#!/bin/bash

# Build Docker image for Tolgee CLI
# Usage:
#   ./scripts/build-docker.sh [tag] [platform] [push]
#
# Examples:
#   ./scripts/build-docker.sh                    # Build for current platform with default tag
#   ./scripts/build-docker.sh latest            # Build for current platform with specific tag
#   ./scripts/build-docker.sh latest linux/arm64            # Build for specific single platform (available locally)
#   ./scripts/build-docker.sh latest linux/amd64,linux/arm64  # Multi-platform build (NOT available locally)
#   ./scripts/build-docker.sh latest linux/amd64,linux/arm64 push  # Multi-platform build and push
#
# Environment variables for push:
#   DOCKERHUB_USERNAME - Docker Hub username
#   DOCKERHUB_TOKEN    - Docker Hub token/password
#   VERSION            - Version for additional tagging (optional)
#
# Note: Multi-platform builds are stored in buildx cache and not available locally.
# To run the image locally after a multi-platform build, either:
# 1. Build for your current platform only (e.g., linux/arm64 on Apple Silicon)
# 2. Push the multi-platform image to a registry and pull it

set -e

# Default values
TAG=${1:-"dev"}
PLATFORM=${2:-""}
PUSH=${3:-""}
IMAGE_NAME="tolgee/cli"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Tolgee CLI Docker image...${NC}"
echo "Tag: ${TAG}"
echo "Image: ${IMAGE_NAME}:${TAG}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Docker login if push is requested
if [ "$PUSH" = "push" ]; then
    if [ -z "$DOCKERHUB_USERNAME" ] || [ -z "$DOCKERHUB_TOKEN" ]; then
        echo -e "${RED}Error: DOCKERHUB_USERNAME and DOCKERHUB_TOKEN environment variables are required for push.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Logging in to Docker Hub...${NC}"
    echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
fi

# Ensure we have the built files
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Warning: dist directory not found. Building the CLI first...${NC}"
    npm run build
fi

# Prepare tags
TAGS="-t ${IMAGE_NAME}:${TAG}"
if [ -n "$VERSION" ] && [ "$TAG" = "latest" ]; then
    TAGS="$TAGS -t ${IMAGE_NAME}:${VERSION}"
fi

# Prepare labels
LABELS=""
if [ "$PUSH" = "push" ]; then
    LABELS="--label org.opencontainers.image.title=Tolgee CLI"
    LABELS="$LABELS --label org.opencontainers.image.description=A tool to interact with the Tolgee Platform through CLI"
    LABELS="$LABELS --label org.opencontainers.image.url=https://github.com/tolgee/tolgee-cli"
    LABELS="$LABELS --label org.opencontainers.image.source=https://github.com/tolgee/tolgee-cli"
    LABELS="$LABELS --label org.opencontainers.image.licenses=MIT"
    if [ -n "$VERSION" ]; then
        LABELS="$LABELS --label org.opencontainers.image.version=${VERSION}"
    fi
    if [ -n "$GITHUB_SHA" ]; then
        LABELS="$LABELS --label org.opencontainers.image.revision=${GITHUB_SHA}"
    fi
    if [ -n "$BUILD_DATE" ]; then
        LABELS="$LABELS --label org.opencontainers.image.created=${BUILD_DATE}"
    fi
fi

# Build command
BUILD_CMD="docker build $TAGS $LABELS"

if [ -n "$PLATFORM" ]; then
    echo "Platform(s): ${PLATFORM}"
    # For multi-platform builds, we need buildx
    BUILD_CMD="docker buildx build --platform ${PLATFORM} $TAGS $LABELS"

    # Check if buildx is available
    if ! docker buildx version > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker buildx is required for multi-platform builds.${NC}"
        echo "Please install Docker buildx or build for single platform."
        exit 1
    fi

    # Create builder if it doesn't exist
    if ! docker buildx inspect tolgee-builder > /dev/null 2>&1; then
        echo -e "${YELLOW}Creating multi-platform builder...${NC}"
        docker buildx create --name tolgee-builder --use
    else
        docker buildx use tolgee-builder
    fi

    # Check if this is a single platform build that can be loaded locally
    PLATFORM_COUNT=$(echo "$PLATFORM" | tr ',' '\n' | wc -l)
    if [ "$PLATFORM_COUNT" -eq 1 ] && [ "$PUSH" != "push" ]; then
        # Single platform - we can load it to local Docker daemon
        BUILD_CMD="${BUILD_CMD} --load"
        echo -e "${GREEN}Single platform build - image will be available locally after build.${NC}"
    elif [ "$PUSH" = "push" ]; then
        # Push mode - add push flag
        BUILD_CMD="${BUILD_CMD} --push"
        echo -e "${GREEN}Build and push mode enabled.${NC}"
    else
        # Multi-platform build - cannot load to local Docker daemon
        echo -e "${YELLOW}Multi-platform build - image will NOT be available locally.${NC}"
        echo -e "${YELLOW}To run locally, build for your current platform only or push to a registry.${NC}"
    fi
elif [ "$PUSH" = "push" ]; then
    # Regular build with push - we need to build and then push
    echo -e "${GREEN}Build and push mode enabled for single architecture.${NC}"
fi

BUILD_CMD="${BUILD_CMD} ."

echo -e "${GREEN}Running: ${BUILD_CMD}${NC}"
eval $BUILD_CMD

if [ "$PUSH" = "push" ] && [ -z "$PLATFORM" ]; then
    # For regular builds, we need to push separately
    echo -e "${GREEN}Pushing images to registry...${NC}"
    docker push ${IMAGE_NAME}:${TAG}
    if [ -n "$VERSION" ] && [ "$TAG" = "latest" ]; then
        docker push ${IMAGE_NAME}:${VERSION}
    fi
fi

if [ "$PUSH" = "push" ]; then
    echo -e "${GREEN}✓ Docker image built and pushed successfully!${NC}"
else
    echo -e "${GREEN}✓ Docker image built successfully!${NC}"
fi

# Show appropriate run instruction based on build type
if [ -n "$PLATFORM" ]; then
    PLATFORM_COUNT=$(echo "$PLATFORM" | tr ',' '\n' | wc -l)
    if [ "$PLATFORM_COUNT" -eq 1 ]; then
        # Single platform - image is available locally
        echo -e "${GREEN}Run with: docker run --rm ${IMAGE_NAME}:${TAG}${NC}"
    else
        # Multi-platform - image is NOT available locally
        echo -e "${YELLOW}Multi-platform build completed. Image is not available locally.${NC}"
        echo -e "${YELLOW}To run locally: build for your platform only or pull from registry after push.${NC}"
    fi
else
    # Default build for current platform - always available locally
    echo -e "${GREEN}Run with: docker run --rm ${IMAGE_NAME}:${TAG}${NC}"
fi

# Show image info
echo -e "\n${YELLOW}Image information:${NC}"
if [ -n "$PLATFORM" ]; then
    PLATFORM_COUNT=$(echo "$PLATFORM" | tr ',' '\n' | wc -l)
    if [ "$PLATFORM_COUNT" -eq 1 ]; then
        echo "Single-platform image built and loaded locally."
        docker images ${IMAGE_NAME}:${TAG}
    else
        echo "Multi-platform image built. Use 'docker buildx imagetools inspect ${IMAGE_NAME}:${TAG}' to see details."
        echo "Note: Multi-platform images are not available locally. Build for your current platform to run locally."
    fi
else
    docker images ${IMAGE_NAME}:${TAG}
fi
