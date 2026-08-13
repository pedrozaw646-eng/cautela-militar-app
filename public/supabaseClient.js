// Configuração do Supabase (Substitua pelas suas chaves do Supabase Cloud)
const SUPABASE_URL = "https://SUA_URL_SUPABASE.supabase.co";
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANONIMA_SUPABASE";

let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL !== "https://SUA_URL_SUPABASE.supabase.co") {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
