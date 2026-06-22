FROM node:22-alpine

RUN npm install -g wrangler@4

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV KAFKA_BROKERS=kafka:9092 \
    BUS_ROUTE_SIGNAL_TOPIC=online.tdx.bus_route_signal \
    BUS_ROUTE_SIGNAL_UPLOAD_R2=true \
    BUS_ROUTE_SIGNAL_PUBLISH_LOOP=true \
    BUS_ROUTE_SIGNAL_MAX_WAIT_MS=30000 \
    BUS_ROUTE_SIGNAL_IDLE_MS=5000 \
    BUS_ROUTE_SIGNAL_PUBLISH_SLEEP_MS=30000 \
    WRANGLER_BIN=wrangler

CMD ["node", "src/index.js"]
