# Build context is the repo root — same reasoning as apps/web/Dockerfile.
# The worker runs its TypeScript source directly via tsx, so there's no
# separate build step; the "build" stage here only exists to keep the final
# image from also carrying pnpm's store/cache.
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/worker
ENV NODE_ENV=production
CMD ["pnpm", "start"]
