import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '../src/lib/supabase/client';
import { createServerSupabaseClient } from '../src/server/supabase';

// Next.js enforces these markers at build time; Vitest runs outside its compiler.
vi.mock('server-only', () => ({}));
vi.mock('client-only', () => ({}));
// Observe arguments while retaining the real SDK implementation.
vi.mock('@supabase/supabase-js', { spy: true });

const url = 'https://project.example.com';
const key = 'sb_publishable_unit_test_only';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Network is forbidden in unit tests');
    }),
  );
});

describe.each([
  ['navegador', createBrowserSupabaseClient],
  ['servidor', createServerSupabaseClient],
] as const)('cliente de %s', (_name, factory) => {
  it('crea un cliente real sin persistencia, renovación, sesión ni red', async () => {
    const client = factory();
    expect(client).toBeInstanceOf(SupabaseClient);
    expect(createClient).toHaveBeenCalledWith(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    expect(await client.auth.getSession()).toEqual({
      data: { session: null },
      error: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('crea instancias independientes y revalida la configuración', () => {
    expect(factory()).not.toBe(factory());
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined);
    expect(() => factory()).toThrow(
      'Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['NEXT_PUBLIC_SUPABASE_URL', undefined],
    ['NEXT_PUBLIC_SUPABASE_URL', 'invalid'],
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined],
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_secret_test_only'],
  ] as const)('rechaza %s=%s antes de invocar el SDK', (variable, value) => {
    vi.stubEnv(variable, value);
    expect(() => factory()).toThrow(variable);
    expect(createClient).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

it('importar los módulos sin configuración no crea clientes ni accede a la red', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined);
  vi.resetModules();
  const browser = await import('../src/lib/supabase/client');
  const server = await import('../src/server/supabase');
  expect(createClient).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(() => browser.createBrowserSupabaseClient()).toThrow(
    'NEXT_PUBLIC_SUPABASE_URL',
  );
  expect(() => server.createServerSupabaseClient()).toThrow(
    'NEXT_PUBLIC_SUPABASE_URL',
  );
});
