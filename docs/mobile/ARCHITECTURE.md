# Rengera AI — Flutter mobile app (offline-first)

## Why Flutter (and why we stop shipping the Capacitor wrapper)

Capacitor was a web view: great for "looks identical", useless for true
offline. Flutter gives us real native performance, a real local database, a
real download queue, and one codebase for Android + iOS — which is the actual
goal. The web app stays as the admin/ingestion surface; the mobile app is the
citizen-facing reader. Both talk to the same Supabase + OpenCode inference
backend.

## Design parity (non-negotiable)

The Flutter app reproduces the web app's visual language exactly:

- Canvas `#09090b`, panels `#0c0c0e` / `#141417`, gold `#d8b485`,
  borders `rgba(255,255,255,0.07)`.
- Squada One wordmark, Manrope body.
- 3px radius everywhere (cards, buttons, inputs).
- Dark is default; light theme is the warm `#efede9` off-white.
- Same nav: sidebar with sections, same icons (Lucide via `lucide_icons`),
  same badges, same chat bubble language, same emergency colors.

Flutter theme is defined once in `lib/theme/rengera_theme.dart` and applied
globally; every screen uses `Theme.of(context)`, never hard-coded colors.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│ Flutter app (Android + iOS)                          │
│  UI (Material 3, dark-first)                         │
│  State: Riverpod (providers + notifiers)             │
│  Navigation: go_router (deep links + back handling)  │
│  HTTP: dio (with retry + auth interceptor)           │
│  Local DB: drift (SQLite)  ← offline store           │
│  Cache: shared_preferences (settings, tokens)         │
│  Files: path_provider + flutter_file (PDFs)          │
└──────────────────────────────────────────────────────┘
        │ HTTPS (Supabase REST + OpenCode inference)
        ▼
┌──────────────────────────────────────────────────────┐
│ Backend (unchanged)                                  │
│  Supabase Postgres + RLS + pgvector                  │
│  OpenCode inference (model + fallback)               │
└──────────────────────────────────────────────────────┘
```

## Offline model

- **Catalog (always online):** law list + metadata cached in drift (refreshed
  on launch when online, served stale when offline).
- **Content (download on demand):** full article text + multilingual summary +
  PDF stored locally per law. A law card shows "Download" until saved, then
  "Saved · read offline". A single "Download all followed" button bulk-saves.
- **Search offline:** MiniSearch over cached article text; online uses the
  Supabase RPC.
- **Writes offline:** bookmarks, feedback, deadlines go into a local outbox
  (drift) and sync on next connectivity — never lost.
- **TasteRank:** runs on-device against local usage; syncs aggregates to
  Supabase when online.

## Feature parity with the web app (v1 mobile scope)

1. Onboarding (3 slides) → login / sign-up
2. Chat with the full RAG answer (10 sections), citations tappable
3. Law library: categories → law cards → reader (document / summary / articles)
4. Multilingual summary tabs (EN/RW/FR) with cached translation
5. Verified / awaiting-review badges, integrity panel (SHA-256, coverage)
6. Notifications bell: law-change alerts + TasteRank "for you today"
7. Deadlines, bookmarks, answer feedback
8. Emergency contacts (112 / 166 / 3029)
9. Admin view (for admin accounts only): ingest + review queue
10. Settings: language, theme, account

## Project layout

```
mobile/                           # Flutter project root
├── pubspec.yaml
├── lib/
│   ├── main.dart
│   ├── app.dart                 # MaterialApp + router + theme
│   ├── theme/                   # rengera_theme.dart, colors, text styles
│   ├── core/                    # api client, storage, connectivity, env
│   ├── features/
│   │   ├── onboarding/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── library/
│   │   ├── reader/
│   │   ├── notifications/
│   │   ├── admin/
│   │   └── settings/
│   └── data/                    # drift DB, repositories, models
├── android/
└── ios/
```

## Estimated sizes

- APK (release, arm64): ~18–25 MB (Flutter engine + app, no bundled laws)
- IPA: ~22–30 MB
- Local storage per 100 downloaded laws: ~60–100 MB
- Build download on this machine: ~500 MB the first time (Flutter SDK + Android
  toolchain), then cached

## Execution plan

1. Scaffold the Flutter project + theme + router (this commit).
2. Build auth + onboarding screens.
3. Build chat + library + reader (the core).
4. Add offline storage + download queue.
5. Add notifications + admin + settings.
6. Build APK + IPA.

I'll scaffold phase 1 now and verify `flutter analyze` + `flutter build apk --debug`
on your machine. If Flutter isn't installed, I'll say so before burning time.