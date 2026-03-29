FROM node:22-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/
RUN pnpm --filter @grocery/shared build && pnpm --filter @grocery/api build

FROM node:22-slim
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "packages/api/dist/server.js"]
