import { describe, expect, it, vi } from 'vitest';
import { checkAuthHealth } from '../scripts/lib/auth-health';

const config = {
  url: 'https://project.example.com',
  publishableKey: 'sb_publishable_unit_test_only',
};

describe('diagnóstico de Auth', () => {
  it('consulta solo el health oficial con timeout y sin seguir redirecciones', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ name: 'GoTrue', version: 'v2.test' }));
    vi.stubGlobal('fetch', request);
    const result = await checkAuthHealth(config);
    expect(request).toHaveBeenCalledExactlyOnceWith(
      `${config.url}/auth/v1/health`,
      {
        method: 'GET',
        headers: { apikey: config.publishableKey },
        signal: expect.any(AbortSignal),
        redirect: 'error',
      },
    );
    expect(result.ok).toBe(true);
    expect(result.message).toContain('no verifica PostgreSQL');
    expect(result.message).not.toContain(config.publishableKey);
  });

  it.each([401, 403, 404, 503])('distingue errores HTTP %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(config.publishableKey, { status })),
    );
    const result = await checkAuthHealth(config);
    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(status));
    expect(result.message).toContain(
      status === 401 || status === 403 ? 'CONFIGURACIÓN/ACCESO' : 'SERVICIO',
    );
    expect(result.message).not.toContain(config.publishableKey);
  });

  it.each([
    new TypeError('DNS secret detail'),
    new DOMException('private timeout detail', 'TimeoutError'),
  ])('distingue fallos de red sin imprimir la excepción', async (error) => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    const result = await checkAuthHealth(config);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('RED:');
    expect(result.message).not.toContain(error.message);
  });

  it('rechaza HTTP 200 con HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>OK</html>')),
    );
    expect(await checkAuthHealth(config)).toMatchObject({
      ok: false,
      message: expect.stringContaining('JSON'),
    });
  });

  it.each([
    null,
    [],
    'OK',
    {},
    { name: 42 },
    { name: 'Other', version: '1' },
    { name: 'GoTrue' },
    { name: 'GoTrue', version: 42 },
  ])('rechaza JSON que no identifica el servicio Auth: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
    expect(await checkAuthHealth(config)).toMatchObject({
      ok: false,
      message: expect.stringContaining('contenido inesperado'),
    });
  });
});
