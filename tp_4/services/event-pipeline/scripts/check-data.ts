import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? 'https://rzrgamaxaxxoobvvgdcx.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cmdhbWF4YXh4b29idnZnZGN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTE3MTM2MywiZXhwIjoyMTA0NzQ3MzYzfQ.hq269fBHdcx5Mi8R4WHjUnj_kOxjf2FRhxo3l3_ZkPU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function check() {
  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('ORGS:', orgs);
  const { data: mems } = await supabase.from('memberships').select('*');
  console.log('MEMBERSHIPS:', mems);
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log(
    'USERS:',
    users?.users?.map((u) => ({ id: u.id, email: u.email })) ?? [],
  );
}

void check();
