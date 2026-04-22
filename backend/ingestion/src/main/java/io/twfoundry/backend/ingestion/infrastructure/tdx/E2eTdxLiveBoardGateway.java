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
    return List.of(
        objectMapper.createObjectNode()
            .put("LineID", "BL")
            .put("StationID", stationId == null || stationId.isBlank() ? "BL18" : normalizeStationId(stationId))
            .put("DestinationStationID", "BL23")
            .put("TripHeadSign", "Nangang Exhibition Center")
            .put("EstimateTime", 60));
  }

  private String normalizeStationId(String stationId) {
    int index = stationId.lastIndexOf('-');
    return index >= 0 ? stationId.substring(index + 1) : stationId;
  }
}
