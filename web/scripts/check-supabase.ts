import { loadEnvFile } from 'node:process';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';
import { checkAuthHealth } from './lib/auth-health.ts';

try {
  // Resolve relative to this script, independently of the caller's directory.
  loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  console.error(
    'CONFIGURACIÓN: no se pudo cargar web/.env. Comprueba el archivo y sus permisos.',
  );
  process.exit(1);
}

try {
  const config = getSupabaseConfig();
  const result = await checkAuthHealth(config);
  console.log(result.message);
  process.exitCode = result.ok ? 0 : 1;
} catch {
  // Do not log arbitrary exceptions: these could contain credentials.
  console.error(
    'CONFIGURACIÓN: revisa NEXT_PUBLIC_SUPABASE_URL (origen HTTPS, HTTP solo local) y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_).',
  );
  process.exitCode = 1;
}
