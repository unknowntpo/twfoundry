package io.twfoundry.backend.ingestion.infrastructure.tdx;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public interface TdxLiveBoardGateway {
  List<JsonNode> fetchLiveBoard(String operator, String stationId);
}
