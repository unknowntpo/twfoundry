plugins {
  `java-library`
}

dependencies {
  implementation(platform(libs.spring.boot.bom))
  implementation(project(":backend:common"))

  testImplementation(libs.junit.jupiter)
}
