plugins {
  `java-library`
  application
}

application {
  mainClass.set("io.twfoundry.backend.streams.bus.BusRouteSentinelJob")
}

// UNK-37: package the shared detection-rule contract onto the classpath at
// `contracts/bus-detection-rules.v1.json` so BusDetectionRules can read it via
// getResourceAsStream. The SAME file is read by the ClickHouse batch publish script
// (frontend/scripts/publish-clickhouse-bus-analytics.mjs), making it the single source
// of truth for gap/bunching/headway/map-match parameters across both engines. Wired
// into both main and test resources so unit tests load the identical bytes the job ships.
val sharedContractsDir = rootDir.resolve("contracts")
tasks.named<ProcessResources>("processResources") {
  from(sharedContractsDir) { into("contracts") }
}
tasks.named<ProcessResources>("processTestResources") {
  from(sharedContractsDir) { into("contracts") }
}

// Flink on Java 17+ needs these module opens for its Kryo serializer (reflective setAccessible
// on java.util collections). Must match Dockerfile JDK_JAVA_OPTIONS. See JvmModuleAccessTest.
val flinkAddOpens = listOf(
  "--add-opens=java.base/java.lang=ALL-UNNAMED",
  "--add-opens=java.base/java.lang.reflect=ALL-UNNAMED",
  "--add-opens=java.base/java.io=ALL-UNNAMED",
  "--add-opens=java.base/java.nio=ALL-UNNAMED",
  "--add-opens=java.base/java.net=ALL-UNNAMED",
  "--add-opens=java.base/java.util=ALL-UNNAMED",
  "--add-opens=java.base/java.util.concurrent=ALL-UNNAMED",
  "--add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED",
  "--add-opens=java.base/java.text=ALL-UNNAMED",
  "--add-opens=java.base/java.time=ALL-UNNAMED",
  "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED",
)

tasks.test {
  jvmArgs(flinkAddOpens)
}

dependencies {
  implementation(platform(libs.spring.boot.bom))
  implementation(project(":backend:common"))
  implementation(libs.jackson.databind)
  implementation(libs.jackson.jsr310)
  implementation(libs.flink.streaming.java)
  implementation(libs.flink.clients)
  implementation(libs.flink.connector.base)
  implementation(libs.flink.connector.kafka)

  // log4j2 backend so the Flink job actually emits logs (otherwise SLF4J NOP = silent, blind ops)
  runtimeOnly(libs.log4j.slf4j2.impl)
  runtimeOnly(libs.log4j.core)
  runtimeOnly(libs.log4j.api)

  testImplementation(libs.junit.jupiter)
}

tasks.register<Jar>("flinkJar") {
  group = "build"
  description = "Builds a self-contained jar for submitting the bus-route-sentinel Flink job."
  archiveClassifier.set("flink")
  duplicatesStrategy = DuplicatesStrategy.EXCLUDE
  manifest {
    attributes["Main-Class"] = application.mainClass.get()
  }
  from(sourceSets.main.get().output)
  dependsOn(configurations.runtimeClasspath)
  from({
    configurations.runtimeClasspath.get()
      .filter { it.name.endsWith(".jar") }
      .map { zipTree(it) }
  })
}
