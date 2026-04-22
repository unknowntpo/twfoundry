package io.twfoundry.backend.common.domain;

import java.time.Instant;
import java.util.Map;

public record RawEnvelope<Payload>(
    String eventId,
    String source,
    String dataset,
    String domain,
    String key,
    Instant observedAt,
    Instant ingestedAt,
    IngestionMethod ingestionMethod,
    RunMode runMode,
    String schemaVersion,
    String contentType,
    Payload payload,
    Map<String, String> metadata) {}
