package io.twfoundry.backend.ingestion.infrastructure.tdx;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!e2e")
public class TdxHttpLiveBoardGateway implements TdxLiveBoardGateway {
  private final TdxProperties properties;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  private String accessToken;
  private long tokenExpiresAt;
  private long nextAllowedRequestAt;

  public TdxHttpLiveBoardGateway(TdxProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  }

  @Override
  public List<JsonNode> fetchLiveBoard(String operator, String stationId) {
    if (properties.clientId().isBlank() || properties.clientSecret().isBlank()) {
      throw new IllegalStateException("TDX credentials are not configured for the backend process.");
    }

    try {
      String token = getAccessToken();
      rateLimit();
      HttpRequest request =
          HttpRequest.newBuilder(buildLiveBoardUri(operator, stationId))
              .header("Authorization", "Bearer " + token)
              .GET()
              .timeout(Duration.ofSeconds(15))
              .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() / 100 != 2) {
        throw new IllegalStateException("TDX LiveBoard request failed.");
      }

      JsonNode payload = objectMapper.readTree(response.body());
      List<JsonNode> rows = new ArrayList<>();
      if (payload.isArray()) {
        payload.forEach(rows::add);
      } else {
        JsonNode list = payload.path("LiveBoards");
        if (list.isArray()) {
          list.forEach(rows::add);
        }
      }
      return rows;
    } catch (IOException | InterruptedException error) {
      if (error instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      throw new IllegalStateException("TDX LiveBoard request failed.", error);
    }
  }

  private synchronized String getAccessToken() throws IOException, InterruptedException {
    long now = System.currentTimeMillis();
    if (accessToken != null && tokenExpiresAt > now) {
      return accessToken;
    }

    String body =
        "grant_type=client_credentials&client_id="
            + encode(properties.clientId())
            + "&client_secret="
            + encode(properties.clientSecret());

    HttpRequest request =
        HttpRequest.newBuilder(URI.create(properties.authUrl()))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .timeout(Duration.ofSeconds(15))
            .build();

    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() / 100 != 2) {
      throw new IllegalStateException("TDX token request failed.");
    }

    JsonNode payload = objectMapper.readTree(response.body());
    String token = payload.path("access_token").asText("");
    if (token.isBlank()) {
      throw new IllegalStateException("TDX token response did not include an access token.");
    }

    long expiresInSeconds = payload.path("expires_in").asLong(3600);
    accessToken = token;
    tokenExpiresAt = now + Math.max(0, expiresInSeconds * 1000 - 60_000);
    return accessToken;
  }

  private synchronized void rateLimit() throws InterruptedException {
    long now = System.currentTimeMillis();
    long minIntervalMillis = Math.ceilDiv(1000L, Math.max(1, properties.rateLimitPerSecond()));
    long waitMillis = Math.max(0, nextAllowedRequestAt - now);
    nextAllowedRequestAt = Math.max(nextAllowedRequestAt, now) + minIntervalMillis;
    if (waitMillis > 0) {
      Thread.sleep(waitMillis);
    }
  }

  private URI buildLiveBoardUri(String operator, String stationId) {
    String base = properties.apiBaseUrl().endsWith("/") ? properties.apiBaseUrl() : properties.apiBaseUrl() + "/";
    StringBuilder query = new StringBuilder("$format=JSON");
    String normalizedStationId = normalizeStationId(stationId);
    if (normalizedStationId != null) {
      query.append("&$filter=").append(encode("StationID eq '" + normalizedStationId + "'"));
    }
    return URI.create(base + "Rail/Metro/LiveBoard/" + operator + "?" + query);
  }

  private String normalizeStationId(String stationId) {
    if (stationId == null || stationId.isBlank()) {
      return null;
    }
    int index = stationId.lastIndexOf('-');
    return index >= 0 ? stationId.substring(index + 1) : stationId;
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
