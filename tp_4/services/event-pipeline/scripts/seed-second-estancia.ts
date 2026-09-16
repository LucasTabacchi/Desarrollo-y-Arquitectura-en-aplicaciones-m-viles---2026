import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? 'https://rzrgamaxaxxoobvvgdcx.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cmdhbWF4YXh4b29idnZnZGN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTE3MTM2MywiZXhwIjoyMTA0NzQ3MzYzfQ.hq269fBHdcx5Mi8R4WHjUnj_kOxjf2FRhxo3l3_ZkPU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function run() {
  console.log('Inserting second establishment: Estancia La Tranquera...');

  // 1. Organization
  const org = {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    name: 'Estancia La Tranquera',
  };
  const { error: orgErr } = await supabase.from('organizations').upsert(org);
  if (orgErr) console.error('Org error:', orgErr);
  else console.log('Organization inserted/updated');

  // 2. Memberships for producer, operator, advisor
  const memberships = [
    {
      organization_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      user_id: '11111111-1111-1111-1111-111111111111',
      role: 'producer',
    },
    {
      organization_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      user_id: '22222222-2222-2222-2222-222222222222',
      role: 'operator',
    },
    {
      organization_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      user_id: '33333333-3333-3333-3333-333333333333',
      role: 'advisor',
    },
  ];
  const { error: memErr } = await supabase.from('memberships').upsert(memberships, {
    onConflict: 'organization_id,user_id',
  });
  if (memErr) console.error('Membership error:', memErr);
  else console.log('Memberships inserted/updated');

  // 3. Plots
  const plots = [
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
      organization_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      name: 'Lote El Trébol',
      crop: 'Alfalfa',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-58.4050, -31.3850],
            [-58.4038, -31.3850],
            [-58.4038, -31.3838],
            [-58.4050, -31.3838],
            [-58.4050, -31.3850],
          ],
        ],
      },
      threshold_min: 24,
      threshold_max: 44,
    },
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
      organization_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      name: 'Lote Los Pinos',
      crop: 'Maíz',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-58.4035, -31.3850],
            [-58.4020, -31.3850],
            [-58.4020, -31.3838],
            [-58.4035, -31.3838],
            [-58.4035, -31.3850],
          ],
        ],
      },
      threshold_min: 28,
      threshold_max: 48,
    },
  ];
  const { error: plotErr } = await supabase.from('plots').upsert(plots);
  if (plotErr) console.error('Plot error:', plotErr);
  else console.log('Plots inserted/updated');

  // 4. Stations
  const stations = [
    {
      id: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
      plot_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
      name: 'Estación Trébol Central',
      external_id: 'local-tranquera-1',
    },
    {
      id: 'ffffffff-ffff-ffff-ffff-fffffffffff2',
      plot_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
      name: 'Estación Los Pinos',
      external_id: 'local-tranquera-2',
    },
  ];
  const { error: stErr } = await supabase.from('stations').upsert(stations);
  if (stErr) console.error('Station error:', stErr);
  else console.log('Stations inserted/updated');

  // 5. Valves
  const valves = [
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffff01',
      plot_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
      station_id: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
      name: 'Válvula Trébol 1',
      state: 'closed',
    },
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffff03',
      plot_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
      station_id: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
      name: 'Válvula Trébol 2',
      state: 'closed',
    },
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffff02',
      plot_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
      station_id: 'ffffffff-ffff-ffff-ffff-fffffffffff2',
      name: 'Válvula Pinos Principal',
      state: 'closed',
    },
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffff04',
      plot_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
      station_id: 'ffffffff-ffff-ffff-ffff-fffffffffff2',
      name: 'Válvula Pinos Secundaria',
      state: 'closed',
    },
  ];
  const { error: vErr } = await supabase.from('valves').upsert(valves);
  if (vErr) console.error('Valve error:', vErr);
  else console.log('Valves inserted/updated');

  // 6. Recent readings so plots show active telemetry & optimal moisture
  const now = Date.now();
  const readings = [];
  for (let i = 12; i >= 0; i--) {
    const time = new Date(now - i * 15 * 60 * 1000).toISOString();
    readings.push(
      {
        station_id: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
        measured_at: time,
        source: 'sensor',
        soil_moisture_pct: Number((32.5 + Math.sin(i) * 3).toFixed(1)),
        air_temperature_c: Number((23.0 + Math.cos(i) * 2).toFixed(1)),
      },
      {
        station_id: 'ffffffff-ffff-ffff-ffff-fffffffffff2',
        measured_at: time,
        source: 'sensor',
        soil_moisture_pct: Number((36.0 + Math.cos(i) * 4).toFixed(1)),
        air_temperature_c: Number((24.5 + Math.sin(i) * 2).toFixed(1)),
      },
    );
  }
  const { error: readErr } = await supabase.from('readings').upsert(readings, {
    onConflict: 'station_id,measured_at',
  });
  if (readErr) console.error('Readings error:', readErr);
  else console.log('Readings inserted successfully');

  console.log('Done! Estancia La Tranquera is fully ready.');
}

void run();
