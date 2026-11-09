/**
 * Dark-Shield — Servicio de validación
 * Contiene reglas de negocio puras para validación de evidencias, dominios y datos.
 * Diseñado para ser testeado con node:test (HU-06 T6) y compartido entre cliente y servidor.
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName?: string;
}

/**
 * Valida un archivo candidato a evidencia según tamaño, formato y nombre.
 * Esqueleto base para la tarea HU-06 T3 (cliente) y HU-06 T4 (backend).
 */
export function validateEvidenceFile(file: {
  name: string;
  size: number;
  type: string;
}): FileValidationResult {
  if (!file || !file.name) {
    return { valid: false, error: 'El archivo es inválido o no tiene nombre.' };
  }

  // 1. Verificación de tamaño
  if (file.size <= 0) {
    return { valid: false, error: 'El archivo está vacío (0 bytes).' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido de 5 MB (tamaño actual: ${sizeMb} MB).`,
    };
  }

  // 2. Verificación de tipo MIME
  const isAllowedMime = ALLOWED_EVIDENCE_MIME_TYPES.includes(
    file.type as AllowedMimeType
  );
  if (!isAllowedMime) {
    return {
      valid: false,
      error: `Formato no permitido (${file.type || 'desconocido'}). Solo se aceptan imágenes PNG, JPEG o WEBP.`,
    };
  }

  // 3. Verificación de extensión y dobles extensiones peligrosas (.php.png, .exe.jpg)
  const lowerName = file.name.toLowerCase();
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: 'La extensión del archivo no coincide con los formatos de imagen permitidos.',
    };
  }

  const dangerousExtensions = ['.exe', '.sh', '.bat', '.js', '.php', '.py', '.svg', '.html', '.htm'];
  const hasDangerousSubExt = dangerousExtensions.some((dExt) => {
    const parts = lowerName.split('.');
    return parts.length > 2 && parts.slice(1, -1).includes(dExt.replace('.', ''));
  });

  if (hasDangerousSubExt) {
    return {
      valid: false,
      error: 'El nombre del archivo contiene extensiones potencialmente peligrosas.',
    };
  }

  // Sanitización de nombre de archivo
  const sanitized = lowerName
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');

  return {
    valid: true,
    sanitizedFileName: sanitized,
  };
}

/**
 * Normaliza y valida una cadena de dominio o URL para indexación.
 */
export function normalizeDomain(input: string): { valid: boolean; domain?: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Dominio o URL no proporcionada.' };
  }

  let cleaned = input.trim().toLowerCase();

  // Eliminar protocolo si existe
  cleaned = cleaned.replace(/^https?:\/\//, '');

  // Extraer únicamente el hostname (antes de / o :)
  cleaned = cleaned.split('/')[0].split(':')[0];

  // Eliminar prefijo www. para agrupar dominios homogéneamente
  cleaned = cleaned.replace(/^www\./, '');

  // Expresión regular básica para nombres de dominio válidos con TLD
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

  if (!domainRegex.test(cleaned)) {
    return { valid: false, error: 'Formato de dominio no válido (ejemplo válido: tienda.com).' };
  }

  return { valid: true, domain: cleaned };
}
