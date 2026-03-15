# Backend API (Modular Monolith) - NestJS
FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /app

# Install dependencies (include devDependencies for nest build)
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn install

COPY . .
RUN yarn build && \
  (test -f /app/dist/main.js || test -f /app/dist/src/main.js) || \
  (echo "Build failed: dist/main.js or dist/src/main.js not found" && ls -la /app/dist 2>/dev/null; exit 1)

# Production stage
FROM base AS runner
WORKDIR /app

# NODE_ENV is set at runtime from .env (e.g. via docker-compose env_file) so it can be development or production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

# Copy built output (NestJS may output dist/main.js or dist/src/main.js depending on tsconfig)
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Create uploads directory
RUN mkdir -p uploads public && chown -R nestjs:nodejs uploads public

USER nestjs

EXPOSE 4500

# Entry: dist/main.js (tsconfig rootDir: ./src, outDir: ./dist)
CMD ["node", "dist/main.js"]
