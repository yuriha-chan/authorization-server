FROM node:20-alpine

RUN apk add --no-cache python3 make g++ sqlite3

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
CMD ["pnpm", "run", "start"]
