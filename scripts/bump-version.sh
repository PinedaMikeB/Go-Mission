#!/bin/bash
# Go Mission - Pre-deploy version bump script
# This runs before Netlify deploys to ensure version is updated

# Generate timestamp
TIMESTAMP=$(date +%s)000
VERSION_DATE=$(date +%Y%m%d-%H%M)

echo "🔄 Updating build versions..."
echo "   Timestamp: $TIMESTAMP"
echo "   Version: v$VERSION_DATE"

# Update BUILD_TIMESTAMP in index.html
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/const BUILD_TIMESTAMP = '[0-9]*'/const BUILD_TIMESTAMP = '$TIMESTAMP'/" index.html
    sed -i '' "s/const CACHE_VERSION = 'v[0-9\-]*'/const CACHE_VERSION = 'v$VERSION_DATE'/" firebase-messaging-sw.js
else
    # Linux
    sed -i "s/const BUILD_TIMESTAMP = '[0-9]*'/const BUILD_TIMESTAMP = '$TIMESTAMP'/" index.html
    sed -i "s/const CACHE_VERSION = 'v[0-9\-]*'/const CACHE_VERSION = 'v$VERSION_DATE'/" firebase-messaging-sw.js
fi

echo "✅ Versions updated!"
