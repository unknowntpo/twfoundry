# Track B homelab: TDX -> Kafka ingestion service
FROM node:22-alpine

WORKDIR /app

# Install only production deps (kafkajs) from the lockfile when present.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV HTTP_PORT=8081
EXPOSE 8081

# TDX_CLIENT_ID / TDX_CLIENT_SECRET / KAFKA_BROKERS supplied via compose env.
CMD ["node", "src/index.js"]
