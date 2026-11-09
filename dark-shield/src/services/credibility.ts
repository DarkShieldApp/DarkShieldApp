/**
 * Dark-Shield — Algoritmo de cálculo y actualización de credibilidad
 * Alineado con:
 * - HU-06, T5: Actualizar la credibilidad tras incorporar nueva evidencia (Ignacio José García García)
 * - HU-09, T1 / T2: Algoritmo de ponderación y función de credibilidad (Iván Pedraza Díez)
 * - HU-08, T7: Integrar valoraciones con la credibilidad (Mario Polaino)
 */

import { ValidationVote, Evidence } from '../types/index.ts';

export interface CredibilityCalculationParams {
  authorTrustScore: number; // 0 - 100
  evidences: Evidence[];
  validations: ValidationVote[];
  aiConfidenceBonus?: number; // 0 - 10
}

/**
 * Calcula el porcentaje de credibilidad (0 - 100%) de un reporte.
 *
 * Fórmula base del esqueleto:
 * - Base del autor ponderada (30% del peso)
 * - Evidencias aportadas válidas (+15% por cada evidencia, hasta un tope del 40%)
 * - Votaciones comunitarias ponderadas por el nivel de confianza de los votantes (30% del peso)
 */
export function calculateReportCredibility(params: CredibilityCalculationParams): number {
  const { authorTrustScore, evidences, validations, aiConfidenceBonus = 0 } = params;

  // 1. Componente del autor (máx 30 puntos)
  const authorComponent = Math.min(Math.max(authorTrustScore, 0), 100) * 0.3;

  // 2. Componente de evidencias adjuntas (máx 35 puntos)
  // Cada evidencia verificada o aprobada suma peso significativo
  const validEvidencesCount = evidences.filter((e) => e.status !== 'rechazada').length;
  const evidenceBonus = Math.min(validEvidencesCount * 12, 35);

  // 3. Componente de validaciones de la comunidad (ponderadas por trustScore del votante)
  let communityScore = 0;
  if (validations.length > 0) {
    let positiveWeight = 0;
    let totalWeight = 0;

    for (const val of validations) {
      const weight = Math.max(val.voterTrustScore, 10); // mínimo 10 para no ignorar nuevos usuarios
      totalWeight += weight;
      if (val.vote === 'valido') {
        positiveWeight += weight;
      }
    }

    if (totalWeight > 0) {
      const ratio = positiveWeight / totalWeight; // 0.0 a 1.0
      communityScore = ratio * 35; // hasta 35 puntos
    }
  } else {
    // Si aún no hay votos, se otorga una base neutra proporcional al autor
    communityScore = (authorTrustScore / 100) * 15;
  }

  // 4. Bonificación auxiliar de IA (máx 10 puntos)
  const aiComponent = Math.min(Math.max(aiConfidenceBonus, 0), 10);

  const total = Math.round(authorComponent + evidenceBonus + communityScore + aiComponent);

  // Clampear entre 5% y 98% (dejar margen para que nunca sea certeza absoluta, según Criterios de Aceptación HU-02)
  return Math.min(Math.max(total, 5), 98);
}
