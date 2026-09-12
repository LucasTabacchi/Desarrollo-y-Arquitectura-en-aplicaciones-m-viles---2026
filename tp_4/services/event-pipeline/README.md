# Pipeline de eventos local

El simulador publica telemetría en los tópicos `soil.moisture` y `weather.tick` para las tres estaciones de prueba cada 3–8 segundos. Los ticks climáticos contienen marcas de tiempo ISO UTC, identificadores externos de estación y precipitación acumulada en milímetros.

Únicamente el worker recibe la clave `SUPABASE_SERVICE_ROLE_KEY`. Se encarga de validar e insertar ambas corrientes de datos mediante upsert, registrar latidos de estado (*heartbeats*) acotados a la organización, descartar estaciones desconocidas sin interrumpir la ejecución y aplicar órdenes de riego pendientes tras 1–4 segundos.

Las restricciones de unicidad sobre `client_request_id` y el límite de un comando pendiente por válvula constituyen la frontera de idempotencia en la base de datos; adicionalmente, el worker toma condicionalmente filas en estado `pending` y deduplica en memoria.

---

## Modos de ejecución

### Opción 1: Ejecución nativa en Node.js (Recomendado sin Docker)

Desde la carpeta del servicio:

```bash
cd services/event-pipeline
npm install
npm test
npm run worker
```

Requiere configurar el archivo `.env` local copiando `.env.example`:
```bash
cp .env.example .env
```
Configurar `SUPABASE_URL` y la clave secreta `SUPABASE_SERVICE_ROLE_KEY`.

---

### Opción 2: Ejecución contenerizada con Docker Compose

Desde la raíz del repositorio:

```bash
# Instalar dependencias y compilar
npm --prefix services/event-pipeline install
npm --prefix services/event-pipeline test
npm --prefix services/event-pipeline run build

# Iniciar los servicios con Docker (Redpanda + Simulador + Worker)
cd infra
docker compose up --build -d
```

---

## Verificación y logs

Observar los registros con etiquetas `produced`, `upserted`, `heartbeat`, `applied`, `discarded` y `failed`.

Para verificar las lecturas y registros climáticos en la base de datos:
```sql
SELECT count(*) FROM public.readings WHERE source = 'sensor';
SELECT count(*) FROM public.weather_readings;
SELECT * FROM public.worker_heartbeats;
SELECT * FROM public.irrigation_commands ORDER BY created_at DESC LIMIT 10;
```
