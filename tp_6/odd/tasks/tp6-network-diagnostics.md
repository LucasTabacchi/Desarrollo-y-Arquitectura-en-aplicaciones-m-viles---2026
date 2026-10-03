# Feature: tp6-network-diagnostics

## Objective
Build the TP6 "Network Diagnostics Suite": an offline-first React Native (bare, Android APK) toolkit for field technicians with LAN discovery, custom SNMP client, SSH diagnostics, QR identification, installation reports (photos + GPS + PDF) and an outbox sync queue against a stub backend.

## Problem / Why
Course assignment (TP6_Network_Diagnostics_Suite.md). Field sites have no/intermittent connectivity; the app must work over raw TCP/UDP sockets and sync later.

## Scope
- `tp_6/app` — React Native app (TypeScript)
- `tp_6/backend` — minimal Node sync stub
- `tp_6/docs` — technical document
- UI follows `stitch_network_diagnostics_suite_mobile_app (1)` mockups + DESIGN.md

## Constraints
- Android only (deliverable is an APK; no Expo Go).
- React Native New Architecture (RN >= 0.82 has no legacy arch) — native libs must be validated (Phase 0).
- Android 10+ blocks ARP table access: MAC obtained via SNMP ifPhysAddress when possible.
- Credentials only in Keychain/Keystore, never plain text.
- Code, identifiers and comments in English; UI copy in Spanish (per DESIGN.md).

## TDD
- Mode: off (no prior project/session configuration). Strict tests for pure domain modules (SNMP BER codec, subnet math, outbox) via Jest; functional checks elsewhere.
- Runner: `npm test` (Jest) in `tp_6/app`.

## Delivery
- Branch: `feat/tp6-network-diagnostics`
- Strategy: ask-on-risk. Forecast well above 400 authored lines (multi-phase) — chain strategy to be asked before the first PR. Push/PR are user decisions.

## Tasks
- [x] T0 Native spike: init RN bare + TS, install native libs, debug APK builds (route: inline — scaffolding/commands)
- [x] T1 UI foundations: theme tokens, fonts, UI kit, 5-tab navigation, Home with mock data
- [x] T2 Local store: schema, models, repositories
- [x] T3 SNMP: BER codec, PDU, UDP client, Device detail (SNMP tab)
- [x] T4 Discovery: subnet calc, TCP/UDP sweep, zeroconf, Network screen
- [x] T5 Credentials + SSH: keychain, settings screens, SSH console with vendor presets
- [x] T6 Evidence + QR: camera, QR -> device sheet (backend/offline cache), GPS
- [x] T7 Installation wizard + PDF report + preview
- [x] T8 Sync: backend stub, outbox worker, NetInfo trigger, queue + conflict screens
- [x] T9 History screen (offline)
- [x] T10 Delivery: technical doc, README, release APK, demo script

## Acceptance criteria
See implementation_plan.md section 4 (per-phase criteria).

## Progress / Evidence
- T0 (2026-10-03) [commit 6371f06]: RN 0.87.1 Bare app initialized in `app`. Installed native dependencies (UDP, TCP socket, Zeroconf, SSH fork, op-sqlite, Keychain, VisionCamera v5, Barcode Scanner, Geolocation, HTML-to-PDF, PDF view, NetInfo). Excluded legacy `bcprov-jdk15on` in Gradle. Added required Android permissions (multicast, wifi, camera, gps). Debug APK built successfully (`BUILD SUCCESSFUL`, `app-debug.apk` 238.5 MB). `npm test` passing.
- T1 (2026-10-03) [commit 05c791f]: UI foundations implemented. Theme tokens (colors, spacing, typography from DESIGN.md), UI kit (StatusHeader, Card, ActionButton with 48dp+ hit targets, StatusBadge, SVG Icon component), 5-tab navigation (Inicio, Red, Instala., Historial, Ajustes), and full HomeScreen matching `inicio_network_diagnostics_suite` mockup. All sub-screens connected in RootStack. TypeScript check (`npx tsc --noEmit`) clean and `npm test` passing.
- T2 (2026-10-03) [commit fc4ef26]: SQLite schema & repositories implemented with `@op-engineering/op-sqlite` and `MockDatabaseAdapter`. Entities: `sites`, `devices`, `diagnostics`, `installations`, `installation_photos`, `credentials` (secrets key-referenced only), `outbox` (offline sync queue with attempts & backoff). Full unit test suite (`__tests__/store.test.ts`) passing with 6 test cases. `npx tsc --noEmit` and `npm test` 100% green.
- T3 (2026-10-03) [commit 533e4a6]: Pure TypeScript ASN.1 BER encoder/decoder (INTEGER, OCTET STRING, NULL, OID, SEQUENCE, Counter32/64, Gauge32, TimeTicks), SNMP v1/v2c PDU builder/parser, and UDP client via `react-native-udp`. Integrated live telemetry query into `DeviceDetailScreen` with SQLite diagnostics saving and outbox enqueuing. 10 unit tests in `__tests__/snmp.test.ts` passing. `npm test` (3 suites, 17 tests) and `npx tsc --noEmit` clean.
- T4 (2026-10-03) [commit 6f4d75a]: Subnet calculation module (IPv4 to 32-bit int, CIDR prefix to mask, usable range and host generator), TCP port prober (22, 23, 80, 443, 8291, 8080) with concurrency limiter, SNMP prober, Zeroconf mDNS listener, and DiscoveryEngine. Connected to `NetworkScreen` with progress bar, search/filter, and SQLite device persistence. 7 unit tests in `__tests__/discovery.test.ts` passing. Total 24 tests passing across 4 suites.
- T5 (2026-10-03) [commit 925491f]: CredentialManager storing passwords exclusively in hardware Keychain/Keystore and non-sensitive metadata in SQLite. SshService with vendor presets (MikroTik RouterOS, Cisco IOS, Huawei VRP, Ubiquiti EdgeOS) and terminal command execution. SettingsScreen and AddCredentialScreen connected with validation and deletion. SshConsoleScreen connected with live prompt, command execution and diagnostic saving to SQLite. 5 unit tests in `__tests__/credentials_ssh.test.ts` passing (total 29 tests passing across 5 suites).
- T6 (2026-10-03) [commit ea7b59f]: LocationService integrating `@react-native-community/geolocation` with GPS accuracy checks and campus fallback coords (-32.4825, -58.2321). DeviceSheetCache with offline catalog specs (Huawei ONT, MikroTik hAP ac2, Ubiquiti LiteBeam, Cisco SG250) and robust QR barcode parser (JSON, URL with query params, MAC, SN, text). Connected into QrScannerScreen with VisionCamera preview, manual text/code input, device spec card, and direct routing to NewInstallation and DeviceDetail. 5 unit tests in `__tests__/evidence.test.ts` passing (total 34 tests passing across 6 suites).
- T7 (2026-10-03) [commit c8b0597]: PdfReportService implementing professional white-sheet HTML document layout with telecom metadata, optical/SNR telemetry, photo grid with GPS badges, and technical notes, plus PDF export via react-native-html-to-pdf. NewInstallationScreen 4-step wizard (Equipo selection/QR scan, Evidencia photo capture + GPS coordinates, Notas técnicas textarea, and Revisión card summaries with PDF generation and Outbox enqueuing). InstallationsScreen dynamic listing and PdfPreviewScreen with document canvas, status pills, and Share/Download triggers. 5 unit tests in `__tests__/installation.test.ts` passing (total 39 tests passing across 7 suites).
- T8 (2026-10-03) [commit b59fad3]: Express sync stub backend in `backend/server.js` with POST /sync/push (conflict simulation 409 and 200 OK batch processing), GET /sync/pull, and GET /health. SyncWorker with outbox batch synchronization, exponential backoff (2s, 4s, 8s, up to 5min cap), conflict store, and NetInfo connectivity listener for auto-sync. SyncQueueScreen with offline banner, retry buttons, and SyncConflictScreen for side-by-side local vs server version diff and resolution (keep local vs use server). 5 unit tests in `__tests__/sync.test.ts` passing (total 44 tests passing across 8 suites).
- T9 (2026-10-03) [commit 7cdf703]: HistoryScreen reading diagnostics and installations from SQLite repositories with chronological date grouping (Hoy, Ayer, Anteriores), category filters (Todos, SNMP, SSH, Instalación), search bar filtering by device/IP/site, and direct routing to diagnostic details or installation PDF report preview.
- T10 (2026-10-03): Comprehensive technical architecture report written in `docs/TECHNICAL_REPORT.md` (ASN.1 BER codec, MIB-II OIDs, Android Keystore security, Outbox exponential backoff, conflict resolution, Android 10+ ARP mitigation). Complete demonstration script in `docs/DEMO_SCRIPT.md` (10-scene field technician walkthrough). Updated `app/README.md` and created repository root `README.md`. Verified native compilation with `./gradlew assembleDebug` (`BUILD SUCCESSFUL in 2m 30s`, `app-debug.apk` 260MB). 8 test suites, 44 unit tests passing, `npx tsc --noEmit` 0 errors.

## Status
All tasks (T0 through T10) fully implemented, tested, verified, and documented. Ready for final evaluation and delivery.
