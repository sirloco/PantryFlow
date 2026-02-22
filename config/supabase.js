const SUPABASE_URL = "https://mnbpangqlduugqkpfahc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RoIVVbmMKNUNbiHn9y7dKw_TAgsEdvL";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);