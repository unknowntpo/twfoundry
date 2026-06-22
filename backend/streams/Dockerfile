FROM eclipse-temurin:21-jdk AS build

WORKDIR /repo

COPY . .
RUN ./gradlew :backend:streams:flinkJar --no-daemon

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /repo/backend/streams/build/libs/*-flink.jar /app/bus-route-sentinel.jar
COPY --from=build /repo/frontend/public/data/tdx-bus/route-context /app/route-context

ENV KAFKA_BROKERS=kafka:9092 \
    BUS_SENTINEL_INPUT_TOPIC=normalized.tdx.bus_vehicle_position \
    BUS_SENTINEL_OUTPUT_TOPIC=online.tdx.bus_route_signal \
    BUS_SENTINEL_GROUP_ID=bus-route-sentinel \
    BUS_ROUTE_CONTEXT_DIR=/app/route-context \
    BUS_SENTINEL_CHECKPOINT_DIR=file:///flink-checkpoints/bus-route-sentinel

CMD ["java", "-jar", "/app/bus-route-sentinel.jar"]
