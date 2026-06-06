package io.twfoundry.backend.ingestion.api.bus;

import io.twfoundry.backend.ingestion.application.bus.BusVehicleProjection;
import io.twfoundry.backend.ingestion.application.bus.BusVehicleProjectionService;
import io.twfoundry.backend.ingestion.application.bus.BusVehicleProjectionTimeline;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/projections")
@CrossOrigin(origins = "*")
public class BusProjectionController {
  private final BusVehicleProjectionService service;

  public BusProjectionController(BusVehicleProjectionService service) {
    this.service = service;
  }

  @GetMapping("/bus_vehicles")
  public BusVehicleProjection getBusVehicles(@RequestParam(defaultValue = "latest") String slot) {
    try {
      return service.buildProjection(slot);
    } catch (IllegalArgumentException error) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, error.getMessage(), error);
    } catch (IllegalStateException error) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, error.getMessage(), error);
    }
  }

  @GetMapping("/bus_vehicles/timeline")
  public BusVehicleProjectionTimeline getBusVehicleTimeline() {
    try {
      return service.buildTimeline();
    } catch (IllegalStateException error) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, error.getMessage(), error);
    }
  }
}
