export type SupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

// Read lazily, using literal property access so Next.js can inline public values.
export function getSupabaseConfig(
  environment: SupabaseEnvironment = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url) {
    throw new SupabaseConfigurationError('Falta NEXT_PUBLIC_SUPABASE_URL.');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SupabaseConfigurationError(
      'NEXT_PUBLIC_SUPABASE_URL debe ser una URL de proyecto válida.',
    );
  }

  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (
    (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new SupabaseConfigurationError(
      'NEXT_PUBLIC_SUPABASE_URL debe ser un origen HTTPS sin credenciales, ruta, consulta ni fragmento (HTTP solo en loopback local).',
    );
  }

  if (!publishableKey) {
    throw new SupabaseConfigurationError(
      'Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new SupabaseConfigurationError(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY debe ser una clave sb_publishable_; no se admiten claves secretas ni JWT heredados.',
    );
  }

  return { url: parsed.origin, publishableKey };
}
