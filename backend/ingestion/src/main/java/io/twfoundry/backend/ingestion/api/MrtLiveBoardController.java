package io.twfoundry.backend.ingestion.api;

import io.twfoundry.backend.ingestion.application.MrtLiveBoardService;
import io.twfoundry.backend.ingestion.application.MrtLiveBoardService.MrtLiveBoardResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/mrt/liveboard")
@CrossOrigin(origins = "*")
public class MrtLiveBoardController {
  private final MrtLiveBoardService service;

  public MrtLiveBoardController(MrtLiveBoardService service) {
    this.service = service;
  }

  @GetMapping
  public MrtLiveBoardResponse getLiveBoard(
      @RequestParam(defaultValue = "TRTC") String operator,
      @RequestParam(required = false) String stationId) {
    try {
      return service.fetch(operator, stationId);
    } catch (IllegalStateException error) {
      HttpStatus status =
          error.getMessage() != null && error.getMessage().contains("credentials")
              ? HttpStatus.SERVICE_UNAVAILABLE
              : HttpStatus.BAD_GATEWAY;
      throw new ResponseStatusException(status, error.getMessage(), error);
    }
  }
}
