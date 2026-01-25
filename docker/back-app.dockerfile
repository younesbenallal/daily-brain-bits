FROM oven/bun:1.1.0

WORKDIR /app
COPY . .

RUN bun install --frozen-lockfile

EXPOSE 3001
CMD ["bun", "run", "--cwd", "apps/back", "dev.ts"]
