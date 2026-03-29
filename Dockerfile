FROM node:22-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copy only the files needed for install (exclude mobile app)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/

# Install dependencies (only for shared + api)
RUN pnpm install --frozen-lockfile --filter @grocery/shared --filter @grocery/api

# Copy source code (only shared + api)
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/

# Build
RUN pnpm --filter @grocery/shared build && pnpm --filter @grocery/api build

# Production image
FROM node:22-slim
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=builder /app/packages/api/dist packages/api/dist
COPY --from=builder /app/packages/api/package.json packages/api/
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/packages/api/node_modules packages/api/node_modules
COPY --from=builder /app/packages/shared/node_modules packages/shared/node_modules

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "packages/api/dist/server.js"]
