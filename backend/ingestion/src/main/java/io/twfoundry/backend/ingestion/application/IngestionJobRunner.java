package io.twfoundry.backend.ingestion.application;

public interface IngestionJobRunner {
  void run(IngestionJobRequest request);
}
