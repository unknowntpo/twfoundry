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

# Flink on Java 17+ requires these module opens for its Kryo serializer (reflective
# setAccessible on java.util collections). Without them the job throws
# InaccessibleObjectException and restart-loops, consuming nothing. Keep in sync with
# backend/streams/build.gradle.kts test jvmArgs (guarded by JvmModuleAccessTest).
ENV JDK_JAVA_OPTIONS="--add-opens=java.base/java.lang=ALL-UNNAMED \
--add-opens=java.base/java.lang.reflect=ALL-UNNAMED \
--add-opens=java.base/java.io=ALL-UNNAMED \
--add-opens=java.base/java.nio=ALL-UNNAMED \
--add-opens=java.base/java.net=ALL-UNNAMED \
--add-opens=java.base/java.util=ALL-UNNAMED \
--add-opens=java.base/java.util.concurrent=ALL-UNNAMED \
--add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED \
--add-opens=java.base/java.text=ALL-UNNAMED \
--add-opens=java.base/java.time=ALL-UNNAMED \
--add-opens=java.base/sun.nio.ch=ALL-UNNAMED"

CMD ["java", "-jar", "/app/bus-route-sentinel.jar"]
