# syntax=docker/dockerfile:1

# Needs `output: "standalone"` in next.config (see README notes in the reply).
# Debian (glibc) rather than Alpine: libsql / better-sqlite3 ship glibc binaries.

# ---------------------------------------------------------------- base
FROM node:22-bookworm-slim AS base
# Node runs `next build`; bun is only the package manager.
# Copied from the official image rather than `npm install -g bun`, which pulls a
# platform binary through npm and fails on hosts with restricted/odd networking.
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

# ---------------------------------------------------------------- deps
FROM base AS deps
# Only needed if a dependency has to compile a native module.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock* bun.lockb* package-lock.json* ./
# Normal path: bun. If the build host's CPU can't run bun (no AVX2, e.g. a Proxmox VM
# using the default CPU type), commit a package-lock.json and npm is used instead.
RUN if [ -f package-lock.json ]; then npm ci; else bun install --frozen-lockfile; fi

# ---------------------------------------------------------------- builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# libsql's native binary is an optional dependency picked by CPU/OS. Fail here, with a
# clear message, if it wasn't installed for this architecture.
RUN ls node_modules/@libsql | grep -q -- '-gnu' \
 || (echo 'No @libsql native package installed for this platform' && exit 1)

# NEXT_PUBLIC_* values are baked into the client bundle at build time, so they
# must be present here and not only at runtime.
ARG NEXT_PUBLIC_ADSENSE_CLIENT=""
ARG NEXT_PUBLIC_ADSENSE_SLOT=""
ENV NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADSENSE_SLOT=$NEXT_PUBLIC_ADSENSE_SLOT \
    NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=1

# `next build` imports route modules to collect page data, and some of them
# (the database client, Better Auth) read env vars as soon as they load.
# These throwaway values only exist in the builder stage. The runner stage does
# not inherit them, and docker-compose supplies the real ones at runtime.
ENV DATABASE_URL=file:/tmp/build.sqlite \
    BETTER_AUTH_SECRET=build-time-placeholder-not-a-real-secret \
    BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_GITHUB_CLIENT_ID=build-placeholder \
    BETTER_AUTH_GITHUB_CLIENT_SECRET=build-placeholder

# Lint in CI (`bun run lint`), not here: a lint error shouldn't block an image build.
# Type checking still runs. Needs Next 15; on Next 16 use eslint.ignoreDuringBuilds instead.
RUN node_modules/.bin/next build --no-lint

# ---------------------------------------------------------------- migrate
# One-shot image that applies database migrations. Not used at runtime.
FROM builder AS migrate
ENV NODE_ENV=development \
    HOME=/tmp
RUN mkdir -p /data && chown 1001:1001 /data
USER 1001:1001
CMD ["node_modules/.bin/drizzle-kit", "migrate"]

# ---------------------------------------------------------------- runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home nextjs \
 && mkdir -p /data \
 && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# libsql loads its native binary through a dynamic require() that Next's file
# tracing can't see, so the standalone output misses it. Copy the packages in.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/libsql ./node_modules/libsql

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]