/**
 * Dark-Shield — Definiciones de tipos del dominio
 * Proyecto comunitario para detección, reporte y mitigación de Dark Patterns
 */

export type UserRole = 'consumidor' | 'colaborador' | 'desarrollador' | 'administrador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  confidenceScore: number; // 0 a 100 — Nivel de confianza / reputación del usuario
  avatarUrl?: string;
  permissions: string[];
  createdAt: string;
}

export type DarkPatternType =
  | 'urgencia_falsa' // Fake countdowns / "Solo quedan 2 habitaciones"
  | 'costes_ocultos' // Drip pricing / comisiones añadidas al final
  | 'confirmshaming' // Textos de culpa: "No, prefiero pagar de más"
  | 'suscripcion_trampa' // Fácil suscribirse, imposible cancelar (Roach Motel)
  | 'obstaculizacion' // Pasos innecesarios para privacidad o darse de baja
  | 'accion_forzada' // Obligar a registrarse/aceptar cookies para navegar
  | 'prueba_social_falsa' // "38 personas están viendo esto ahora" no verificable
  | 'premarcado' // Casillas premarcadas engañosas
  | 'otro';

export type ReportStatus =
  | 'borrador'
  | 'pendiente_validacion'
  | 'validado'
  | 'sospechoso'
  | 'en_moderacion'
  | 'rechazado';

export interface Evidence {
  id: string;
  reportId: string;
  fileName: string;
  fileSize: number; // en bytes
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  url: string;
  thumbnailUrl?: string;
  hasSensitiveData: boolean; // Indica si contiene datos personales o de terceros
  sanitized: boolean; // Si ha pasado el proceso de ofuscación/recorte
  status: 'aprobada' | 'pendiente' | 'rechazada';
  uploadedBy: string; // User ID
  createdAt: string;
}

export interface ValidationVote {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  vote: 'valido' | 'invalido';
  voterTrustScore: number; // Ponderación según la reputación del votante
  comment?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  domain: string; // ej: "ejemplo-tienda.com"
  url: string; // URL completa donde ocurre
  title: string;
  description: string;
  patternType: DarkPatternType;
  status: ReportStatus;
  credibilityScore: number; // 0 - 100% calculado dinámicamente
  authorId: string;
  authorName: string;
  authorTrustAtCreation: number;
  evidences: Evidence[];
  validations: ValidationVote[];
  aiAnalysis?: {
    structuredSummary: string;
    suggestedPatternType: DarkPatternType;
    anomalyDetected: boolean;
    confidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Indicio {
  id: string;
  domain: string;
  url: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export type DomainVerificationStatus = 'pendiente' | 'verificado' | 'fallido';

export interface RegisteredDomain {
  id: string;
  domain: string;
  developerId: string;
  developerEmail: string;
  verificationToken: string; // ej: "dark-shield-verify=abc123xyz"
  verificationStatus: DomainVerificationStatus;
  verificationMethod: 'dns_txt' | 'file_root';
  notificationsEnabled: boolean;
  notificationEmail?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetEntity: 'report' | 'evidence' | 'user' | 'domain' | 'sanction' | 'system';
  targetId: string;
  details: string;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
}

export interface SanctionRecord {
  id: string;
  targetType: 'ip' | 'user' | 'domain';
  targetIdentifier: string;
  reason: string;
  severity: 'advertencia' | 'bloqueo_temporal' | 'bloqueo_permanente';
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
}

