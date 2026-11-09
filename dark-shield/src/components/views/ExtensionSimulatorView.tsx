import React, { useState } from 'react';
import {
  Puzzle,
  Globe,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Report } from '../../types/index.ts';

interface ExtensionSimulatorViewProps {
  reports: Report[];
}

export const ExtensionSimulatorView: React.FC<ExtensionSimulatorViewProps> = ({ reports }) => {
  const [currentUrl, setCurrentUrl] = useState('https://flyhigh-airline.com/booking/seat-selection');
  const [showExtensionPopup, setShowExtensionPopup] = useState(true);
  const [copiedManifest, setCopiedManifest] = useState(false);

  // Extraer dominio actual simulado
  const currentDomain = currentUrl.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  const matchedReports = reports.filter((r) => r.domain.toLowerCase() === currentDomain);

  const manifestV3Json = `{
  "manifest_version": 3,
  "name": "Dark-Shield — Detector de Dark Patterns",
  "version": "1.0.0",
  "description": "Alerta en tiempo real sobre prácticas engañosas y dark patterns en sitios web.",
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["https://*/*", "http://*/*"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ]
}`;

  const copyManifest = () => {
    navigator.clipboard?.writeText(manifestV3Json);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Extensión de Navegador Dark-Shield
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          La extensión de Dark-Shield protege la navegación del usuario en tiempo real: consulta pasivamente
          la reputación del dominio visitado, presenta un resumen mediante el popup y emite alertas flotantes
          sin alterar el contenido de las páginas externas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Simulador de Navegador */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Barra superior de navegador */}
            <div className="bg-slate-900 p-3 border-b border-slate-800 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              </div>

              {/* Barra de dirección URL */}
              <div className="flex-1 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-200">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  className="w-full bg-transparent focus:outline-none"
                  placeholder="Introduce URL a probar..."
                />
              </div>

              {/* Icono de la extensión en la barra de herramientas */}
              <div className="relative">
                <button
                  onClick={() => setShowExtensionPopup(!showExtensionPopup)}
                  className={`p-1.5 rounded-lg border transition-all relative ${
                    matchedReports.length > 0
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Abrir popup de Dark-Shield"
                >
                  <Puzzle className="w-4 h-4" />
                  {matchedReports.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
                      {matchedReports.length}
                    </span>
                  )}
                </button>

                {/* Popup de la extensión */}
                {showExtensionPopup && (
                  <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-30 animate-fadeIn text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <ShieldAlert className="w-4 h-4 text-indigo-400" />
                        <span>Dark-Shield</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {currentDomain}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {matchedReports.length > 0 ? (
                        <>
                          <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/30 text-xs text-red-200 flex items-center justify-between">
                            <span>Nivel de riesgo detectado:</span>
                            <span className="font-bold font-mono text-red-400">
                              {matchedReports[0].credibilityScore}% sospechoso
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-300">
                              Reportes comunitarios activos:
                            </span>
                            {matchedReports.map((r) => (
                              <div
                                key={r.id}
                                className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px]"
                              >
                                <div className="font-semibold text-slate-200 truncate">{r.title}</div>
                                <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                                  Tipo: {r.patternType.replace('_', ' ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="p-4 text-center space-y-1 bg-slate-950 rounded-lg border border-slate-800">
                          <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                          <div className="text-xs font-semibold text-slate-200">
                            Sin reportes de dark patterns
                          </div>
                          <p className="text-[10px] text-slate-500">
                            No se han identificado prácticas engañosas confirmadas en este dominio.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selector rápido de URLs de prueba */}
            <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-500 text-[11px] whitespace-nowrap">Probar dominios:</span>
              <button
                onClick={() => setCurrentUrl('https://flyhigh-airline.com/booking/seat-selection')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] whitespace-nowrap"
              >
                flyhigh-airline.com (Costes ocultos)
              </button>
              <button
                onClick={() => setCurrentUrl('https://hotelquickdeals.com/hotel/grand-palace')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] whitespace-nowrap"
              >
                hotelquickdeals.com (Urgencia falsa)
              </button>
              <button
                onClick={() => setCurrentUrl('https://es.wikipedia.org/wiki/Portal:Comunidad')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] whitespace-nowrap"
              >
                wikipedia.org (Limpio)
              </button>
            </div>

            {/* Contenido de la página simulada con alerta flotante inyectada */}
            <div className="relative min-h-[380px] p-8 bg-slate-900/40 flex flex-col items-center justify-center text-center">
              {/* Alerta flotante inyectada por la extensión */}
              {matchedReports.length > 0 && (
                <div className="absolute top-4 right-4 max-w-sm bg-slate-900/95 border-2 border-amber-500/60 rounded-xl p-3.5 shadow-2xl text-left backdrop-blur z-20">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-300">
                          Alerta Dark-Shield
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                          {matchedReports[0].credibilityScore}% riesgo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                        {matchedReports[0].title}
                      </p>
                      <div className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold flex items-center gap-1">
                        <span>Consultar detalles en Dark-Shield</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-w-md space-y-2 opacity-60">
                <Globe className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-slate-300">Página Web Externa en Navegación</h3>
                <p className="text-xs text-slate-500 font-mono">{currentUrl}</p>
                <p className="text-xs text-slate-400">
                  La extensión intercepta de forma pasiva la URL de la pestaña activa, consulta al backend{' '}
                  <code className="text-indigo-400">GET /api/paginas/resumen</code> y despliega la alerta informativa
                  respetando la privacidad del usuario.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuración de Manifest V3 para el proyecto */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                manifest.json
              </h3>
              <button
                onClick={copyManifest}
                className="text-slate-400 hover:text-white p-1"
                title="Copiar manifest.json"
              >
                {copiedManifest ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Estructura estándar compatible con Chromium / Firefox (Manifest V3):
            </p>

            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300 overflow-x-auto max-h-80">
              {manifestV3Json}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
