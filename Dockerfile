# Backend API (Modular Monolith) - NestJS
FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /app

# Install dependencies (no --immutable so lockfile can be updated if package.json changed)
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn install

COPY . .
RUN yarn build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

# Copy built output
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Create uploads directory
RUN mkdir -p uploads public && chown -R nestjs:nodejs uploads public

USER nestjs

EXPOSE 4500

CMD ["node", "dist/main.js"]
