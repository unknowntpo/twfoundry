plugins {
  `java-library`
}

dependencies {
  implementation(platform(libs.spring.boot.bom))
  implementation(libs.jackson.jsr310)

  testImplementation(libs.junit.jupiter)
}
