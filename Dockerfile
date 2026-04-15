FROM node:20-alpine

RUN apk add --no-cache python3 make g++ redis

WORKDIR /app

RUN corepack enable pnpm

COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./backend/

WORKDIR /app/backend
RUN pnpm install --frozen-lockfile
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile

WORKDIR /app/backend
COPY backend/ .
RUN pnpm run build
RUN pnpm run migration:run

WORKDIR /app/frontend
COPY frontend/ .
RUN pnpm run build

WORKDIR /app/backend
CMD ["sh", "-c", "redis-server --daemonize yes && pnpm run start"]
