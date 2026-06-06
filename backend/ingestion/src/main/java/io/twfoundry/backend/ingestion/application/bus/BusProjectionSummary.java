package io.twfoundry.backend.ingestion.application.bus;

public record BusProjectionSummary(
    int vehicleCount,
    int routeCount,
    int freshCount,
    int staleCount,
    double averageCompleteness) {}
