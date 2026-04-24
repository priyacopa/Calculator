# 📱 CalcPro — Android APK Build Guide
## Smart Calculator & Utility App — College Final Project

---

## 🗂️ Project Structure

```
CalcPro/                          ← Root project folder
├── index.html                    ← Main application HTML
├── style.css                     ← Stylesheet
├── app.js                        ← JavaScript (all modules)
├── sw.js                         ← Service Worker (offline)
├── README.md                     ← This file
├── android/                      ← Android Studio project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/.../MainActivity.java
│   │   │   ├── assets/           ← Copy web files here
│   │   │   │   ├── index.html
│   │   │   │   ├── style.css
│   │   │   │   └── app.js
│   │   │   └── res/
│   │   │       ├── layout/activity_main.xml
│   │   │       ├── drawable/     ← App icon files
│   │   │       └── values/
│   │   └── build.gradle
│   └── build.gradle
└── docs/
    └── PROJECT_REPORT.md
```

---

## 🔧 Android Studio Setup

### Prerequisites
- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK API 24+ (Android 7.0 Nougat)
- Target SDK: API 34 (Android 14)

---

## 📄 AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourname.calcpro">

    <uses-permission android:name="android.permission.INTERNET"/>
    <!-- For fonts if loaded online; remove if fully offline -->

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|keyboard">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

    </application>
</manifest>
```

---

## ☕ MainActivity.java

```java
package com.yourname.calcpro;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.View;
import android.view.WindowManager;
import androidx.appcompat.app.AppCompatActivity;

/**
 * MainActivity — Hosts the CalcPro WebView
 * 
 * Features:
 *   - Full-screen, no title bar
 *   - JavaScript enabled (required for app logic)
 *   - DOM storage for history persistence
 *   - Loads from local assets (no internet required)
 *   - Back button navigates WebView history
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full-screen (hide status + navigation bars)
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);

        // ── WebView Security & Feature Settings ──────────────────
        WebSettings settings = webView.getSettings();

        // Enable JavaScript (required for calculator logic)
        settings.setJavaScriptEnabled(true);

        // Enable DOM storage (for localStorage — calculation history)
        settings.setDomStorageEnabled(true);

        // Disable file access from file URLs to other files (security)
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);

        // Enable local file access (needed for assets)
        settings.setAllowFileAccess(true);

        // Responsive viewport support
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Text zoom = 100% (don't let system font scaling break layout)
        settings.setTextZoom(100);

        // Cache mode — use cache when offline
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // ── WebViewClient: stay within app, no external browser ──
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Keep all navigation inside WebView
                return false;
            }
        });

        // WebChromeClient: enables console.log for debugging
        webView.setWebChromeClient(new WebChromeClient());

        // Hide scrollbars (clean UI)
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setVerticalScrollBarEnabled(false);

        // ── Load the app from assets ──────────────────────────────
        // file:///android_asset/ maps to app/src/main/assets/
        webView.loadUrl("file:///android_asset/index.html");
    }

    // ── Back button navigates WebView history ─────────────────────
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // ── Pause/Resume WebView with Activity lifecycle ──────────────
    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
```

---

## 📐 activity_main.xml (Layout)

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0a0a0f">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</RelativeLayout>
```

---

## 🎨 App Icon Generation

Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) or:

```bash
# Using ImageMagick (command line)
convert icon_source.png -resize 192x192 mipmap-xxxhdpi/ic_launcher.png
convert icon_source.png -resize 144x144 mipmap-xxhdpi/ic_launcher.png
convert icon_source.png -resize 96x96   mipmap-xhdpi/ic_launcher.png
convert icon_source.png -resize 72x72   mipmap-hdpi/ic_launcher.png
convert icon_source.png -resize 48x48   mipmap-mdpi/ic_launcher.png
```

---

## 📦 Splash Screen (styles.xml)

```xml
<!-- res/values/styles.xml -->
<resources>
    <style name="SplashTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_background</item>
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>
```

---

## ⚙️ build.gradle (app)

```gradle
android {
    compileSdk 34

    defaultConfig {
        applicationId "com.yourname.calcpro"
        minSdk 24           // Android 7.0
        targetSdk 34        // Android 14
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}
```

---

## 📲 Copying Web Files to Android Assets

1. Copy all web files into `app/src/main/assets/`:
   ```
   cp index.html  android/app/src/main/assets/
   cp style.css   android/app/src/main/assets/
   cp app.js      android/app/src/main/assets/
   ```

2. Build → Generate Signed APK:
   - In Android Studio: **Build > Generate Signed Bundle/APK**
   - Choose APK, create/select keystore
   - Select **release** build variant
   - Click **Finish**

---

## 🚀 Run / Test

```bash
# Run on emulator
./gradlew installDebug

# Build release APK
./gradlew assembleRelease

# APK location after build:
# app/build/outputs/apk/release/app-release.apk
```

---

## ✅ Compatibility Checklist

| Feature                    | Status |
|----------------------------|--------|
| Android 7.0+ (API 24)     | ✅     |
| JavaScript Engine          | ✅     |
| localStorage               | ✅     |
| Full-screen mode           | ✅     |
| Portrait orientation lock  | ✅     |
| Offline operation          | ✅     |
| Back button support        | ✅     |
| No internet permission req | ✅     |
