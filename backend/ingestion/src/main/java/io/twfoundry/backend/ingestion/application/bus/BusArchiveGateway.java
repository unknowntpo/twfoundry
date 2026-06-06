package io.twfoundry.backend.ingestion.application.bus;

public interface BusArchiveGateway {
  BusArchiveManifest loadManifest();

  BusSnapshot loadSnapshot(String publicPath);
}
