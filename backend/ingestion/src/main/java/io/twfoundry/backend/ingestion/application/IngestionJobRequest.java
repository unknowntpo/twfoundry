package io.twfoundry.backend.ingestion.application;

import io.twfoundry.backend.common.domain.RunMode;
import java.time.Instant;
import java.util.Map;

public record IngestionJobRequest(
    String sourceId,
    String datasetId,
    RunMode runMode,
    Instant requestedAt,
    String requestedBy,
    Map<String, String> parameters) {}
