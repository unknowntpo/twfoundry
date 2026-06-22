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
