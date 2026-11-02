// Cliente do banco para o navegador (e SSR), usando a chave pública.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export function supabaseEnv() {
  const url = import.meta.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) {
    const missing = [
      ...(!url ? ['VITE_SUPABASE_URL'] : []),
      ...(!key ? ['VITE_SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Faltam variáveis do banco: ${missing.join(', ')}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return { url: url as string, key: key as string };
}

function createSupabaseClient() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: {
      storage: typeof window === 'undefined' ? undefined : window.localStorage,
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

/** Cliente sem sessão (anônimo), para funções públicas no servidor. */
export function createAnonClient() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
