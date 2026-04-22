package io.twfoundry.backend.ingestion.infrastructure.tdx;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class TdxProperties {
  private final Environment environment;
  private final Map<String, String> dotEnvValues;

  public TdxProperties(Environment environment) {
    this.environment = environment;
    this.dotEnvValues = loadFrontendDotEnv();
  }

  public String clientId() {
    return value("TDX_CLIENT_ID", "");
  }

  public String clientSecret() {
    return value("TDX_CLIENT_SECRET", "");
  }

  public String authUrl() {
    return value(
        "TDX_AUTH_URL",
        "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token");
  }

  public String apiBaseUrl() {
    return value("TDX_API_BASE_URL", "https://tdx.transportdata.tw/api/basic/v2");
  }

  public int rateLimitPerSecond() {
    return Integer.parseInt(value("TDX_RATE_LIMIT_PER_SECOND", "5"));
  }

  private String value(String key, String fallback) {
    String envValue = environment.getProperty(key);
    if (envValue != null && !envValue.isBlank()) {
      return envValue;
    }
    return dotEnvValues.getOrDefault(key, fallback);
  }

  private Map<String, String> loadFrontendDotEnv() {
    Path[] candidates =
        new Path[] {
          Path.of("frontend/.env"),
          Path.of("../frontend/.env"),
          Path.of("../../frontend/.env"),
        };

    for (Path candidate : candidates) {
      if (Files.exists(candidate)) {
        try {
          return parseDotEnv(candidate);
        } catch (IOException ignored) {
          return Map.of();
        }
      }
    }
    return Map.of();
  }

  private Map<String, String> parseDotEnv(Path path) throws IOException {
    Map<String, String> values = new HashMap<>();
    for (String rawLine : Files.readAllLines(path)) {
      String line = rawLine.trim();
      if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
        continue;
      }
      int separator = line.indexOf('=');
      String key = line.substring(0, separator).trim();
      String value = line.substring(separator + 1).trim().replaceAll("^['\"]|['\"]$", "");
      values.put(key, value);
    }
    return values;
  }
}
