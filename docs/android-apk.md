# Android APK

This repo can now generate:

- a debug APK for quick Android device testing
- a signed release APK for direct installs outside Play Store
- a signed Android App Bundle (`.aab`) for Google Play

The existing iPhone and web install flow stays unchanged.

## What it does

- Wraps the live Go Mission site at `https://gomission.netlify.app` in a Capacitor Android app.
- Keeps browser and iPhone PWA installs unchanged.
- Detects the Android shell so the APK does not show browser-only install prompts.
- Disables the web-only service worker updater and web push flow inside the Android shell.

## Commands

Install dependencies:

```bash
npm install
```

Create the Android project once:

```bash
npm run android:add
```

Sync config changes into Android:

```bash
npm run android:sync
```

Build a debug APK:

```bash
npm run android:build:debug
```

Expected APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Recommended workflow

1. Test first on Android using the debug APK:

```bash
npm run android:build:debug
```

2. When the app feels ready, create your real upload keystore locally:

```bash
npm run android:keystore:create
```

3. Build a signed release APK for direct installs:

```bash
npm run android:build:release:apk
```

4. Build a signed Play Store bundle:

```bash
npm run android:build:release:aab
```

5. Or build both release artifacts together:

```bash
npm run android:build:release
```

Release outputs:

```text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
```

## Signing files

The release scripts read signing info from either:

- environment variables
- `android/keystore.properties`

Use the included example as a template:

```text
android/keystore.properties.example
```

`android/keystore.properties` and keystore files are gitignored and should stay private.

## Play Store recommendation

For Android testing right now, use the debug APK.

For Google Play, use the signed `.aab` and enroll in Play App Signing with a dedicated upload key. Android Developers says new apps on Google Play must publish with an Android App Bundle, and your upload artifact should be signed with your upload key before upload. Sources:

- [About Android App Bundles](https://developer.android.com/appbundle)
- [Sign your app](https://developer.android.com/guide/publishing/app-signing.html)

## Local requirements

- JDK 21
- Android SDK
- Android build tools installed through Android Studio or `sdkmanager`

On macOS, the build script automatically looks for the SDK at `~/Library/Android/sdk`.
