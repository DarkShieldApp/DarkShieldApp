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

export function validateEvidenceFile(
  candidate: EvidenceCandidate,
): EvidenceFileResult {
  void candidate;
  throw new Error('Not implemented');
}

export function validateEvidenceBatch(
  candidates: readonly EvidenceCandidate[],
): EvidenceBatchResult {
  void candidates;
  throw new Error('Not implemented');
}
