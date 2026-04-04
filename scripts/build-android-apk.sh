#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"

if [[ ! -d "$ROOT_DIR/android" ]]; then
  echo "Android project not found. Run 'npm run android:add' first."
  exit 1
fi

if [[ ! -d "$SDK_DIR" ]]; then
  echo "Android SDK not found."
  echo "Expected it at: $SDK_DIR"
  echo "Install Android Studio or the Android command-line tools, then retry."
  exit 1
fi

export ANDROID_SDK_ROOT="$SDK_DIR"
export ANDROID_HOME="$SDK_DIR"

if [[ -z "${JAVA_HOME:-}" ]] && /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "JAVA_HOME is not set to a JDK 21 installation."
  echo "Install JDK 21, then retry."
  exit 1
fi

cd "$ROOT_DIR"
npx cap sync android

cd "$ROOT_DIR/android"
./gradlew assembleDebug

APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$APK_PATH" ]]; then
  echo "APK ready: $APK_PATH"
else
  echo "Gradle finished but APK was not found at: $APK_PATH"
  exit 1
fi
