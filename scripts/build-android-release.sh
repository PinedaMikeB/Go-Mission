#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
BUILD_KIND="${1:-all}"

require_signing_value() {
  local value="$1"
  local label="$2"
  if [[ -z "$value" ]]; then
    echo "Missing signing value: $label"
    return 1
  fi
}

if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "Android project not found. Run 'npm run android:add' first."
  exit 1
fi

if [[ ! -d "$SDK_DIR" ]]; then
  echo "Android SDK not found."
  echo "Expected it at: $SDK_DIR"
  exit 1
fi

export ANDROID_SDK_ROOT="$SDK_DIR"
export ANDROID_HOME="$SDK_DIR"

if [[ -z "${JAVA_HOME:-}" ]] && /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "JAVA_HOME is not set to a JDK 21 installation."
  exit 1
fi

KEYSTORE_PROPS_FILE="$ANDROID_DIR/keystore.properties"

STORE_FILE="${GOMISSION_UPLOAD_STORE_FILE:-}"
STORE_PASSWORD="${GOMISSION_UPLOAD_STORE_PASSWORD:-}"
KEY_ALIAS="${GOMISSION_UPLOAD_KEY_ALIAS:-}"
KEY_PASSWORD="${GOMISSION_UPLOAD_KEY_PASSWORD:-}"

if [[ -f "$KEYSTORE_PROPS_FILE" ]]; then
  while IFS='=' read -r raw_key raw_value; do
    key="${raw_key//[$'\t\r\n ']}"
    value="${raw_value#"${raw_value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    [[ -z "$key" || "$key" == \#* ]] && continue
    case "$key" in
      storeFile) [[ -z "$STORE_FILE" ]] && STORE_FILE="$value" ;;
      storePassword) [[ -z "$STORE_PASSWORD" ]] && STORE_PASSWORD="$value" ;;
      keyAlias) [[ -z "$KEY_ALIAS" ]] && KEY_ALIAS="$value" ;;
      keyPassword) [[ -z "$KEY_PASSWORD" ]] && KEY_PASSWORD="$value" ;;
    esac
  done < "$KEYSTORE_PROPS_FILE"
fi

require_signing_value "$STORE_FILE" "storeFile / GOMISSION_UPLOAD_STORE_FILE"
require_signing_value "$STORE_PASSWORD" "storePassword / GOMISSION_UPLOAD_STORE_PASSWORD"
require_signing_value "$KEY_ALIAS" "keyAlias / GOMISSION_UPLOAD_KEY_ALIAS"
require_signing_value "$KEY_PASSWORD" "keyPassword / GOMISSION_UPLOAD_KEY_PASSWORD"

if [[ "$STORE_FILE" != /* ]]; then
  STORE_FILE="$ANDROID_DIR/$STORE_FILE"
fi

if [[ ! -f "$STORE_FILE" ]]; then
  echo "Keystore file not found: $STORE_FILE"
  exit 1
fi

export GOMISSION_UPLOAD_STORE_FILE="$STORE_FILE"
export GOMISSION_UPLOAD_STORE_PASSWORD="$STORE_PASSWORD"
export GOMISSION_UPLOAD_KEY_ALIAS="$KEY_ALIAS"
export GOMISSION_UPLOAD_KEY_PASSWORD="$KEY_PASSWORD"

cd "$ROOT_DIR"
npx cap sync android

cd "$ANDROID_DIR"
case "$BUILD_KIND" in
  apk)
    ./gradlew assembleRelease
    ;;
  aab)
    ./gradlew bundleRelease
    ;;
  all)
    ./gradlew assembleRelease bundleRelease
    ;;
  *)
    echo "Unknown build kind: $BUILD_KIND"
    echo "Use one of: apk, aab, all"
    exit 1
    ;;
esac

APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

if [[ "$BUILD_KIND" == "apk" || "$BUILD_KIND" == "all" ]]; then
  [[ -f "$APK_PATH" ]] && echo "Release APK ready: $APK_PATH"
fi

if [[ "$BUILD_KIND" == "aab" || "$BUILD_KIND" == "all" ]]; then
  [[ -f "$AAB_PATH" ]] && echo "Release AAB ready: $AAB_PATH"
fi
