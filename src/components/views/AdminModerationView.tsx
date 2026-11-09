import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  History,
  Users,
  AlertOctagon,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { Report, AuditLogEntry, User } from '../../types/index.ts';
import { INITIAL_AUDIT_LOGS, TEAM_MEMBERS } from '../../services/mockData.ts';

interface AdminModerationViewProps {
  reports: Report[];
  currentUser: User;
  onModerateReport: (reportId: string, action: 'aprobar' | 'rechazar') => void;
}

export const AdminModerationView: React.FC<AdminModerationViewProps> = ({
  reports,
  currentUser,
  onModerateReport,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'moderation' | 'audit' | 'users' | 'abuse'>(
    'moderation'
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [usersList, setUsersList] = useState<User[]>(TEAM_MEMBERS);

  const pendingModerationReports = reports.filter(
    (r) => r.status === 'pendiente_validacion' || r.status === 'sospechoso'
  );

  const handleRoleChange = (userId: string, newRole: any) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    const log: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'USER_ROLE_UPDATED',
      targetEntity: 'user',
      targetId: userId,
      details: `Rol modificado a ${newRole} por el administrador ${currentUser.name}.`,
    };
    setAuditLogs([log, ...auditLogs]);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Panel de Administración y Moderación
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Supervisión de calidad de reportes, tratamiento de evidencias sensibles,
          registro inmutable de auditoría y configuración de políticas anti-abuso.
        </p>
      </div>

      {/* Subnavegación de administración */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveAdminTab('moderation')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeAdminTab === 'moderation'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Cola de Moderación ({pendingModerationReports.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('audit')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeAdminTab === 'audit'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Registro de Auditoría Inmutable</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeAdminTab === 'users'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios y Permisos RBAC</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('abuse')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeAdminTab === 'abuse'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Protección Anti-Abuso</span>
        </button>
      </div>

      {/* TAB 1: Cola de Moderación */}
      {activeAdminTab === 'moderation' && (
        <div className="space-y-4">
          {pendingModerationReports.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">No hay reportes pendientes de moderación</p>
              <p className="text-xs mt-1">Todos los reportes actuales han sido revisados.</p>
            </div>
          ) : (
            pendingModerationReports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-300 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/30">
                      {report.domain}
                    </span>
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 capitalize">
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      Credibilidad: {report.credibilityScore}%
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{report.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{report.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onModerateReport(report.id, 'aprobar')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprobar Reporte</span>
                  </button>
                  <button
                    onClick={() => onModerateReport(report.id, 'rechazar')}
                    className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Descartar / Rechazar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Historial de Auditoría Inmutable */}
      {activeAdminTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Trazabilidad Inmutable de Acciones
            </h3>
            <span className="text-xs text-slate-500">Solo lectura para roles administrativos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                  <th className="py-3 px-4 font-semibold">Usuario</th>
                  <th className="py-3 px-4 font-semibold">Rol</th>
                  <th className="py-3 px-4 font-semibold">Acción</th>
                  <th className="py-3 px-4 font-semibold">Entidad</th>
                  <th className="py-3 px-4 font-semibold">Detalle del Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 text-slate-300">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">{log.timestamp.slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-3 px-4 text-slate-200">{log.actorName}</td>
                    <td className="py-3 px-4 capitalize text-indigo-400">{log.actorRole}</td>
                    <td className="py-3 px-4 font-bold text-amber-300">{log.action}</td>
                    <td className="py-3 px-4 uppercase text-slate-400">{log.targetEntity}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Gestión de Roles y Permisos */}
      {activeAdminTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Gestión de Usuarios, Roles y Permisos RBAC
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Control de acceso para asegurar que cada usuario acceda únicamente a las funcionalidades permitidas.
            </p>
          </div>

          <div className="divide-y divide-slate-800/80">
            {usersList.map((usr) => (
              <div key={usr.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm text-slate-200">{usr.name}</div>
                  <div className="text-xs text-slate-400">{usr.email} • Confianza: {usr.confidenceScore}%</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Rol asignado:</span>
                  <select
                    value={usr.role}
                    onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 capitalize"
                  >
                    <option value="consumidor">Consumidor</option>
                    <option value="colaborador">Colaborador</option>
                    <option value="desarrollador">Desarrollador</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Anti-Abuso y Rate Limit */}
      {activeAdminTab === 'abuse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Limitación de Frecuencia y Detección de Spam
            </h3>
            <p className="text-xs text-slate-400">
              Controles automáticos contra envíos masivos o consultas abusivas sobre la API.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Rate Limit API Consultas</div>
                  <div className="text-[11px] text-slate-400">Peticiones máximas por minuto por IP</div>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-900 px-2 py-1 rounded">
                  120 req/min
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Límite de Reportes Nuevos</div>
                  <div className="text-[11px] text-slate-400">Máximo reportes por usuario / hora</div>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-900 px-2 py-1 rounded">
                  5 reportes/h
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Detección de Contenido Duplicado</div>
                  <div className="text-[11px] text-slate-400">Prevención automática de reportes repetidos</div>
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                  Activo
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Lista de Bloqueos y Sanciones
            </h3>
            <p className="text-xs text-slate-400">
              Identificadores bloqueados temporalmente por comportamiento sospechoso.
            </p>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-rose-300">IP: 198.51.100.42</span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                    Bloqueo Temporal
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Motivo: Disparo de 45 reportes idénticos en menos de 2 minutos. Expira en 4 horas.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center italic">
                No hay más restricciones activas en este momento.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
