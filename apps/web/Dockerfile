# Build context is the repo root (this is a pnpm workspace monorepo — the web
# app transpiles its @ai-agent/* workspace packages directly from source via
# next.config.ts's transpilePackages, so there's no separate per-package build).
FROM node:20-slim AS build
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ai-agent/web build

FROM node:20-slim AS runner
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/apps/web
ENV NODE_ENV=production
EXPOSE 3000
# Applies any pending migrations before the app starts (also ensures the
# pgvector extension exists), then binds to Railway's injected $PORT (next
# start doesn't read it automatically).
CMD ["sh", "-c", "cd /app/packages/storage && pnpm db:migrate && cd /app/apps/web && npx next start -p ${PORT:-3000}"]
