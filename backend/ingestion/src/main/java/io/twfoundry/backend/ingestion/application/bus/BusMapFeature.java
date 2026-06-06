package io.twfoundry.backend.ingestion.application.bus;

public record BusMapFeature(
    String id,
    double longitude,
    double latitude,
    String vehicleId,
    String routeUid,
    String routeName,
    int direction,
    double speedKph,
    double azimuthDeg,
    String gpsTime,
    String updateTime,
    String freshness,
    double completeness) {}
