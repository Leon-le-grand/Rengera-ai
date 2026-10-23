# Rengera AI — Android APK

## Technology decision: Capacitor wrapping the existing Next.js app

**Why not Flutter or React Native:** rewriting the app in a second stack
duplicates every screen, every fix, and every future feature in two codebases.
We already ship a mobile-quality responsive web app (same components, same
theme tokens, server actions against Supabase). Capacitor wraps that exact app
in a native Android shell, so the APK has the same design pixel-for-pixel by
construction, and bug fixes land in both platforms from one commit.

**What changes for mobile:** instead of the marketing landing page, the app
boots into onboarding (3 slides, once) → login screen → the dashboard. Handled
client-side by `mobile-entry.tsx` so the web landing page stays untouched.

## Stack

- Next.js app (existing) — served from the deployed URL inside the WebView
- Capacitor 7 — native shell, status bar, splash screen
- Java 17 + Android SDK 34 (build machine only)
- Android Studio — emulator + signing

## Files added

- `capacitor.config.ts` — app id `rw.rengera.ai`, loads the Vercel URL
- `mobile/` — onboarding screens + entry logic (rendered by the web app)
- `app/page.tsx` — routes to mobile onboarding when opened in the Capacitor
  WebView (detected via Capacitor bridge), landing page otherwise
- `docs/android/README.md` — build instructions (this file)

## Prerequisites (one time)

```bash
# Java 17
sudo apt install -y openjdk-17-jdk
# Android SDK: install Android Studio, or command line tools, then:
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

## Build the APK

```bash
bun add -d @capacitor/cli @capacitor/core @capacitor/android @capacitor/status-bar @capacitor/splash-screen
npx cap init "Rengera AI" rw.rengera.ai --web-dir=public   # one time (already configured)
npx cap add android                                        # one time
bun run build && npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Release (Play Store ready):

```bash
keytool -genkey -v -keystore rengera-release.keystore -alias rengera -keyalg RSA -keysize 2048 -validity 10000
cd android && ./gradlew assembleRelease
```

## Notes

- The WebView loads the deployed site, so server actions, Supabase and the AI
  provider all work unchanged; no secrets live in the APK.
- To make the app fully offline-first later, point Capacitor at a bundled
  static export instead — that is a larger refactor, deliberately deferred.
- Push notifications (digest/alerts) will use @capacitor/push-notifications in
  a follow-up; the bell UI already exists.
