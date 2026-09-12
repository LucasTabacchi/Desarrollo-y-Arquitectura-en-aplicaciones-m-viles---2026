# 01. AgroPulse — Especificación de trabajo práctico (PRD)

**Licenciatura en Sistemas de Información**
*Desarrollo y Arquitectura en aplicaciones móviles - 2026*
*Mg. Lic. Ernesto Ledesma*

AgroPulse es una demo de práctica de React Native para agricultura de precisión: el productor o el asesor ve lotes en un mapa, humedad y clima simulados, y ordena riego con acuse de comando. No es un sistema productivo de campo.

## Documento

1. Leer alcance y fuera de alcance (evita implementar de más).
2. Implementar los requisitos Must (RF-01 a RF-12) y los RNF marcados como obligatorios.
3. Demostrar el flujo Happy Path: login → mapa con semáforo → detalle de lote → comando de riego → el mapa se actualiza.
4. Entregar según la rúbrica y la lista de entregables.

---

## 01. Kick off

| Tema | Decisión |
|---|---|
| Cliente | React Native (Expo + TypeScript + Expo Router) |
| BaaS | Supabase (Auth, Postgres, RLS, Realtime; PostGIS si se habilita) |
| Streaming | Redpanda/Kafka solo en backend; la app no consume Kafka |
| IoT | Simulado (worker que publica ticks); no hay hardware real |
| Nivel | Medio–avanzado (offline parcial, geo, eventos, RLS) |
| Datos semilla | Establecimiento ficticio en zona Concordia / Entre Ríos |

**Objetivo de aprendizaje (no negociable):** integrar una app móvil con un backend BaaS y un flujo event-driven, distinguiendo claramente la frontera *dispositivo ↔ API/Realtime ↔ broker*.

---

## 02. Problema y propuesta de valor

En campo, la decisión de regar suele tomarse con visitas puntuales o con planillas. Eso genera riego tarde, riego de más, o no ver que una estación dejó de reportar.

AgroPulse muestra, en el celular:

- Dónde está cada lote (polígono).
- Cómo está el suelo/clima (última lectura + tendencia corta).
- Qué hacer (abrir/cerrar válvula simulada) y si el comando se aplicó.

---

## 03. Objetivos de aprendizaje

Al terminar, el equipo debe poder explicar y demostrar:

| ID | Objetivo | Evidencia en la entrega |
|---|---|---|
| OA-1 | Modelar un dominio con roles y aislamiento de datos | RLS + usuarios de prueba |
| OA-2 | Mapas y geometría de lotes | Polígonos + semáforo |
| OA-3 | Series temporales en UI | Gráfico 6–24 h de humedad |
| OA-4 | Arquitectura event-driven | Topic Kafka → fila en Postgres → Realtime en la app |
| OA-5 | Comandos asíncronos | Estados `pending → applied \| failed` |
| OA-6 | Degradación por red | Cola local de lecturas manuales o reintento de comando |
| OA-7 | No acoplar el móvil al broker | Ningún cliente Kafka en React Native |

---

## 04. Alcance

### 04.1 Incluido (Must)

- Autenticación (email/password) y sesión persistente.
- Un establecimiento con varios lotes y al menos una estación por lote.
- Mapa con semáforo por lote (húmedo / óptimo / seco / sin datos).
- Detalle de lote: última lectura, umbrales, gráfico, válvulas.
- Configuración de umbral de riego por lote (humedad mínima).
- Orden de irrigación (abrir/cerrar o "regar N minutos") con acuse.
- Worker simulador de sensores + consumer hacia Supabase.
- Semilla de datos y README de arranque.

### 04.2 Incluido si hay tiempo (Should)

- Lectura manual en campo (offline → sync).
- Push o in-app alert cuando el lote pasa a "seco" o la estación no reporta.
- Campaña agrícola (fecha de siembra, cultivo: soja / maíz / citrus — a elección).
- Rol asesor (solo lectura + comentar) vs operador (comandos).

### 04.3 Fuera de alcance (Won't)

- Hardware real, LoRa, CAN bus, drones, NDVI satelital real.
- Cliente Kafka/MQTT dentro de la app.
- Pagos, marketplace de insumos, contabilidad de campaña.
- Multi-país, facturación, o app de maquinaria (eso es ScoutAI).
- IA de recomendación agronómica (se permite una regla fija: si humedad < umbral → sugerir riego).

---

## 05. Actores y permisos

| Actor | Quién es | Puede |
|---|---|---|
| Productor | Dueño o encargado del establecimiento | Ver todo, editar umbrales, emitir comandos |
| Operador de riego | Encargado de válvulas | Ver lotes, emitir y cancelar comandos; no borrar lotes |
| Asesor | Ingeniero agrónomo invitado | Ver mapa, lecturas e historial; no comandar |
| Sistema (worker) | Simulador + consumer | Escribir lecturas y estados de válvula con service role |

**Regla:** el JWT de la app nunca usa service role. El worker sí, o usa un rol `sensor_ingest` acotado.

---

## 06. Requisitos funcionales

Prioridad MoSCoW. Cada RF debe tener criterio de aceptación comprobable en la demo.

### Autenticación y contexto

| ID | Pri | Requisito | Criterio de aceptación |
|---|---|---|---|
| RF-01 | Must | Login / logout con Supabase Auth | Usuario inválido ve error; sesión sobrevive a kill de la app |
| RF-02 | Must | El usuario solo ve establecimientos a los que pertenece | Un segundo usuario de otro establecimiento no ve los lotes del primero |
| RF-03 | Must | Selector de establecimiento si hay más de uno | El mapa y las listas filtran por el establecimiento activo |

### Lotes y mapa

| ID | Pri | Requisito | Criterio de aceptación |
|---|---|---|---|
| RF-04 | Must | Listar lotes (nombre, cultivo opcional, estado semáforo) | Al menos 3 lotes en la semilla |
| RF-05 | Must | Mapa con polígono por lote y color de estado | Tap en polígono abre detalle |
| RF-06 | Must | "Estoy en el lote": mostrar si el GPS del dispositivo cae dentro del polígono (si hay permiso) | Sin permiso, la app no crashea y muestra "ubicación no disponible" |
| RF-07 | Should | Alta/edición de lote (nombre + polígono simplificado) | Puede ser dibujo de 4 vértices o GeoJSON pegado en pantalla de debug |

### Sensores y lecturas

| ID | Pri | Requisito | Criterio de aceptación |
|---|---|---|---|
| RF-08 | Must | Cada lote tiene ≥1 estación con `moisture_pct`, `temp_c`, `rain_mm` (lluvia opcional en el tick) | La semilla y el simulador respetan el esquema |
| RF-09 | Must | Detalle muestra última lectura y antigüedad (hace 12 s / hace 2 h) | Si age > 15 min el lote pasa a estado `stale` (sin datos confiables) |
| RF-10 | Must | Gráfico de humedad de las últimas 6 h (mínimo 12 puntos) | Se actualiza al llegar un tick por Realtime o pull-to-refresh |
| RF-11 | Must | Umbral de humedad mínima configurable por lote | Persiste en Postgres; el semáforo usa ese umbral |
| RF-12 | Must | Semáforo | Ver reglas en §8 |

### Irrigación

| ID | Pri | Requisito | Criterio de aceptación |
|---|---|---|---|
| RF-13 | Must | Listar válvulas del lote (nombre, estado open/closed) | Semilla con ≥1 válvula por lote |
| RF-14 | Must | Emitir comando: abrir, cerrar, o abrir por `duration_min` (1–120) | Se crea fila `irrigation_commands` en `pending` |
| RF-15 | Must | El comando transiciona a `applied` o `failed` (simulador aplica en ≤5 s) | La UI refleja el estado sin reiniciar la app (Realtime o polling ≤3 s) |
| RF-16 | Must | No se permite un segundo comando pending sobre la misma válvula | Mensaje claro; no se duplica |
| RF-17 | Should | Cancelar comando pending | Pasa a `cancelled`; el worker ignora comandos cancelados |
| RF-18 | Should | Historial de los últimos 20 comandos del lote | Fecha, actor, resultado |

### Alertas y campo

| ID | Pri | Requisito | Criterio de aceptación |
|---|---|---|---|
| RF-19 | Should | Alerta in-app: humedad < umbral | Aparece en inbox o banner del lote |
| RF-20 | Should | Alerta stale: estación sin ticks > 15 min | Distinguible de "seco" |
| RF-21 | Should | Lectura manual: humedad estimada + nota + GPS | Encola si no hay red; al volver red, upsert y no duplica (id cliente) |
| RF-22 | Could | Sugerencia agronómica de una sola regla | Texto: "Humedad bajo umbral: considerar riego" — no ML |

### Observabilidad mínima (académica)

| ID | Pri | Requisito | Criterio de aceptación |
|---|---|---|---|
| RF-23 | Must | Pantalla o sección Diagnóstico (puede ser oculta en dev) | Muestra: usuario id, establecimiento, último tick recibido, lag aparente |
| RF-24 | Must | Logs del worker visibles en consola compose | Se ve produced / consumed / upsert reading |

---

## 07. Historias de usuario (para la demo oral)

**H1 — Productor, mañana.** Abro AgroPulse, veo el mapa. El lote "Costa 2" está rojo. Entro, veo humedad 18 % (umbral 25 %). Mando "abrir 30 min". En menos de 5 s la válvula figura abierta y el comando `applied`.

**H2 — Asesor.** Me invitan al establecimiento. Veo los mismos colores. Intento regar: la app rechaza (403 o botón deshabilitado).

**H3 — Campo sin señal (Should).** Cargo una lectura manual 22 %. Al recuperar red, aparece en el historial una sola vez.

**H4 — Sensor caído.** Dejo de producir ticks para un lote. A los 15 min el lote queda gris `stale`, no rojo "seco".

---

## 08. Reglas de negocio (semáforo y comandos)

Estado del lote `plot_status` (derivado, no lo decide el cliente a ciegas; puede calcularse en vista SQL o en la app con la misma fórmula documentada):

| Estado | Color | Condición (primera que coincida) |
|---|---|---|
| stale | Gris | No hay lectura o `now - measured_at > 15 min` |
| dry | Rojo | `moisture_pct < threshold_min` |
| optimal | Verde | `threshold_min ≤ moisture_pct ≤ threshold_max` (default max 45) |
| wet | Azul | `moisture_pct > threshold_max` |

Defaults de umbral si el usuario no configuró: `min = 25`, `max = 45` (porcentajes de humedad volumétrica simulados, no calibrados a un sensor real).

**Comando:**

5. App → RPC o insert en `irrigation_commands` (`pending`).
6. Worker (o consumer de un topic `irrigation.commands`) espera 1–4 s y escribe `valves.status` + `command.status = applied`.
7. Opcional académico: 10 % de fallos aleatorios `failed` con motivo `valve_timeout` para mostrar el camino de error.

**Idempotencia:** el cliente envía `client_request_id` (UUID). El backend rechaza duplicados del mismo id.

---

## 09. Modelo de datos (mínimo)

Nombres en inglés en SQL; etiquetas en español en la UI.

```
organizations         id, name, region
memberships            user_id, organization_id, role -- producer | operator | advisor
plots                  id, organization_id, name, crop, geom polygon, threshold_min, threshold_max
stations               id, plot_id, name, lat, lng
readings               id, station_id, measured_at, moisture_pct, temp_c, rain_mm, source -- sensor|manual
valves                 id, plot_id, name, status -- open|closed
irrigation_commands    id, valve_id, requested_by, action, duration_min, status, client_request_id, created_at, applied_at
alerts                 id, plot_id, type, payload, created_at, read_at
```

**Realtime:** publicar cambios de `readings`, `valves`, `irrigation_commands` (y `alerts` si existe).

**RLS (Must):**

- `memberships` define el perímetro.
- `plots` / `stations` / `readings` / `valves` / `commands`: SELECT si existe membership.
- INSERT/UPDATE de umbrales y comandos: solo `producer` y `operator`.
- `advisor`: solo SELECT.
- `readings` con `source = sensor`: insertadas por worker, no por el rol anónimo.

**Índices:** `(station_id, measured_at DESC)` en `readings`.

**Retención académica:** el simulador puede recortar lecturas > 48 h para no inflar la DB local.

---

## 10. Eventos (Kafka / Redpanda)

La app nunca se suscribe a estos topics. Solo el worker.

| Topic | Productor | Payload mínimo | Consumer hace |
|---|---|---|---|
| `soil.moisture` | Simulador | `{ station_id, moisture_pct, temp_c, ts }` | Upsert/insert readings |
| `weather.tick` | Simulador | `{ station_id, rain_mm, ts }` | Actualiza `rain_mm` de la lectura o fila aparte |
| `irrigation.commands` | API/Edge al emitir comando (Should) | `{ command_id, valve_id, action, duration_min }` | Aplica válvula y cierra el comando |
| `valve.status` | Worker al aplicar | `{ valve_id, status, command_id, ts }` | Update valves (si el insert de reading no alcanza) |

**Contrato:** timestamps en ISO-8601 UTC. `station_id` UUID de la semilla. Si el id no existe, el consumer loggea y descarta (no crashea el loop).

**Frecuencia del simulador:** 1 tick cada 3–8 s por estación (bastante para ver Realtime en clase; documentar que en campo real sería minutos).

---

## 11. Arquitectura

```
┌─────────────────────────────────────────┐     ┌──────────────────────────────┐
│ Cliente — sin Kafka ni appid             │     │ Procesos del TP               │
│                                           │     │                                │
│  Expo App                                │     │   Worker      Simulador IoT   │
│  Auth · mapa · comandos                  │     │                                │
└──────────────┬────────────────────────────┘     └──────┬──────────────┬────────┘
               │ subscribe readings, valves               │              │
               │ JWT / REST · CRUD lotes, comandos         │              │
               │ insert readings / apply valve             │              │
               ▼                                           ▼              │
        ┌──────────────────────────┐              ┌──────────────┐        │
        │ Supabase                 │              │ HTTPS+appid  │        │
        │  Auth → Postgres + RLS   │              │ Could §21    │        │
        │        → Realtime        │              │ AgroMonitoring│       │
        └──────────────────────────┘              └──────┬───────┘        │
                     ▲                                     │ produce       │
                     │ Should: irrigation.commands          │ soil.satellite│
                     │                                      ▼              ▼
                     │                              ┌────────────────────────┐
                     └──────────────────────────────┤ Bus — solo backend     │
                                                      │   Redpanda             │
                                                      │  consume / produce      │
                                                      │  soil.moisture, GET     │
                                                      │  soil 2x/día            │
                                                      └────────────────────────┘
```

| Componente | Responsabilidad |
|---|---|
| App | UI, GPS, cola offline (Should), nunca broker |
| Supabase | Fuente de verdad, RLS, Realtime |
| Redpanda | Bus de telemetría y (opcional) comandos |
| Simulador | Genera series con ruido; puede "apagar" una estación para demo `stale` |
| Worker | Traduce eventos → SQL |

**Decisión que hay que justificar en el informe:** por qué el móvil no usa Kafka (red móvil, auth, backpressure, esquema, operación).

---

## 12. Requisitos de interfaz (pantallas)

Navegación sugerida (tabs): Mapa | Lotes | Alertas | Cuenta.

| Pantalla | Contenido mínimo |
|---|---|
| Login | Email, password, error de Auth |
| Mapa | Polígonos, leyenda de colores, FAB "mi ubicación" |
| Detalle de lote | Semáforo, última lectura, gráfico, umbrales, válvulas, CTA regar |
| Confirmar comando | Resumen (lote, válvula, duración) + `client_request_id` |
| Historial de comandos | Lista |
| Alertas | RF-19/20 |
| Cuenta | Rol, establecimiento, logout |
| Diagnóstico | RF-23 |

**Estados de UI obligatorios:** loading inicial, vacío (sin lotes), error de red, comando en vuelo.

**Accesibilidad mínima:** contraste de semáforo no solo color (ícono o texto "seco / óptimo / húmedo / sin datos").

---

## 13. Requisitos no funcionales

| ID | Pri | Categoría | Requisito |
|---|---|---|---|
| RNF-01 | Must | Stack | Expo SDK actual del curso, TypeScript strict, Expo Router |
| RNF-02 | Must | Seguridad | No secrets de service role en el binario; anon key + RLS |
| RNF-03 | Must | Tiempo | Mapa inicial usable en < 3 s con semilla local/nube de clase |
| RNF-04 | Must | Actualización | Tick visible en UI ≤ 3 s después del insert (misma red) |
| RNF-05 | Must | Errores | Fallo de comando y 401/403 no dejan spinner infinito |
| RNF-06 | Must | Repro | README con `env.example`, compose, usuarios de prueba |
| RNF-07 | Should | Offline | Comando o lectura manual no se pierde al cortar red 30 s |
| RNF-08 | Should | Tests | Tests de la fórmula del semáforo + de idempotencia de `client_request_id` (unitarios) |
| RNF-09 | Could | i18n | UI en español; código/SQL en inglés |
| RNF-10 | Must | Ética / datos | Dejar explícito que humedad y GPS de semilla son ficticios |

**Dispositivos:** iOS o Android (uno alcanza para la defensa). Responsive teléfono; tablet no es requisito.

---

## 14. Semilla de datos (sugerida)

Un establecimiento "Estancia Didáctica Concordia" (coordenadas aproximadas de la zona, no un predio real identificable).

| Lote | Cultivo (ejemplo) | Intención didáctica |
|---|---|---|
| Costa 1 | Citrus | Humedad óptima (verde) |
| Costa 2 | Citrus | Seco (rojo) para demostrar riego |
| Monte A | Soja | `stale` al apagar el simulador en la defensa |

**Usuarios:** `productor@agropulse.test`, `operador@agropulse.test`, `asesor@agropulse.test` (passwords solo en `.env.example`, nunca en el PRD público si el repo es abierto: usar placeholder).

---

## 15. Entregables

| # | Artefacto | Notas |
|---|---|---|
| 1 | App Expo | Repo o carpeta `apps/agropulse` |
| 2 | `supabase/migrations` + policies RLS | Incluir seed |
| 3 | `infra/docker-compose.yml` | Redpanda + worker + simulador |
| 4 | Informe corto (4–8 páginas) | Arquitectura, RLS, por qué no Kafka en el móvil, captura del flujo H1 |
| 5 | Video 3–5 min o defensa en clase | Recorrer H1, H2 y RF-16 |
| 6 | Este PRD cumplido | Checklist de la §17 marcado |

No se exige marca comercial ni diseño de agencia: UI clara y estados vacíos/error.

---

## 16. Glosario

| Término | Significado en este TP |
|---|---|
| Lote | Parcela agrícola con geometría |
| Estación | Punto de medición simulado (suelo/clima) |
| Semáforo | Estado derivado del lote (§8) |
| Válvula | Actuador simulado de riego |
| Tick | Evento periódico de telemetría |
| Stale | Lectura demasiado vieja para decidir riego |
| RLS | Row Level Security en Postgres/Supabase |
| BaaS | Backend as a Service (acá, Supabase) |

---

## 17. Referencias de dominio (contexto, no para implementar)

- Agricultura de precisión: decidir insumos por zona con datos geoespaciales, no receta única para todo el campo.
- Humedad de suelo y umbrales reales dependen de textura, cultivo y sensor: este TP usa números didácticos.
- En producción, el bus de eventos suele estar detrás de un concentrador LoRa/4G, no en el teléfono del productor.

---

## 18. Diagrama de secuencia

**Flujo: Productor emite comando "abrir 30 min"**

```
Productor        App Expo        Supabase        Redpanda        Worker
   │                 │                │               │              │
   │─ abrir 30 min ─▶│                │               │              │
   │                 │─ insert irrigation_commands (pending) ──▶     │
   │                 │                │               │              │
   │        alt [Ya hay pending en esa válvula]                      │
   │                 │◀── rechazo RF-16 ──│                          │
   │        [OK]                                                     │
   │                 │◀── Realtime: pending ──│                      │
   │                 │                │── irrigation.commands ──▶│   │
   │                 │                │               │── consume ──▶│
   │                 │                │◀── valve open + applied ────│
   │                 │◀── Realtime: applied ──│                      │
```

---

## 19. Caso de uso

**Actores y casos de uso principales:**

- **Productor:**
  - Lectura manual offline
  - Sincronizar polígono satelital *(extiende Could)*
  - Alta o edición de lote
  - Emitir comando de riego *(incluye)* Iniciar y cerrar sesión
  - Configurar umbrales
- **Operador:**
  - Emitir comando de riego
  - Configurar umbrales
  - Consultar mapa y semáforo
  - Ver detalle y gráfico
- **Asesor:**
  - Consultar mapa y semáforo
  - Ver detalle y gráfico
- **Worker y simulador:**
  - Publicar ticks
  - Aplicar comando
  - Ingerir suelo AgroMonitoring
