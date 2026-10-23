FROM oven/bun:1.4.3

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json mikro-orm.config.ts ./
COPY src ./src

EXPOSE 3000

CMD ["bun", "run", "src/main.ts"]
