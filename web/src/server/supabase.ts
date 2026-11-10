import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../lib/supabase/config';

// A fresh, unprivileged client per call; no shared user state or cookie handling.
export function createServerSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
