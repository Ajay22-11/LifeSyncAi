import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zngeegxqkiimxtjtgeoz.supabase.co';
const supabaseAnonKey = 'sb_publishable_7MzJYYSC_F-93El7XXmZlA_RJELsi2Z';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('user_data').select('*').limit(1);
    if (error) {
      console.error('Connection Failed:', error.message);
      if (error.message.includes('JWT')) {
        console.log('HINT: The API key looks like a Clerk key, not a Supabase Anon key.');
      }
    } else {
      console.log('Connection Successful!', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
