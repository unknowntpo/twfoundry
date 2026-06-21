# Track B homelab: Kafka -> JSONL lake archiver
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

# Lake is written to a shared volume mounted at /lake (see compose LAKE_PATH).
ENV LAKE_PATH=/lake
VOLUME ["/lake"]

CMD ["node", "src/index.js"]
