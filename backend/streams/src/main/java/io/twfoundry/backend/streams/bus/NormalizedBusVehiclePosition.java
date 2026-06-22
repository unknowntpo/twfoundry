package io.twfoundry.backend.streams.bus;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;

@JsonIgnoreProperties(ignoreUnknown = true)
public record NormalizedBusVehiclePosition(
    String schema,
    @JsonProperty("slot_key") String slotKey,
    @JsonProperty("service_date") String serviceDate,
    @JsonProperty("slot_label") String slotLabel,
    String city,
    @JsonProperty("vehicle_id") String vehicleId,
    @JsonProperty("route_uid") String routeUid,
    @JsonProperty("route_name") String routeName,
    Integer direction,
    Double longitude,
    Double latitude,
    @JsonProperty("speed_kph") Double speedKph,
    @JsonProperty("azimuth_deg") Double azimuthDeg,
    @JsonProperty("gps_time") String gpsTime,
    @JsonProperty("update_time") String updateTime,
    String freshness,
    Double completeness,
    @JsonProperty("ingest_mode") String ingestMode,
    @JsonProperty("source_dataset") String sourceDataset,
    @JsonProperty("ingested_at") String ingestedAt
) implements Serializable {
  public boolean hasRequiredPosition() {
    return notBlank(slotKey)
        && notBlank(vehicleId)
        && notBlank(routeUid)
        && direction != null
        && longitude != null
        && latitude != null
        && Double.isFinite(longitude)
        && Double.isFinite(latitude);
  }

  private static boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }
}
