FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN corepack enable pnpm

COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
COPY backend/package.json backend/pnpm-lock.yaml ./backend/

WORKDIR /app/backend
RUN pnpm config set allow-builds sqlite3 && pnpm install --frozen-lockfile
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile

WORKDIR /app/frontend
COPY frontend frontend
RUN pnpm run build

WORKDIR /app/backend
COPY backend backend
RUN pnpm run build
RUN pnpm run migration:run

CMD ["pnpm", "run", "start"]
