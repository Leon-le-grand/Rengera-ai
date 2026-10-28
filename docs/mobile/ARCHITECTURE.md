# Flutter mobile architecture and status

## Current status (2026-10-24)

The native app is in `mobile/` and is the canonical Android/iOS application. Current code provides onboarding, login UI, theme, initial route selection and a bottom-navigation shell. No complete citizen chat/library API integration or offline sync protocol is implemented. Do not use this document as evidence of feature parity.

The former `web/android` Capacitor project has been removed from the current worktree. `web/capacitor.config.ts`, Capacitor packages, and some web compatibility code may remain as cleanup candidates; they do not make the Flutter app a wrapper.

## Current source layout

```text
mobile/
  pubspec.yaml
  lib/
    main.dart
    app.dart
    theme/                 # RengeraColors, typography, Material theme
    features/
      onboarding/
      auth/
      shell/
  android/
  ios/
```

The `pubspec.yaml` includes Riverpod, GoRouter, Dio, secure storage and Drift, but the source tree is the evidence for implemented behavior. Do not assume a dependency is wired into a feature.

## Proposed client structure

As the app grows, prefer feature boundaries with clear data ownership:

```text
lib/
  app/             router, app composition and global providers
  core/            API client, secure session, connectivity and shared errors
  theme/           RengeraColors, typography and tokens
  features/
    auth/
    chat/
    library/
    reader/
    settings/
  data/            Drift database, migrations and repositories
```

Add a layer only when a feature needs it. Keep platform-specific details out of domain models and do not mirror a backend service-role credential into the client.

## Design parity

Flutter tokens must use `RengeraColors` and preserve the approved canvas `#09090b`, gold `#d8b485`, 3px radius and common product language. Match web source/status/safety meaning while respecting native navigation and accessibility behavior. Current Flutter is dark-only; do not claim theme parity beyond what is implemented.

## Integration direction and remaining decisions

The user requested a dedicated V2 API shared by web and Flutter; see [`../v2/05-API-AUTH-AND-RBAC.md`](../v2/05-API-AUTH-AND-RBAC.md). Before mobile feature work, resolve session migration, refresh/expiry, request/response schemas, rate limits, pagination, retries, idempotency, offline ownership, conflict behavior and cache invalidation. The current login mismatch remains tracked as `DEC-002` in `TASKS.md`.

## Offline behavior (proposed, not implemented)

Potential offline scope: cache a selected law and its exact articles/PDF, provide local search over downloaded material, queue only explicitly approved user actions, and display stale/source status. Before building it, decide storage encryption, retention, logout cleanup, conflict resolution, update/deletion propagation and low-storage behavior. Do not promise offline AI answers without a model and grounded data strategy.

## Verification

Run `flutter analyze`, `flutter test`, and platform builds when implementing a mobile slice. Check the repository for actual test coverage and local SDK availability; report missing tooling instead of treating it as a pass.
