package io.twfoundry.backend.streams.bus;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import java.lang.reflect.Field;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

/**
 * Guards the JVM --add-opens flags the Flink job needs on Java 17+. Flink's Kryo serializer does
 * exactly this reflective setAccessible on java.util.Arrays$ArrayList when serializing record /
 * operator state; without --add-opens=java.base/java.util=ALL-UNNAMED it throws
 * InaccessibleObjectException, which made the route-sentinel job restart-loop and consume nothing.
 *
 * The same flag set lives in services/.../backend/streams/Dockerfile (JDK_JAVA_OPTIONS) and in this
 * module's test jvmArgs (build.gradle.kts). If this test fails, the runtime flags are missing.
 */
class JvmModuleAccessTest {

  @Test
  void canReflectIntoJavaUtilForKryo() throws Exception {
    Object arraysArrayList = Arrays.asList("a", "b"); // java.util.Arrays$ArrayList
    Field field = arraysArrayList.getClass().getDeclaredField("a");
    assertDoesNotThrow(() -> field.setAccessible(true),
        "JVM is missing --add-opens=java.base/java.util=ALL-UNNAMED required by Flink Kryo");
  }
}
