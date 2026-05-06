FROM node:22-slim AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
RUN pnpm add node-fetch @types/node-fetch --save-dev

COPY prisma ./prisma/
RUN pnpm prisma generate

COPY . .
RUN pnpm next build

# ---- runner ----
FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y curl ca-certificates --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/next-i18next.config.js ./

ENV NODE_ENV=production

EXPOSE 4002

CMD ["pnpm", "next", "start", "--port", "4002"]
