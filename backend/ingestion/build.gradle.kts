plugins {
  alias(libs.plugins.spring.boot)
}

dependencies {
  implementation(platform(libs.spring.boot.bom))
  implementation(project(":backend:common"))
  implementation(libs.spring.boot.starter)
  implementation(libs.spring.boot.starter.web)
  implementation(libs.spring.boot.starter.actuator)
  implementation(libs.spring.boot.starter.validation)
  implementation(libs.spring.kafka)
  implementation(libs.spring.retry)
  implementation(libs.micrometer.prometheus)

  testImplementation(libs.spring.boot.starter.test)
  testImplementation(libs.spring.boot.test)
}
