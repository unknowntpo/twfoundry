package io.twfoundry.backend.common.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class TopicNamesTest {
  @Test
  void buildsLegacyTopicFamiliesFromPlatformVocabulary() {
    assertEquals("raw.transit.tdx.mrt_liveboard", TopicNames.raw("transit", "tdx", "mrt_liveboard"));
    assertEquals("normalized.transit.mrt_arrival", TopicNames.normalized("transit", "mrt_arrival"));
    assertEquals("state.transit.station_liveboard", TopicNames.state("transit", "station_liveboard"));
    assertEquals("dlq.transit.tdx.mrt_liveboard", TopicNames.deadLetter("transit", "tdx", "mrt_liveboard"));
  }

  @Test
  void buildsOverlayPipelineTopicFamilies() {
    assertEquals("source.tdx.mrt_vehicle.raw.v1", TopicNames.sourceRaw("tdx", "mrt_vehicle"));
    assertEquals(
        "source.tdx.mrt_vehicle.raw.replay.replay_20260429_001",
        TopicNames.sourceReplayRaw("tdx", "mrt_vehicle", "replay_20260429_001"));
    assertEquals(
        "twf.observations.vehicle_position.v1", TopicNames.observations("vehicle_position"));
    assertEquals("twf.overlay.events.v1", TopicNames.overlayEvents());
    assertEquals("twf.audit.events.v1", TopicNames.auditEvents());
  }

  @Test
  void rejectsUnsafeTopicTokens() {
    assertThrows(IllegalArgumentException.class, () -> TopicNames.sourceRaw("tdx", "mrt.vehicle"));
  }
}
