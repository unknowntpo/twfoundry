FROM oven/bun:1.2.15-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV PORT=8080
CMD ["bun", "src/server.mjs"]
