# Característica: tp6-network-diagnostics

## Objetivo
Construir la "Network Diagnostics Suite" del TP6: una suite móvil offline-first en React Native (bare CLI, APK Android) para técnicos de campo con descubrimiento de red local (LAN), cliente SNMP personalizado, diagnósticos vía SSH, identificación por código QR, reportes de instalación (fotografías + GPS + PDF) y cola de sincronización Outbox frente a un backend stub.

## Justificación / Problema
Trabajo práctico de la cátedra (TP6_Network_Diagnostics_Suite.md). Los sitios de instalación en campo tienen conectividad nula o intermitente; la aplicación debe operar sobre sockets directos TCP/UDP y sincronizar diferidamente.

## Alcance
- `tp_6/app` — Aplicación React Native (TypeScript)
- `tp_6/backend` — Backend stub de sincronización en Node.js / Express
- `tp_6/docs` — Reporte técnico y guion de demostración
- La interfaz de usuario sigue los mockups de `stitch_network_diagnostics_suite_mobile_app (1)` y las directivas de DESIGN.md

## Restricciones
- Solo Android (el entregable principal es un archivo APK; incompatible con Expo Go debido a sockets UDP/TCP crudos y cámara).
- React Native New Architecture (la versión >= 0.82 no soporta arquitectura legacy) — las dependencias nativas fueron validadas desde la Fase 0.
- Android 10+ bloquea la lectura directa de la tabla ARP: la dirección MAC se obtiene mediante la tabla SNMP `ifPhysAddress`.
- Las credenciales se almacenan exclusivamente en Android Hardware Keystore vía Keychain, nunca en texto plano ni en SQLite.
- Código fuente, identificadores y comentarios técnicos en inglés; textos y etiquetas de la interfaz de usuario en español.

## TDD y Pruebas
- Modo: off (sin configuración previa de sesión). Pruebas unitarias estrictas con Jest para módulos de dominio puro (códec BER SNMP, matemática de subredes, cola outbox); validación funcional en el resto.
- Ejecutor: `npm test` (Jest) en el directorio `tp_6/app`.

## Entrega
- Rama Git: `feat/tp6-network-diagnostics`
- Estrategia: ask-on-risk. Líneas de desarrollo superiores al umbral modular — commits organizados por unidades de trabajo atómicas sin atribución de IA.

## Tareas
- [x] T0 Spike nativo: inicialización de app bare RN + TS, instalación de dependencias nativas, verificación de compilación de APK debug.
- [x] T1 Fundaciones de UI: tokens de diseño, fuentes, kit de UI, navegación de 5 pestañas y pantalla de Inicio con datos mockeados.
- [x] T2 Almacenamiento local: esquemas DDL de SQLite, modelos y repositorios desacoplados.
- [x] T3 Cliente SNMP: códec ASN.1/BER, analizador de PDUs, cliente UDP sobre puerto 161 e integración en Detalle de Equipo.
- [x] T4 Motor de descubrimiento: cálculo de subredes IPv4, barrido concurrente de puertos TCP/UDP, escucha mDNS y pantalla de Red.
- [x] T5 Credenciales y SSH: gestión segura en Keychain, pantallas de ajustes y consola SSH con presets por fabricante.
- [x] T6 Evidencia y código QR: escáner con VisionCamera, catálogo offline de fichas técnicas y georreferenciación GPS.
- [x] T7 Asistente de instalación y reporte PDF: flujo guiado de 4 pasos, generador de PDF técnico y visor de previsualización.
- [x] T8 Sincronización: backend stub Express, trabajador Outbox con backoff exponencial, detección por NetInfo y resolución de conflictos 409.
- [x] T9 Historial de diagnósticos: consulta offline desde SQLite, agrupación cronológica y filtros por categoría.
- [x] T10 Entrega y documentación: reporte técnico de arquitectura, READMEs, APK de depuración compilado y guion de demostración.

## Criterios de Aceptación
Ver la sección 4 del plan de implementación (`implementation_plan.md`).

## Progreso / Evidencia
- T0 (2026-10-03) [commit 6371f06]: Aplicación bare RN 0.87.1 inicializada en `app`. Dependencias nativas instaladas (UDP, socket TCP, Zeroconf, fork SSH, op-sqlite, Keychain, VisionCamera v5, Barcode Scanner, Geolocation, HTML-to-PDF, PDF view, NetInfo). Exclusión de `bcprov-jdk15on` heredado en Gradle. Permisos Android incorporados (multicast, wifi, cámara, gps). APK debug compilado exitosamente (`BUILD SUCCESSFUL`, `app-debug.apk` 238.5 MB). `npm test` aprobado.
- T1 (2026-10-03) [commit 05c791f]: Fundaciones de interfaz implementadas. Tokens de diseño (colores, espaciados y tipografía de DESIGN.md), componentes UI (StatusHeader, Card, ActionButton con objetivos táctiles de 48dp+, StatusBadge, componente Icon SVG), navegación inferior de 5 pestañas (Inicio, Red, Instala., Historial, Ajustes) y pantalla de Inicio completa adaptada al mockup. Rutas conectadas en RootStack. Chequeo de tipos TypeScript (`npx tsc --noEmit`) limpio y `npm test` aprobado.
- T2 (2026-10-03) [commit fc4ef26]: Esquema SQLite y repositorios desarrollados con `@op-engineering/op-sqlite` y `MockDatabaseAdapter`. Entidades: `sites`, `devices`, `diagnostics`, `installations`, `installation_photos`, `credentials` (secretos referenciados por clave opaca) y `outbox` (cola offline con reintentos y backoff). Suite completa de pruebas unitarias (`__tests__/store.test.ts`) con 6 casos aprobados. `npx tsc --noEmit` y `npm test` 100% en verde.
- T3 (2026-10-03) [commit 533e4a6]: Códec ASN.1 BER puro en TypeScript (INTEGER, OCTET STRING, NULL, OID, SEQUENCE, Counter32/64, Gauge32, TimeTicks), analizador de PDUs SNMP v1/v2c y cliente UDP mediante `react-native-udp`. Integración de consulta de telemetría en tiempo real en `DeviceDetailScreen` con persistencia de diagnósticos en SQLite y encolado outbox. 10 pruebas unitarias aprobadas en `__tests__/snmp.test.ts`. `npm test` (3 suites, 17 pruebas) y `npx tsc --noEmit` limpios.
- T4 (2026-10-03) [commit 6f4d75a]: Módulo de direccionamiento de subredes (conversión IPv4 a entero de 32 bits, máscara CIDR, rango utilizable y generador de hosts), sondeo de puertos TCP (22, 23, 80, 443, 8291, 8080) con limitador de concurrencia, sondeo SNMP, escucha mDNS con Zeroconf y motor DiscoveryEngine. Conexión con `NetworkScreen` con barra de progreso, búsqueda/filtrado y persistencia en SQLite. 7 pruebas unitarias aprobadas en `__tests__/discovery.test.ts` (total 24 pruebas en 4 suites).
- T5 (2026-10-03) [commit 925491f]: CredentialManager almacenando contraseñas exclusivamente en Android Keystore por hardware y metadatos no sensibles en SQLite. SshService con presets por fabricante (MikroTik RouterOS, Cisco IOS, Huawei VRP, Ubiquiti EdgeOS) y ejecución de comandos en terminal. Pantallas SettingsScreen y AddCredentialScreen conectadas con validación y eliminación. SshConsoleScreen integrada con prompt en vivo, ejecución de comandos y guardado de diagnósticos en SQLite. 5 pruebas unitarias en `__tests__/credentials_ssh.test.ts` aprobadas (total 29 pruebas en 5 suites).
- T6 (2026-10-03) [commit ea7b59f]: LocationService integrando `@react-native-community/geolocation` con validación de precisión GPS y coordenadas de respaldo de campus (-32.4825, -58.2321). DeviceSheetCache con catálogo de especificaciones offline (Huawei ONT, MikroTik hAP ac2, Ubiquiti LiteBeam, Cisco SG250) y analizador robusto de códigos QR y de barras (JSON, URL con parámetros, MAC, SN, texto). Integrado en QrScannerScreen con vista previa de VisionCamera, ingreso manual, ficha técnica y navegación directa a Nueva Instalación y Detalle de Equipo. 5 pruebas unitarias en `__tests__/evidence.test.ts` aprobadas (total 34 pruebas en 6 suites).
- T7 (2026-10-03) [commit c8b0597]: PdfReportService implementando diseño HTML formal de ingeniería de telecomunicaciones con metadatos técnicos, telemetría óptica/SNR, matriz fotográfica con marcas GPS y notas técnicas, junto con exportación PDF mediante react-native-html-to-pdf. Asistente NewInstallationScreen de 4 etapas (Identificación de equipo/escaneo QR, captura de evidencia con geolocalización, notas técnicas y revisión con generación de PDF y encolado en Outbox). Pantalla InstallationsScreen con listado dinámico y PdfPreviewScreen con visor de documento, etiquetas de estado y acciones de compartir/descargar. 5 pruebas unitarias en `__tests__/installation.test.ts` aprobadas (total 39 pruebas en 7 suites).
- T8 (2026-10-03) [commit b59fad3]: Backend stub en Express (`backend/server.js`) con endpoints POST /sync/push (con simulación de conflicto 409 y procesamiento exitoso 200 OK), GET /sync/pull y GET /health. SyncWorker con sincronización por lotes de la cola outbox, backoff exponencial (2s, 4s, 8s, hasta 5 minutos), almacén de conflictos y escucha reactiva de NetInfo para auto-sincronización al reconectar. Pantalla SyncQueueScreen con aviso de modo sin conexión y SyncConflictScreen para comparación lado a lado de versiones local vs servidor con resolución ("Mantener mía" vs "Usar servidor"). 5 pruebas unitarias en `__tests__/sync.test.ts` aprobadas (total 44 pruebas en 8 suites).
- T9 (2026-10-03) [commit 7cdf703]: HistoryScreen con lectura directa de diagnósticos e instalaciones desde los repositorios SQLite con agrupación cronológica (Hoy, Ayer, Anteriores), filtros por categoría (Todos, SNMP, SSH, Instalación), barra de búsqueda en tiempo real por equipo/IP/sitio y navegación directa a los detalles del diagnóstico o a la vista previa del reporte PDF.
- T10 (2026-10-03): Reporte técnico exhaustivo redactado en `docs/TECHNICAL_REPORT.md` (códec BER ASN.1, OIDs MIB-II, seguridad por hardware Keystore, backoff exponencial Outbox, resolución de conflictos y mitigación ARP en Android 10+). Guion completo de demostración en `docs/DEMO_SCRIPT.md` (recorrido de 10 escenas del técnico en campo). Actualización de `app/README.md` y creación del `README.md` raíz. Compilación nativa verificada con `./gradlew assembleDebug` (`BUILD SUCCESSFUL in 2m 30s`, `app-debug.apk` 260 MB). 8 suites y 44 pruebas unitarias aprobadas, `npx tsc --noEmit` con 0 errores.

## Estado Final
Todas las tareas (T0 hasta T10) se encuentran totalmente implementadas, probadas, verificadas y documentadas en español. Listo para evaluación y entrega.
