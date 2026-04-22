package io.twfoundry.backend.common.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class TopicNamesTest {
  @Test
  void buildsTopicFamiliesFromPlatformVocabulary() {
    assertEquals("raw.transit.tdx.mrt_liveboard", TopicNames.raw("transit", "tdx", "mrt_liveboard"));
    assertEquals("normalized.transit.mrt_arrival", TopicNames.normalized("transit", "mrt_arrival"));
    assertEquals("state.transit.station_liveboard", TopicNames.state("transit", "station_liveboard"));
    assertEquals("dlq.transit.tdx.mrt_liveboard", TopicNames.deadLetter("transit", "tdx", "mrt_liveboard"));
  }
}
