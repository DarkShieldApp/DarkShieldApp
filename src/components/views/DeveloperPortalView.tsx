import React, { useState } from 'react';
import {
  Globe,
  Bell,
  CheckCircle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { RegisteredDomain, User } from '../../types/index.ts';
import { INITIAL_REGISTERED_DOMAINS } from '../../services/mockData.ts';

interface DeveloperPortalViewProps {
  currentUser: User;
}

export const DeveloperPortalView: React.FC<DeveloperPortalViewProps> = ({ currentUser }) => {
  const [domains, setDomains] = useState<RegisteredDomain[]>(INITIAL_REGISTERED_DOMAINS);
  const [newDomain, setNewDomain] = useState('');
  const [notificationEmail, setNotificationEmail] = useState(currentUser.email);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleRegisterDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;

    const cleanDomain = newDomain.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
    const token = `dark-shield-verify=${Math.random().toString(36).substring(2, 12)}`;

    const registered: RegisteredDomain = {
      id: `dom-${Date.now()}`,
      domain: cleanDomain,
      developerId: currentUser.id,
      developerEmail: currentUser.email,
      verificationToken: token,
      verificationStatus: 'pendiente',
      verificationMethod: 'dns_txt',
      notificationsEnabled: true,
      notificationEmail,
      createdAt: new Date().toISOString(),
    };

    setDomains([registered, ...domains]);
    setNewDomain('');
  };

  const handleSimulateDnsCheck = (domainId: string) => {
    setVerifyingId(domainId);
    setTimeout(() => {
      setDomains((prev) =>
        prev.map((d) =>
          d.id === domainId
            ? { ...d, verificationStatus: 'verificado', verifiedAt: new Date().toISOString() }
            : d
        )
      );
      setVerifyingId(null);
    }, 1200);
  };

  const copyToken = (token: string) => {
    navigator.clipboard?.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Portal para Desarrolladores Web
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Registra tus dominios oficiales para auditar reportes recibidos, recibir notificaciones preventivas
          por correo electrónico e integrar Dark-Shield en tus herramientas mediante la API REST.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario de registro */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Globe className="w-5 h-5 text-indigo-400" />
              Añadir Nuevo Dominio
            </h2>

            <form onSubmit={handleRegisterDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre de Dominio:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: mi-tienda-online.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Correo para Alertas de Reportes:
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Generar Registro de Verificación DNS</span>
              </button>
            </form>

            <div className="pt-2 text-[11px] text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <strong>Mecanismo de verificación:</strong> Para certificar la titularidad del dominio,
              deberás añadir un registro TXT en la zona DNS de tu servidor con el token generado.
            </div>
          </div>

          {/* Documentación API para Desarrolladores */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              API REST Pública para Desarrolladores
            </h3>
            <p className="text-xs text-slate-400">
              Consulta en tiempo real el resumen de reputación y los reportes asociados a un dominio:
            </p>

            <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-emerald-300 border border-slate-800 overflow-x-auto">
              GET /api/paginas/resumen?url=ejemplo-tienda.com
            </div>

            <div className="text-[11px] text-slate-500">
              Soporta cabecera de autenticación <code className="text-indigo-300">X-API-KEY</code> y limitación de frecuencia para prevenir abusos.
            </div>
          </div>
        </div>

        {/* Lista de dominios registrados */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Dominios registrados en tu cuenta ({domains.length})</span>
          </div>

          {domains.map((dom) => (
            <div
              key={dom.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white font-mono">{dom.domain}</span>
                    {dom.verificationStatus === 'verificado' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" />
                        Pendiente Verificación DNS
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Notificaciones a: {dom.notificationEmail || dom.developerEmail}</span>
                  </div>
                </div>

                {dom.verificationStatus === 'pendiente' && (
                  <button
                    onClick={() => handleSimulateDnsCheck(dom.id)}
                    disabled={verifyingId === dom.id}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === dom.id ? 'animate-spin' : ''}`} />
                    <span>{verifyingId === dom.id ? 'Verificando DNS...' : 'Comprobar DNS'}</span>
                  </button>
                )}
              </div>

              {/* Token de verificación TXT */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Registro TXT requerido en @:</span>
                  <button
                    onClick={() => copyToken(dom.verificationToken)}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    {copiedToken === dom.verificationToken ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedToken === dom.verificationToken ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 truncate">
                  {dom.verificationToken}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
