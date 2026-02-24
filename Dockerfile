# ── Stage 1: Build the frontend ─────────────────────────────────────────────────
FROM oven/bun:1 AS build

WORKDIR /app

# Install only production deps + the few dev deps needed for vite build
COPY package.json bun.lock* package-lock.json* ./
RUN bun install --production --ignore-scripts && \
    bun add --no-save --ignore-scripts vite@^5.4.11 @vitejs/plugin-react-swc@^3.7.1 \
    @tailwindcss/vite@^4.0.0-beta.6 tailwindcss@^4.0.0-beta.6 \
    tw-animate-css@^1.0.1 vite-plugin-pwa@^0.20.5

# Copy source and build
COPY . .
RUN bunx vite build

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM oven/bun:1-slim

WORKDIR /app

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server
COPY server/ ./server/

EXPOSE 3000

CMD ["bun", "run", "server/index.ts"]
