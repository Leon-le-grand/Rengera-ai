# Rengera AI mobile

Flutter application for Android and iOS. This is the canonical native app; the former `web/android` Capacitor Android project is no longer present in the current worktree.

## Current implementation

The app currently includes a theme, onboarding flow, login screen, route selection and a shell with placeholder citizen screens. Chat, law-library integration, article reading, durable offline storage/sync and push notifications are planned, not shipped. Flutter dependencies for a capability do not establish that the capability is implemented.

## Local development

```bash
flutter pub get
flutter analyze
flutter run
```

Before a platform build, confirm Flutter, Android SDK/JDK or Xcode tooling and signing configuration on the machine. No production API credentials belong in the app bundle.

## Structure

```text
lib/app.dart                 router and MaterialApp
lib/main.dart                startup
lib/theme/                   shared Rengera theme and fonts
lib/features/onboarding/     onboarding flow
lib/features/auth/           login interface
lib/features/shell/          current navigation prototype
android/ and ios/            native platform projects
```

See [`docs/mobile/ARCHITECTURE.md`](../docs/mobile/ARCHITECTURE.md) for current status and proposed client contracts. The API/offline decision is still open in [`TASKS.md`](../TASKS.md).
