plugins {
  `java-library`
  application
}

application {
  mainClass.set("io.twfoundry.backend.streams.bus.BusRouteSentinelJob")
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
