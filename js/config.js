const SUPABASE_URL = 'https://abxarkrarbcujhthezgs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_X3RnYt8nzmayzUPhxH_1LQ_F3PKQh0q';

const supabaseClient = (typeof window !== 'undefined' && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
