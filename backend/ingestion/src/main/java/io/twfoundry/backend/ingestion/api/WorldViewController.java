package io.twfoundry.backend.ingestion.api;

import io.twfoundry.backend.ingestion.application.world.WorldView.OntologyObject;
import io.twfoundry.backend.ingestion.application.world.WorldView.Payload;
import io.twfoundry.backend.ingestion.application.world.WorldViewService;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/world")
@CrossOrigin(origins = "*")
public class WorldViewController {
  private final WorldViewService service;

  public WorldViewController(WorldViewService service) {
    this.service = service;
  }

  @GetMapping("/view")
  public Payload getWorldView(
      @RequestParam(defaultValue = "zhongshan-station") String focusId,
      @RequestParam(defaultValue = "city") String lod,
      @RequestParam(defaultValue = "live") String time,
      @RequestParam(required = false) String overlays,
      @RequestParam(defaultValue = "false") boolean debugGeo) {
    try {
      return service.buildView(focusId, lod, time, parseOverlays(overlays), debugGeo);
    } catch (IllegalArgumentException error) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, error.getMessage(), error);
    }
  }

  @GetMapping("/objects/{objectId}")
  public OntologyObject getObject(@PathVariable String objectId) {
    try {
      return service.findObject(objectId);
    } catch (IllegalArgumentException error) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, error.getMessage(), error);
    }
  }

  private List<String> parseOverlays(String overlays) {
    if (overlays == null || overlays.isBlank()) {
      return List.of();
    }
    return Arrays.stream(overlays.split(",")).map(String::trim).filter(value -> !value.isBlank()).toList();
  }
}
