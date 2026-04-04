#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
KEYSTORE_DIR="$ANDROID_DIR/keystore"
KEYSTORE_PATH="$KEYSTORE_DIR/go-mission-upload.jks"
PROPS_PATH="$ANDROID_DIR/keystore.properties"

if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "Android project not found. Run 'npm run android:add' first."
  exit 1
fi

if [[ -z "${JAVA_HOME:-}" ]] && /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "JAVA_HOME is not set to a JDK 21 installation."
  exit 1
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool not found. Install JDK 21 and try again."
  exit 1
fi

mkdir -p "$KEYSTORE_DIR"

if [[ -f "$KEYSTORE_PATH" ]]; then
  echo "Keystore already exists at: $KEYSTORE_PATH"
  exit 1
fi

read -r -p "Key alias [go-mission-upload]: " KEY_ALIAS
KEY_ALIAS="${KEY_ALIAS:-go-mission-upload}"

read -r -s -p "Keystore password: " STORE_PASSWORD
echo
if [[ -z "$STORE_PASSWORD" ]]; then
  echo "Keystore password is required."
  exit 1
fi

read -r -s -p "Key password [press Enter to reuse keystore password]: " KEY_PASSWORD
echo
KEY_PASSWORD="${KEY_PASSWORD:-$STORE_PASSWORD}"

read -r -p "Common name [Go Mission]: " DNAME_CN
read -r -p "Organization unit [Mobile]: " DNAME_OU
read -r -p "Organization [Go Mission]: " DNAME_O
read -r -p "City [Manila]: " DNAME_L
read -r -p "State/Province [Metro Manila]: " DNAME_ST
read -r -p "Country code [PH]: " DNAME_C

DNAME_CN="${DNAME_CN:-Go Mission}"
DNAME_OU="${DNAME_OU:-Mobile}"
DNAME_O="${DNAME_O:-Go Mission}"
DNAME_L="${DNAME_L:-Manila}"
DNAME_ST="${DNAME_ST:-Metro Manila}"
DNAME_C="${DNAME_C:-PH}"

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=$DNAME_CN, OU=$DNAME_OU, O=$DNAME_O, L=$DNAME_L, ST=$DNAME_ST, C=$DNAME_C"

cat > "$PROPS_PATH" <<EOF
storeFile=keystore/$(basename "$KEYSTORE_PATH")
storePassword=$STORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
EOF

echo
echo "Upload keystore created:"
echo "  $KEYSTORE_PATH"
echo
echo "Signing properties saved to:"
echo "  $PROPS_PATH"
echo
echo "Keep both files safe. This key controls future app updates."
