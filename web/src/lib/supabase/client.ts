import 'client-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

// Stateless infrastructure only. HU-11 will introduce SSR cookies and sessions.
export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
