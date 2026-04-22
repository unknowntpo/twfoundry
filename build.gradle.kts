plugins {
  alias(libs.plugins.spring.boot) apply false
}

allprojects {
  group = "io.twfoundry"
  version = "0.1.0-SNAPSHOT"

  repositories {
    mavenCentral()
  }
}

subprojects {
  apply(plugin = "java")

  extensions.configure<JavaPluginExtension> {
    toolchain {
      languageVersion = JavaLanguageVersion.of(21)
    }
  }

  tasks.withType<Test>().configureEach {
    useJUnitPlatform()
  }
}
