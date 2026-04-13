import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zngeegxqkiimxtjtgeoz.supabase.co';
const supabaseAnonKey = 'sb_publishable_7MzJYYSC_F-93El7XXmZlA_RJELsi2Z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
