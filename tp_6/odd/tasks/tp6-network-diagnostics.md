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
- [ ] T6 Evidence + QR: camera, QR -> device sheet (backend/offline cache), GPS
- [ ] T7 Installation wizard + PDF report + preview
- [ ] T8 Sync: backend stub, outbox worker, NetInfo trigger, queue + conflict screens
- [ ] T9 History screen (offline)
- [ ] T10 Delivery: technical doc, README, release APK, demo script

## Acceptance criteria
See implementation_plan.md section 4 (per-phase criteria).

## Progress / Evidence
- T0 (2026-10-03) [commit 6371f06]: RN 0.87.1 Bare app initialized in `app`. Installed native dependencies (UDP, TCP socket, Zeroconf, SSH fork, op-sqlite, Keychain, VisionCamera v5, Barcode Scanner, Geolocation, HTML-to-PDF, PDF view, NetInfo). Excluded legacy `bcprov-jdk15on` in Gradle. Added required Android permissions (multicast, wifi, camera, gps). Debug APK built successfully (`BUILD SUCCESSFUL`, `app-debug.apk` 238.5 MB). `npm test` passing.
- T1 (2026-10-03) [commit 05c791f]: UI foundations implemented. Theme tokens (colors, spacing, typography from DESIGN.md), UI kit (StatusHeader, Card, ActionButton with 48dp+ hit targets, StatusBadge, SVG Icon component), 5-tab navigation (Inicio, Red, Instala., Historial, Ajustes), and full HomeScreen matching `inicio_network_diagnostics_suite` mockup. All sub-screens connected in RootStack. TypeScript check (`npx tsc --noEmit`) clean and `npm test` passing.
- T2 (2026-10-03) [commit fc4ef26]: SQLite schema & repositories implemented with `@op-engineering/op-sqlite` and `MockDatabaseAdapter`. Entities: `sites`, `devices`, `diagnostics`, `installations`, `installation_photos`, `credentials` (secrets key-referenced only), `outbox` (offline sync queue with attempts & backoff). Full unit test suite (`__tests__/store.test.ts`) passing with 6 test cases. `npx tsc --noEmit` and `npm test` 100% green.
- T3 (2026-10-03) [commit 533e4a6]: Pure TypeScript ASN.1 BER encoder/decoder (INTEGER, OCTET STRING, NULL, OID, SEQUENCE, Counter32/64, Gauge32, TimeTicks), SNMP v1/v2c PDU builder/parser, and UDP client via `react-native-udp`. Integrated live telemetry query into `DeviceDetailScreen` with SQLite diagnostics saving and outbox enqueuing. 10 unit tests in `__tests__/snmp.test.ts` passing. `npm test` (3 suites, 17 tests) and `npx tsc --noEmit` clean.
- T4 (2026-10-03) [commit 6f4d75a]: Subnet calculation module (IPv4 to 32-bit int, CIDR prefix to mask, usable range and host generator), TCP port prober (22, 23, 80, 443, 8291, 8080) with concurrency limiter, SNMP prober, Zeroconf mDNS listener, and DiscoveryEngine. Connected to `NetworkScreen` with progress bar, search/filter, and SQLite device persistence. 7 unit tests in `__tests__/discovery.test.ts` passing. Total 24 tests passing across 4 suites.
- T5 (2026-10-03) [commit 925491f]: CredentialManager storing passwords exclusively in hardware Keychain/Keystore and non-sensitive metadata in SQLite. SshService with vendor presets (MikroTik RouterOS, Cisco IOS, Huawei VRP, Ubiquiti EdgeOS) and terminal command execution. SettingsScreen and AddCredentialScreen connected with validation and deletion. SshConsoleScreen connected with live prompt, command execution and diagnostic saving to SQLite. 5 unit tests in `__tests__/credentials_ssh.test.ts` passing (total 29 tests passing across 5 suites).

## Next step
T6 Evidence + QR: camera, QR -> device sheet (backend/offline cache), GPS.
