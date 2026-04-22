package io.twfoundry.backend.common.domain;

public interface PullSource<Cursor, Payload> {
  PullBatch<Cursor, Payload> pull(Cursor cursor);
}
