import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lccukfojukahwjhhkode.supabase.co';
// WARNING: Ideally this should be in an environment variable, but for this web-only environment we place it here.
const supabaseKey = 'sb_publishable_lfmHxs3QssZtz64V7V73HQ_ajIvCp_Q';

export const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID Public Key (Required for Push Notifications)
// You must generate this pair. For now, this is a placeholder. 
// Go to https://www.vapidkeys.com/ to generate one if you don't have it.
export const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'; 
