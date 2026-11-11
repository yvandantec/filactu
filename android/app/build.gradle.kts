import java.util.Properties

plugins {
    id("com.android.application")
}

android {
    namespace = "fr.yvan.filactu"
    compileSdk = 35

    defaultConfig {
        applicationId = "fr.yvan.filactu"
        minSdk = 29
        targetSdk = 35
        versionCode = 4
        versionName = "1.3.0"
    }

    // Clé de signature hors dépôt (DEC-08) : keystore.properties (ignoré par git) pointe vers le fichier .jks.
    val keystoreFile = rootProject.file("keystore.properties")
    val releaseSigning = if (keystoreFile.exists()) {
        val props = Properties().apply { keystoreFile.inputStream().use { load(it) } }
        signingConfigs.create("release") {
            storeFile = file(props.getProperty("storeFile"))
            storePassword = props.getProperty("storePassword")
            keyAlias = props.getProperty("keyAlias")
            keyPassword = props.getProperty("keyPassword")
        }
    } else {
        null
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = releaseSigning
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}
