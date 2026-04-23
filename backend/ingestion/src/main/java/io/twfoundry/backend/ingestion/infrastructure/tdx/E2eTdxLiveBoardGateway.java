package io.twfoundry.backend.ingestion.infrastructure.tdx;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("e2e")
public class E2eTdxLiveBoardGateway implements TdxLiveBoardGateway {
  private final ObjectMapper objectMapper;

  public E2eTdxLiveBoardGateway(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public List<JsonNode> fetchLiveBoard(String operator, String stationId) {
    if (stationId == null || stationId.isBlank()) {
      return List.of(
          row("BL", "BL18", "BL23", "Nangang Exhibition Center", 60),
          row("R", "R10", "R28", "Tamsui", 45),
          row("G", "G10", "G19", "Songshan", 30));
    }

    String normalizedStationId = normalizeStationId(stationId);
    return List.of(row(resolveLineId(normalizedStationId), normalizedStationId, "TERM", "Demo Terminal", 60));
  }

  private JsonNode row(
      String lineId, String stationId, String destinationStationId, String headsign, int estimateTime) {
    return objectMapper
        .createObjectNode()
        .put("LineID", lineId)
        .put("StationID", stationId)
        .put("DestinationStationID", destinationStationId)
        .put("TripHeadSign", headsign)
        .put("EstimateTime", estimateTime);
  }

  private String normalizeStationId(String stationId) {
    int index = stationId.lastIndexOf('-');
    return index >= 0 ? stationId.substring(index + 1) : stationId;
  }

  private String resolveLineId(String stationId) {
    if (stationId.startsWith("BL")) {
      return "BL";
    }
    if (stationId.startsWith("G")) {
      return "G";
    }
    return "R";
  }
}
