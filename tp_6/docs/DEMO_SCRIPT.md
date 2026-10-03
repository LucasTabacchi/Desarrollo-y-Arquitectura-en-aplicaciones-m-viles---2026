# Network Diagnostics Suite — Demonstration & Video Recording Script

**Licenciatura en Sistemas de Información** — FCyT, Sede Concepción del Uruguay  
**Desarrollo de Aplicaciones Móviles — 2026**  
**Project:** Network Diagnostics Suite (TP6)  
**Deliverable:** Field Technician Workflow Demonstration Guide  

---

## 1. Overview & Demonstration Goals

This script guides the evaluator or demonstrator through an end-to-end field technician workflow. It directly satisfies the requirements of **Section 7 of the TP6 specification**:
1. Discovery of active equipment on the local network (LAN / mDNS).
2. Live SNMP telemetry query (uptime, system description, interface bandwidth counters).
3. Remote SSH diagnostic command execution on telecom gear.
4. QR barcode scanning for equipment inventory and spec catalog lookup.
5. Technical installation registration with GPS geocoding and labeled photo evidence.
6. Professional PDF report generation and offline preview.
7. Offline Outbox queue operation, automatic synchronization upon network recovery, and conflict handling.

---

## 2. Environment Setup

### 2.1 Start the Sync Backend Stub
In a terminal, start the minimal synchronization backend:
```bash
cd tp_6/backend
npm install
npm start
```
*Console output:* `[Sync Server] Listening on http://0.0.0.0:3000`

### 2.2 Start Metro Bundler & Launch the App
In a second terminal:
```bash
cd tp_6/app
npm start
```
Run on an Android device or emulator with network bridging:
```bash
npm run android
# Or install the generated APK directly:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. Step-by-Step Field Technician Walkthrough

### Scene 1: Dashboard & Initial Telemetry (Tab: "Inicio")
- **Action:** Open the app.
- **Visuals:** Observe the dark telemetry theme (`#071425`), status header with site picker ("Sitio: Nodo Centro"), and real-time connectivity badge ("Modo Offline / Online").
- **Key Elements:**
  - Status summary metrics (Equipos Activos: `8`, Alertas Críticas: `1`, Pendientes Sync: `2`, Enlaces Operativos: `4`).
  - Active Alert card ("Baja Potencia Óptica - Nodo Centro ONT-03").
  - Quick action buttons: **Escanear Red**, **Nueva Instalación**, **Consola SSH**, **Sincronizar**.

---

### Scene 2: Local Network Discovery (Tab: "Red")
- **Action:** Tap the **Red** tab or the "Escanear Red" action button.
- **Execution:**
  1. The top card shows the detected local IP (`192.168.1.100/24`) and gateway (`192.168.1.1`).
  2. Tap **"Iniciar Escaneo"**.
  3. The animated progress bar advances as the `DiscoveryEngine` coordinates concurrent TCP port sweeps (`22`, `80`, `443`, `8291`) and mDNS listeners.
  4. Active devices populate the list with vendor badges, IP addresses, open ports, and response latencies.
- **Talking Point:** Explain that Android 10+ restricts direct ARP table scraping, so our suite uses TCP/UDP port probing and SNMP `ifPhysAddress` queries to determine active equipment identity.

---

### Scene 3: Live SNMP Telemetry Query (Screen: "Detalle de Equipo")
- **Action:** Tap on any router/ONT in the list (e.g., `192.168.1.1 - Router Principal MikroTik`).
- **Execution:**
  1. The screen loads device metadata and opens the **SNMP Telemetría** tab.
  2. Tap **"Consultar Telemetría SNMP"**.
  3. The pure TypeScript ASN.1 / BER codec builds an SNMPv2c `GetRequest` packet and transmits it over UDP port 161.
  4. The device response updates the UI in real time:
     - **sysDescr:** `RouterOS v7.14 (hAP ac2)`
     - **sysUpTime:** `14d 06h 22m`
     - **sysName:** `RTR-CENTRO-01`
     - **ifInOctets / ifOutOctets:** Live bandwidth counters and interface status badges.
- **Talking Point:** Highlight that the SNMP BER codec is written in 100% pure TypeScript without external native C/Java SNMP libraries.

---

### Scene 4: Remote SSH Diagnostic Console (Screen: "Consola SSH")
- **Action:** Navigate to **Ajustes** $\rightarrow$ **Gestión de Credenciales** $\rightarrow$ select an equipment profile, then open **Consola SSH**.
- **Execution:**
  1. The terminal displays the connected device prompt: `admin@192.168.1.1:22`.
  2. Tap the **Vendor Presets** toolbar (e.g., MikroTik):
     - Tap `/system resource print`: The terminal renders CPU load, free memory, and firmware version.
     - Tap `/interface print stats`: Live packet and error counters appear in the terminal window.
  3. Tap **"Guardar en Diagnósticos"**: Saves the output directly into SQLite for offline reference.
- **Talking Point:** Emphasize that passwords and SSH private keys are stored exclusively in the **Android Hardware Keystore** via `react-native-keychain` and never touch SQLite.

---

### Scene 5: QR Barcode Equipment Identification (Screen: "Escaneo QR")
- **Action:** Tap the floating QR icon or access via **Nueva Instalación** $\rightarrow$ "Escanear QR".
- **Execution:**
  1. The camera opens with a neon scan target overlay.
  2. Scan a device barcode, or tap **"Ingresar Código Manualmente"** and submit: `HUAW-ONT-HG8245H-9921`.
  3. The `DeviceSheetCache` matches the device against the embedded offline catalog, rendering the full technical spec card:
     - **Modelo:** Huawei EchoLife HG8245H GPON ONT
     - **Puertos:** 4 GE + 2 POTS + Wi-Fi b/g/n
     - **Rango Óptico Óptimo:** -8 dBm a -27 dBm
  4. Tap **"Iniciar Instalación con este Equipo"**.

---

### Scene 6: Technical Installation Wizard (Tab: "Instala." $\rightarrow$ "Nueva Instalación")
- **Action:** Proceed through the 4-step wizard:
  1. **Paso 1: Identificación:** Select Sitio ("Nodo Centro") and Device ("Huawei EchoLife HG8245H"). Tap **"Siguiente: Evidencia"**.
  2. **Paso 2: Evidencia de Campo:**
     - Tap **"Capturar Gabinete"**: An evidence photo is captured and badged with GPS coordinates (`-32.4825, -58.2321`) and timestamp.
     - Tap **"Capturar Empalme Óptico"**: Captures internal fiber tray evidence.
     - Tap **"Capturar Nivel de Señal"**: Captures power meter reading.
     - Tap **"Siguiente: Notas"**.
  3. **Paso 3: Notas Técnicas:**
     - Ingresar Técnico: `Téc. M. Gómez`.
     - Potencia Óptica: `-19.4 dBm`.
     - Relación Señal/Ruido (SNR): `32.5 dB`.
     - Observaciones: `Instalación completada con conector SC/APC verde. Pérdida óptica dentro de la norma técnica.`.
     - Tap **"Siguiente: Revisión"**.
  4. **Paso 4: Revisión y Cierre:**
     - Review the structured summary card.
     - Tap **"Finalizar y Generar Reporte PDF"**.
- **Visuals:** The app compiles the report, persists the installation to SQLite, inserts a sync task into the Outbox queue, and navigates directly to the PDF preview screen.

---

### Scene 7: PDF Report Generation & Offline Preview (Screen: "Visor de Reporte PDF")
- **Action:** Inspect the generated engineering document on screen.
- **Visuals:**
  - High-density, professional white-sheet layout with telecom header branding.
  - Document verification UUID and QR stamp.
  - Equipment hardware specifications table.
  - Optical telemetry badges (Rx Power: `-19.4 dBm`, SNR: `32.5 dB`).
  - Two-column labeled photo evidence grid with geocoding overlays.
  - Status pill: **"En cola para sincronizar"** (offline).
  - Floating action buttons: **Compartir** and **Descargar**.

---

### Scene 8: Offline Outbox & Network Recovery Sync (Screen: "Cola de Sincronización")
- **Action:** Put the mobile device/emulator in Airplane Mode (Offline).
- **Execution:**
  1. Navigate to **Ajustes** $\rightarrow$ **Cola de Sincronización (Outbox)**.
  2. Observe the persistent yellow warning banner: `"Sin conexión a internet. Los cambios se guardan localmente y se sincronizarán automáticamente al reconectar."`
  3. The list shows the pending installation report with status pill `PENDIENTE`.
  4. **Restore Network Connectivity** (Disable Airplane Mode).
  5. The `@react-native-community/netinfo` listener detects network restoration.
  6. The `SyncWorker` triggers immediately:
     - The item status transitions from `PENDIENTE` $\rightarrow$ `SINCRONIZANDO` $\rightarrow$ `SINCRONIZADO` (green badge).
  7. Check the backend terminal: observe `[Sync Server] Batch sync received: 1 items processed successfully.`

---

### Scene 9: Sync Conflict Resolution (Screen: "Resolución de Conflictos")
- **Action:** Trigger a conflict simulation.
- **Execution:**
  1. Tap **"Simular Conflicto (409)"** in the sync queue screen.
  2. The server responds with HTTP 409 Conflict.
  3. The outbox item updates to `CONFLICTO` with an alert icon.
  4. Tap the item to open **SyncConflictScreen**:
     - Left column: **Versión Local** (Technician's latest field edits).
     - Right column: **Versión del Servidor** (Conflicting central database entry).
     - Tap **"Mantener mi versión"**: Forces overwrite with local data.
     - The conflict is marked resolved, and the queue successfully synchronizes.

---

### Scene 10: Diagnostic & Installation History (Tab: "Historial")
- **Action:** Tap the **Historial** tab.
- **Execution:**
  1. The screen loads all historical diagnostics and installations directly from SQLite (100% offline).
  2. Test the filter chips: **Todos**, **SNMP**, **SSH**, **Instalación**.
  3. Type in the search bar: `Huawei` or `192.168.1.1` to filter items in real time.
  4. Tap an installation record to re-open its generated PDF report preview.

---

## 4. Summary of Verification Proofs

| Feature | Demonstration Proof |
|---|---|
| LAN Discovery | Interactive sweep on subnet, active host list with open telecom ports |
| SNMP Protocol | Pure TypeScript BER codec querying MIB-II OIDs over raw UDP/161 |
| SSH Console | Vendor command presets (MikroTik, Cisco, Huawei) with live terminal execution |
| Hardware Security | Android Keystore isolation via Keychain, zero plaintext credentials in DB |
| Field Evidence | Real-time QR spec resolution, GPS coordinate geocoding, photo grid |
| PDF Reporting | Engineering white-sheet document with verification UUID generated on-device |
| Offline Outbox | Outbox pattern with exponential backoff, NetInfo auto-trigger, 409 resolution |
| Offline History | Instant SQLite query with date grouping and multi-category filtering |
