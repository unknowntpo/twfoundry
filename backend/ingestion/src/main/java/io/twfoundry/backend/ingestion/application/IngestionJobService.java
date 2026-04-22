package io.twfoundry.backend.ingestion.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class IngestionJobService implements IngestionJobRunner {
  private static final Logger logger = LoggerFactory.getLogger(IngestionJobService.class);

  @Override
  public void run(IngestionJobRequest request) {
    logger.info(
        "Ingestion job requested: sourceId={}, datasetId={}, runMode={}, requestedBy={}",
        request.sourceId(),
        request.datasetId(),
        request.runMode(),
        request.requestedBy());
  }
}
