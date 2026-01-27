# Use Node.js 24 LTS version
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Add adapter-node for Docker builds
RUN npm install @sveltejs/adapter-node

# Build args for version info (defaults for local builds)
ARG PUBLIC_APP_VERSION=UNKNOWN
ARG PUBLIC_APP_BUILD_SHA_SHORT=UNKNOWN
ARG PUBLIC_APP_BUILD_SHA_LONG=UNKNOWN
ARG PUBLIC_APP_BUILD_DATE=UNKNOWN

# Copy source code
COPY . .

# Copy svelte config and modify it to use adapter-node
RUN cp svelte.config.js svelte.config.js.bak

# Create a new svelte.config.js that uses adapter-node
RUN cat > svelte.config.js << 'EOF'
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter()
	}
};

export default config;
EOF

# Set environment variables for SvelteKit build
ENV PUBLIC_APP_VERSION=$PUBLIC_APP_VERSION
ENV PUBLIC_APP_BUILD_SHA_SHORT=$PUBLIC_APP_BUILD_SHA_SHORT
ENV PUBLIC_APP_BUILD_SHA_LONG=$PUBLIC_APP_BUILD_SHA_LONG
ENV PUBLIC_APP_BUILD_DATE=$PUBLIC_APP_BUILD_DATE

# Build the application
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Copy the entire build output - checking multiple possible locations
COPY --from=builder --chown=sveltekit:nodejs /app/build ./
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./
COPY --from=builder --chown=sveltekit:nodejs /app/package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Switch to non-root user
USER sveltekit

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]