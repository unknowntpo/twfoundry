package io.twfoundry.backend.common.domain;

public record SourceDescriptor(
    String sourceId,
    String datasetId,
    String domain,
    IngestionMethod ingestionMethod,
    String schemaVersion,
    String rawTopic) {}
