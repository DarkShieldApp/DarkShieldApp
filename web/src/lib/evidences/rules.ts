/**
 * Reglas de aceptación de archivos de evidencia (HU-06).
 *
 * Módulo puro: sin dependencias de Next.js ni de Supabase, utilizable en el
 * cliente (HU-06/T3) y en el servidor (HU-06/T4). Los límites son una propuesta
 * pendiente de confirmar con el PO y con el resultado de HU-06/T1.
 */

/** Tamaño máximo por archivo: 10 MiB. */
export const EVIDENCE_MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Número máximo de archivos por envío. */
export const EVIDENCE_MAX_FILES = 5;

/** Bytes iniciales que el llamador debe aportar para comprobar la firma. */
export const EVIDENCE_SIGNATURE_BYTES = 12;

export const EVIDENCE_ERROR_CODES = {
  NAME_INVALID: 'EVIDENCE_NAME_INVALID',
  EMPTY: 'EVIDENCE_EMPTY',
  TOO_LARGE: 'EVIDENCE_TOO_LARGE',
  TYPE_NOT_ALLOWED: 'EVIDENCE_TYPE_NOT_ALLOWED',
  CONTENT_MISMATCH: 'EVIDENCE_CONTENT_MISMATCH',
  TOO_MANY: 'EVIDENCE_TOO_MANY',
} as const;

export type EvidenceErrorCode =
  (typeof EVIDENCE_ERROR_CODES)[keyof typeof EVIDENCE_ERROR_CODES];

export type EvidenceKind = 'png' | 'jpeg' | 'webp' | 'pdf';

export interface EvidenceCandidate {
  /** Nombre declarado por el cliente. */
  name: string;
  /** Tipo MIME declarado por el cliente. */
  type: string;
  /** Tamaño real en bytes. */
  size: number;
  /** Primeros bytes del contenido (al menos `EVIDENCE_SIGNATURE_BYTES`). */
  head: Uint8Array;
}

export interface AcceptedEvidence {
  name: string;
  kind: EvidenceKind;
  mimeType: string;
  extension: string;
  size: number;
}

export type EvidenceFileResult =
  | { ok: true; evidence: AcceptedEvidence }
  | { ok: false; code: EvidenceErrorCode };

export interface EvidenceBatchError {
  /** Índice del archivo rechazado, o `null` si el error afecta al envío. */
  index: number | null;
  code: EvidenceErrorCode;
}

export type EvidenceBatchResult =
  | { ok: true; evidences: AcceptedEvidence[] }
  | { ok: false; errors: EvidenceBatchError[] };

interface EvidenceTypeRule {
  kind: EvidenceKind;
  mimeType: string;
  extensions: readonly string[];
  /** Fragmentos de la firma: desplazamiento y bytes esperados. */
  signature: readonly (readonly [offset: number, bytes: readonly number[]])[];
}

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));

const EVIDENCE_TYPE_RULES: readonly EvidenceTypeRule[] = [
  {
    kind: 'png',
    mimeType: 'image/png',
    extensions: ['png'],
    signature: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
  },
  {
    kind: 'jpeg',
    mimeType: 'image/jpeg',
    extensions: ['jpg', 'jpeg'],
    signature: [[0, [0xff, 0xd8, 0xff]]],
  },
  {
    kind: 'webp',
    mimeType: 'image/webp',
    extensions: ['webp'],
    signature: [
      [0, ascii('RIFF')],
      [8, ascii('WEBP')],
    ],
  },
  {
    kind: 'pdf',
    mimeType: 'application/pdf',
    extensions: ['pdf'],
    signature: [[0, ascii('%PDF-')]],
  },
];

/** Tipos permitidos (lista blanca) con su MIME y extensiones. */
export const ALLOWED_EVIDENCE_TYPES: readonly {
  kind: EvidenceKind;
  mimeType: string;
  extensions: readonly string[];
}[] = EVIDENCE_TYPE_RULES.map(({ kind, mimeType, extensions }) => ({
  kind,
  mimeType,
  extensions,
}));

/** Extensiones que no pueden aparecer en segmentos intermedios del nombre. */
const DISGUISING_EXTENSIONS = new Set([
  ...EVIDENCE_TYPE_RULES.flatMap((rule) => rule.extensions),
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'msi',
  'js',
  'vbs',
  'ps1',
  'sh',
  'jar',
  'html',
  'htm',
  'svg',
  'php',
]);

const MAX_NAME_LENGTH = 255;

// Controles C0, DEL, C1 y controles bidireccionales (p. ej. U+202E).
const FORBIDDEN_NAME_CHARS =
  /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\/\\]/u;

function isValidName(name: string): boolean {
  return (
    name.trim() !== '' &&
    name.length <= MAX_NAME_LENGTH &&
    !FORBIDDEN_NAME_CHARS.test(name) &&
    !name.startsWith('.') &&
    !name.endsWith('.') &&
    !name.endsWith(' ')
  );
}

function matchesSignature(head: Uint8Array, rule: EvidenceTypeRule): boolean {
  return rule.signature.every(([offset, bytes]) =>
    bytes.every((byte, i) => head[offset + i] === byte),
  );
}

function reject(code: EvidenceErrorCode): EvidenceFileResult {
  return { ok: false, code };
}

export function validateEvidenceFile(
  candidate: EvidenceCandidate,
): EvidenceFileResult {
  const { name, size, head } = candidate;

  if (!isValidName(name)) return reject('EVIDENCE_NAME_INVALID');

  if (!Number.isSafeInteger(size) || size <= 0) return reject('EVIDENCE_EMPTY');
  if (size > EVIDENCE_MAX_FILE_BYTES) return reject('EVIDENCE_TOO_LARGE');

  // El primer segmento es el nombre base; el último, la extensión real.
  // Los intermedios no pueden ser extensiones conocidas (factura.pdf.exe).
  const [, ...suffixes] = name.toLowerCase().split('.');
  const extension = suffixes.pop() ?? '';
  const byExtension = EVIDENCE_TYPE_RULES.find((rule) =>
    rule.extensions.includes(extension),
  );
  const mimeType = candidate.type.trim().toLowerCase();
  const byMime = EVIDENCE_TYPE_RULES.find((rule) => rule.mimeType === mimeType);
  const disguised = suffixes.some((suffix) =>
    DISGUISING_EXTENSIONS.has(suffix),
  );

  if (!byExtension || !byMime || disguised) {
    return reject('EVIDENCE_TYPE_NOT_ALLOWED');
  }

  if (byExtension !== byMime || !matchesSignature(head, byExtension)) {
    return reject('EVIDENCE_CONTENT_MISMATCH');
  }

  return {
    ok: true,
    evidence: { name, kind: byExtension.kind, mimeType, extension, size },
  };
}

export function validateEvidenceBatch(
  candidates: readonly EvidenceCandidate[],
): EvidenceBatchResult {
  if (candidates.length > EVIDENCE_MAX_FILES) {
    return { ok: false, errors: [{ index: null, code: 'EVIDENCE_TOO_MANY' }] };
  }

  const evidences: AcceptedEvidence[] = [];
  const errors: EvidenceBatchError[] = [];
  candidates.forEach((candidate, index) => {
    const result = validateEvidenceFile(candidate);
    if (result.ok) evidences.push(result.evidence);
    else errors.push({ index, code: result.code });
  });

  return errors.length === 0 ? { ok: true, evidences } : { ok: false, errors };
}
