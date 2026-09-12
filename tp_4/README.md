# AgroPulse

Demostración de agricultura de precisión desarrollada con React Native (Expo) + Supabase + Redpanda. El productor visualiza lotes en un mapa, monitorea lecturas de suelo y clima, y emite órdenes de riego con acuse de comando, todo coordinado por un worker reactivo orientado a eventos.

> **⚠️ Aviso legal / Datos simulados (RNF-10):** La humedad del suelo, las coordenadas GPS y todas las lecturas de los sensores en este proyecto son **ficticias** y tienen fines exclusivamente didácticos y académicos. No representan mediciones agrícolas reales.

---

## Prerrequisitos

| Herramienta | Versión mínima | Propósito |
|-------------|----------------|-----------|
| Node.js | 20+ | Entorno de ejecución |
| npm | 10+ | Gestor de paquetes |
| Docker + Docker Compose | Actual | Redpanda (Kafka), worker y simulador |
| Supabase CLI | Actual | Postgres local, Auth, RLS y Realtime |
| Expo CLI | Vía npx | Servidor de desarrollo móvil |

---

## Inicio Rápido

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd AgroPulse

# Instalar dependencias de la aplicación móvil
cd apps/agropulse && npm install && cd ../..

# Instalar dependencias del pipeline de eventos / worker
cd services/event-pipeline && npm install && cd ../..
```

### 2. Variables de entorno

```bash
# Copiar el archivo de ejemplo para la aplicación Expo
cp .env.example apps/agropulse/.env.local
```

Configurar `apps/agropulse/.env.local` con las claves de Supabase local:

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL de la API local de Supabase (por defecto: `http://127.0.0.1:54321`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` obtenida con `supabase status` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Clave de Google Maps para Android nativo (opcional en web) |

El worker backend requiere sus propias variables de entorno (ver `infra/docker-compose.yml` para `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`).

### 3. Iniciar Supabase

```bash
supabase start
```

Este comando levanta PostgreSQL + Auth + Realtime localmente y aplica las migraciones de `supabase/migrations/`. La semilla (`supabase/seed.sql`) carga:

- 1 organización: **Estancia Didáctica Concordia** (Concordia, Entre Ríos)
- 3 lotes: **Costa 1** (Citrus, óptimo), **Costa 2** (Citrus, bajo umbral/riego activo), **Monte A** (Soja, sin datos/sensor caído)
- Estaciones de medición y válvulas de control
- Historial inicial de lecturas, alertas y comandos de irrigación

### 4. Iniciar infraestructura (Redpanda + Worker + Simulador)

```bash
cd infra && docker compose up -d
```

Servicios iniciados:
- **Redpanda** en `localhost:19092` (broker compatible con la API de Kafka)
- **Worker del pipeline** consumiendo telemetría y aplicando comandos en la base de datos
- **Simulador IoT** publicando eventos en los tópicos `soil.moisture` y `weather.tick`

### 5. Ejecutar la aplicación móvil

```bash
cd apps/agropulse
npx expo start
```

Abrir en emulador Android, simulador iOS o en el navegador web (los polígonos del mapa requieren entorno nativo para la experiencia completa).

---

## Usuarios de Prueba

Contraseña para todas las cuentas: `AgroPulseTest!2026`

| Correo electrónico | Rol | Permisos |
|--------------------|-----|----------|
| `productor@agropulse.test` | Productor | Acceso total: ver, editar umbrales y crear lotes, emitir comandos |
| `operador@agropulse.test` | Operador | Ver lotes, emitir y cancelar comandos |
| `asesor@agropulse.test` | Asesor | Solo lectura: ver mapa, lecturas e histórico de comandos |
| `outsider@agropulse.test` | Sin rol | Sin membresía en la organización: no accede a datos |

---

## Estructura del Proyecto (Monorepo)

```text
AgroPulse/
├── apps/
│   └── agropulse/              # Aplicación móvil Expo (React Native + TypeScript)
│       ├── src/app/            # Rutas y navegación (Expo Router con tabs y modales)
│       └── src/lib/            # Lógica de dominio, semáforos, cola offline y tests
├── services/
│   └── event-pipeline/         # Servicio Node.js (consumidor Kafka, worker y simulador)
│       └── src/                # Lógica de ingesta, despacho atómico y validaciones
├── supabase/
│   ├── migrations/             # Esquema relacional, políticas RLS y funciones SQL
│   └── seed.sql                # Datos iniciales para desarrollo y evaluación
└── infra/
    └── docker-compose.yml      # Broker Redpanda + worker + simulador
```

---

## Ejecución de Pruebas

### Pruebas de la app móvil (`apps/agropulse`)

```bash
cd apps/agropulse
npm test
```

Verificaciones cubiertas:
- Cálculo y fórmula de estados del semáforo (`computePlotStatus`)
- Validación de umbrales agronómicos (`threshold_min < threshold_max`)
- Validación de comandos de irrigación y rango de duración (1 a 120 minutos)
- Idempotencia del cliente mediante `client_request_id` (UUID v4)
- Diagnóstico del estado del pipeline
- Regla de sugerencia agronómica ante humedad bajo umbral

### Pruebas del pipeline de eventos (`services/event-pipeline`)

```bash
cd services/event-pipeline
npm test
```

---

## Arquitectura del Sistema y Flujo de Datos

```mermaid
graph TB
    subgraph ClienteMovil ["📱 Cliente Móvil (apps/agropulse)"]
        UI["Interfaz Expo / React Native<br/>(Tabs: Mapa, Lotes, Alertas, Cuenta)"]
        ColaOffline["Cola Offline<br/>(AsyncStorage)"]
        UI -->|Sin conexión| ColaOffline
    end

    subgraph BaaS ["⚡ Supabase BaaS (supabase/)"]
        Auth["Supabase Auth<br/>(JWT y Sesiones)"]
        Realtime["Supabase Realtime<br/>(WebSocket CDC)"]
        Postgres[("Base de Datos PostgreSQL<br/>+ PostGIS y Políticas RLS")]
        Auth --- Postgres
        Postgres -->|Cambios en vivo| Realtime
    end

    subgraph BackendEventos ["⚙️ Ingesta y Procesamiento (services/event-pipeline)"]
        Simulador["Simulador IoT<br/>(simulator.ts)"]
        Worker["Worker de Ingesta y Comandos<br/>(worker.ts)"]
    end

    subgraph Broker ["📨 Bus de Streaming (infra/)"]
        Redpanda[("Broker Redpanda / Kafka<br/>Tópicos: soil.moisture | weather.tick")]
    end

    %% Interacciones
    UI -->|1. Inicio de sesión / Sesión persistente| Auth
    UI -->|2. Consultas y comandos REST (RLS)| Postgres
    ColaOffline -.->|Sincronización al recuperar red| Postgres
    Realtime ==>|3. Actualizaciones en tiempo real (lecturas, válvulas, alertas)| UI

    Simulador -->|Publica telemetría cada 3-8s| Redpanda
    Redpanda -->|Consume eventos| Worker
    Worker -->|Inserta lecturas y alertas (Service Role)| Postgres
    Worker -->|Ejecuta comandos pendientes (Función atómica SQL)| Postgres
```

### Decisión de Arquitectura: Sin Kafka en el Dispositivo Móvil

La aplicación móvil **nunca** se conecta directamente a Kafka o Redpanda:

1. **Supabase Realtime** notifica las modificaciones de la base de datos al dispositivo mediante WebSockets seguros.
2. El **Worker** backend es el único consumidor del broker, desacoplando la lógica de streaming de la red celular.
3. Esto previene problemas de autenticación de broker en el móvil, consumo excesivo de batería, saturación por contrapresión (*backpressure*) y dependencias de esquemas en el cliente.

---

## Flujos Principales para Demostración

### Flujo Principal (H1): Productor ordena riego en lote seco

1. Iniciar sesión con `productor@agropulse.test`.
2. En la pestaña **Mapa**, observar el lote "Costa 2" en color rojo (seco).
3. Seleccionar el lote para ver el detalle de humedad (18%) y la sugerencia agronómica.
4. Presionar el botón para abrir la válvula e indicar la duración deseada.
5. En la pantalla de **Confirmar comando**, verificar los parámetros y confirmar.
6. En menos de 5 segundos, el worker aplica el comando, la válvula pasa a estado abierta y el semáforo se actualiza vía Realtime sin recargar la pantalla.

### Acceso restringido para Asesor (H2)

1. Iniciar sesión con `asesor@agropulse.test`.
2. Visualizar los mismos lotes, lecturas y gráficos.
3. Los controles de emisión de comandos permanecen deshabilitados o inaccesibles según la política de roles.

### Operación en campo sin conectividad (H3)

1. Abrir la pantalla de **Lectura manual** sin conexión a Internet.
2. Ingresar la medición de humedad y guardar.
3. La lectura se almacena de forma segura en la cola local (`AsyncStorage`).
4. Al restablecer la conectividad, la aplicación sincroniza la lectura con la base de datos sin generar registros duplicados.

### Detección de sensor caído (H4)

1. Configurar la variable `DISABLED_STATIONS=local-monte-a` en el simulador o detener la emisión de eventos para ese lote.
2. Al transcurrir más de 15 minutos sin reportes, el lote "Monte A" pasa visualmente a estado degradado/grisáceo (*Sin datos confiables*), diferenciándose de un estado de sequedad.
