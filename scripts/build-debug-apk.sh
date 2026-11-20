#!/usr/bin/env bash
set -euo pipefail

echo "1/4 Building Vite web bundle..."
npm run build

echo "2/4 Syncing Capacitor Android assets..."
npx cap sync android

echo "3/4 Building Android Debug APK..."
cd android
chmod +x gradlew
./gradlew assembleDebug
cd ..

echo "4/4 Copying APK to project root (/app-debug.apk)..."
cp android/app/build/outputs/apk/debug/app-debug.apk ./app-debug.apk

echo "Done! Debug APK is ready at: $(pwd)/app-debug.apk"
