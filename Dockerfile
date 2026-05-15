# syntax=docker/dockerfile:1

# Next.js production image (standalone output). For Coolify: set Build Pack to
# "Dockerfile" or use docker-compose with this image as `web`.

FROM node:20.18.1-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Corepack on Node 20.18.x lacks pnpm's current signing keys; install pnpm directly.
RUN npm install -g pnpm@9.15.5

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Inlined into the client bundle at build time; set in Coolify build args if needed.
ARG NEXT_PUBLIC_APP_URL=https://localhost:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
# Placeholders for `next build` only (route data collection imports auth). Runtime env
# comes from Coolify — do not rely on these values in production.
ARG BETTER_AUTH_SECRET=build-time-placeholder-min-32-chars-long
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL}
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
# openssl rand -base64 32 (valid 32-byte key for build phase only)
ENV STORAGE_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
