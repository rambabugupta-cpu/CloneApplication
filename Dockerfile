# Stage 1: Builder
# This stage installs dependencies and builds the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all package and config files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY components.json ./
COPY eslint.config.js ./

# Copy the rest of the source code BEFORE running npm ci
# This ensures all files are present for any potential post-install scripts
COPY . .

# Install all dependencies needed for the build
# Using --ignore-scripts to prevent husky from running
RUN npm ci --ignore-scripts

# Run the build script defined in package.json
# This will build both client and server and place them in /dist
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production
# This stage creates the final, small, and secure image
FROM node:20-alpine AS production
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and pre-installed node_modules from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the built application from the builder stage
# This includes the server bundle and the client static assets
COPY --from=builder /app/dist ./dist

# Create a non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port the app runs on
EXPOSE 5000

# Healthcheck to ensure the service is running correctly
# The health check will target a simple health endpoint on the server
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Command to start the production server
CMD ["node", "dist/index.js"]

