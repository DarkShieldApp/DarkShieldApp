export async function checkAuthHealth(config: {
  url: string;
  publishableKey: string;
}) {
  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: config.publishableKey },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
  } catch {
    return {
      ok: false,
      message:
        'RED: no se pudo contactar con Supabase Auth (DNS, TLS, timeout o redirección).',
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      message: `CONFIGURACIÓN/ACCESO: Auth devolvió HTTP ${response.status}; revisa proyecto, clave publicable y restricciones de acceso.`,
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: `SERVICIO: Auth devolvió HTTP ${response.status}.`,
    };
  }

  // A generic HTML 200 is not proof that the Auth health endpoint responded.
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      message: 'RESPUESTA: Auth no devolvió JSON de diagnóstico válido.',
    };
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('name' in body) ||
    typeof body.name !== 'string' ||
    !body.name.toLowerCase().includes('gotrue') ||
    !('version' in body) ||
    typeof body.version !== 'string'
  ) {
    return {
      ok: false,
      message: 'RESPUESTA: contenido inesperado en el diagnóstico de Auth.',
    };
  }

  return {
    ok: true,
    message: `OK: Supabase Auth respondió HTTP ${response.status}. Solo comprueba disponibilidad de Auth; no verifica PostgreSQL, tablas, RLS ni autenticación de usuarios.`,
  };
}
