package io.twfoundry.backend.common.domain;

public enum SourceMode {
  LIVE_STREAM,
  HISTORICAL_SNAPSHOT,
  BOOTSTRAP_SNAPSHOT,
  CDC_CHANGE,
  INFERRED_LIVE,
  OPERATOR_CORRECTION
}
