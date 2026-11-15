import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const EMPRESA_ID =
  import.meta.env.VITE_EMPRESA_ID || 'a0d8e8fc-66de-4e31-8c4d-eb4044c3c3a9';

export const WHATSAPP_LOJA =
  import.meta.env.VITE_WHATSAPP_LOJA || '5519999380929';

// Por segurança, vendas online ficam bloqueadas até definir VITE_LOJA_MODO_VITRINE=false na Vercel
export const MODO_VITRINE =
  import.meta.env.VITE_LOJA_MODO_VITRINE !== 'false';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
