plugins {
  `java-library`
}

dependencies {
  implementation(platform(libs.spring.boot.bom))
  implementation(project(":backend:common"))
  implementation(libs.spring.boot.starter.jdbc)
  runtimeOnly(libs.mysql.connector.j)

  testImplementation(libs.spring.boot.starter.test)
}
