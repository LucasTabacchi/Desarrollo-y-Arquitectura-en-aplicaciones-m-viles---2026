const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ruzuotfopcdwuqxzcuya.supabase.co';
const supabaseAnonKey = 'sb_publishable_OJ5QlEFrSm1yE6VWyPRpfQ_xNfH-eXe';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testReset() {
  const { data, error } = await supabase.auth.resetPasswordForEmail('test@example.com', {
    redirectTo: 'exp://192.168.1.5:8081/--/reset-password',
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

testReset();
