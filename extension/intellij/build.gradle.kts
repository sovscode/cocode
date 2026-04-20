import com.github.gradle.node.npm.task.NpmTask

plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "2.1.20"
    id("org.jetbrains.intellij.platform") version "2.10.2"
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.20"

    id("com.github.node-gradle.node") version "7.0.2"
}

node {
    version.set("20.11.1")       // pick a stable Node version
    download.set(true)           // ensures reproducible builds
}

tasks.register<NpmTask>("npm-Install") {
    args.set(listOf("install"))
    workingDir.set(file("src/main/typescript"))
}

tasks.register<NpmTask>("buildWebview") {
    dependsOn("npm-Install")
    args.set(listOf("run", "build"))
    workingDir.set(file("src/main/typescript"))
}

group = "sovs"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

tasks.processResources {
    dependsOn("buildWebview")
}

// Read more: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html
dependencies {
    intellijPlatform {
        intellijIdea("2025.2.4")
        testFramework(org.jetbrains.intellij.platform.gradle.TestFrameworkType.Platform)

        // Add plugin dependencies for compilation here:
        composeUI()

        bundledPlugin("com.intellij.java")
    }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild = "252.25557"
        }

        changeNotes = """
            Initial version
        """.trimIndent()
    }
}

tasks {
    // Set the JVM compatibility versions
    withType<JavaCompile> {
        sourceCompatibility = "21"
        targetCompatibility = "21"
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21)
    }
}
