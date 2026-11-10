import { describe, expect, it, vi } from 'vitest';
import {
  getSupabaseConfig,
  SupabaseConfigurationError,
} from '../src/lib/supabase/config';

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.example.com',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_unit_test_only',
};

describe('configuración de Supabase', () => {
  it.each([undefined, '', '   '])('rechaza URL ausente: %s', (url) => {
    expect(() =>
      getSupabaseConfig({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url }),
    ).toThrow('Falta NEXT_PUBLIC_SUPABASE_URL');
  });

  it.each([
    'not-a-url',
    '/relative',
    'ftp://project.example.com',
    'http://project.example.com',
    'https://user@project.example.com',
    'https://:password@project.example.com',
    'https://project.example.com/rest/v1',
    'https://project.example.com?key=private',
    'https://project.example.com#private',
  ])('rechaza un origen inválido sin incluirlo en el error', (url) => {
    const read = () =>
      getSupabaseConfig({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url });
    expect(read).toThrow(SupabaseConfigurationError);
    expect(read).toThrow('NEXT_PUBLIC_SUPABASE_URL');
    try {
      read();
    } catch (error) {
      expect(String(error)).not.toContain(url);
      expect(String(error)).not.toContain(
        valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      );
    }
  });

  it.each([undefined, '', '   '])('rechaza clave ausente: %s', (key) => {
    expect(() =>
      getSupabaseConfig({
        ...valid,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toThrow('Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });

  it.each([
    'sb_secret_test_only',
    'service_role',
    'eyJ.legacy.jwt',
    'sb_publishable_',
    'sb_publishable_with spaces',
  ])('rechaza claves no publicables sin revelarlas: %s', (key) => {
    try {
      getSupabaseConfig({
        ...valid,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      });
      expect.fail('La clave inválida debe rechazarse');
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseConfigurationError);
      expect((error as Error).message).toBe(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY debe ser una clave sb_publishable_; no se admiten claves secretas ni JWT heredados.',
      );
    }
  });

  it.each([
    'https://project.example.com',
    'http://localhost:54321',
    'http://127.0.0.1:54321',
    'http://[::1]:54321',
  ])('acepta un origen de proyecto o local: %s', (url) => {
    expect(
      getSupabaseConfig({ ...valid, NEXT_PUBLIC_SUPABASE_URL: ` ${url}/ ` }),
    ).toEqual({
      url,
      publishableKey: valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  });

  it('lee las variables en cada llamada y normaliza espacios', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', valid.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      ` ${valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} `,
    );
    expect(getSupabaseConfig()).toEqual({
      url: valid.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
    expect(() => getSupabaseConfig()).toThrow('Falta NEXT_PUBLIC_SUPABASE_URL');
  });
});
