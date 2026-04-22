package io.twfoundry.backend.common.domain;

import java.util.List;

public record PullBatch<Cursor, Payload>(List<RawEnvelope<Payload>> records, Cursor nextCursor) {}
