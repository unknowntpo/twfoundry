package io.twfoundry.backend.common.domain;

import java.util.List;

public interface PushSource<Input, Payload> {
  List<RawEnvelope<Payload>> ingest(Input input);
}
