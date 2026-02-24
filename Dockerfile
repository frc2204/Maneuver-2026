# ── Stage 1: Build the frontend ─────────────────────────────────────────────────
FROM oven/bun:1 AS build

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json bun.lock* package-lock.json* ./
RUN bun install --ignore-scripts

# Copy source and build
COPY . .
RUN bun run build

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM oven/bun:1-slim

WORKDIR /app

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server
COPY server/ ./server/

EXPOSE 3000

CMD ["bun", "run", "server/index.ts"]
