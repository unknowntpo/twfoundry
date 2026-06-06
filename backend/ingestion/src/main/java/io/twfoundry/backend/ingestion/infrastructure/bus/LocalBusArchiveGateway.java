package io.twfoundry.backend.ingestion.infrastructure.bus;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.twfoundry.backend.ingestion.application.bus.BusArchiveGateway;
import io.twfoundry.backend.ingestion.application.bus.BusArchiveManifest;
import io.twfoundry.backend.ingestion.application.bus.BusSnapshot;
import java.io.IOException;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LocalBusArchiveGateway implements BusArchiveGateway {
  private final ObjectMapper objectMapper;
  private final Path archiveRoot;
  private final Path publicDataRoot;

  public LocalBusArchiveGateway(
      ObjectMapper objectMapper,
      @Value("${twfoundry.bus.archive.root:../../frontend/public/data/tdx-bus/archive}") String archiveRoot) {
    this.objectMapper = objectMapper;
    this.archiveRoot = Path.of(archiveRoot).toAbsolutePath().normalize();
    this.publicDataRoot = this.archiveRoot.getParent().getParent();
  }

  @Override
  public BusArchiveManifest loadManifest() {
    return read(archiveRoot.resolve("manifest.json"), BusArchiveManifest.class);
  }

  @Override
  public BusSnapshot loadSnapshot(String publicPath) {
    Path path = publicDataRoot.resolve(stripPublicDataPrefix(publicPath)).normalize();
    if (!path.startsWith(publicDataRoot.normalize())) {
      throw new IllegalArgumentException("Snapshot path escapes public data root: " + publicPath);
    }
    return read(path, BusSnapshot.class);
  }

  private String stripPublicDataPrefix(String publicPath) {
    if (publicPath == null || publicPath.isBlank()) {
      throw new IllegalArgumentException("Snapshot path must not be blank.");
    }
    return publicPath.startsWith("/data/") ? publicPath.substring("/data/".length()) : publicPath;
  }

  private <T> T read(Path path, Class<T> type) {
    try {
      return objectMapper.readValue(path.toFile(), type);
    } catch (IOException error) {
      throw new IllegalStateException("Failed to read bus archive file: " + path, error);
    }
  }
}
