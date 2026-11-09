import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Send,
  HelpCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Report, User as UserModel, Indicio } from '../../types/index.ts';

interface ConsumerExplorerViewProps {
  reports: Report[];
  currentUser: UserModel;
  onVoteReport: (reportId: string, vote: 'valido' | 'invalido') => void;
  onAddIndicio: (indicio: Indicio) => void;
}

export const ConsumerExplorerView: React.FC<ConsumerExplorerViewProps> = ({
  reports,
  currentUser,
  onVoteReport,
  onAddIndicio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] || null);

  const [showIndicioModal, setShowIndicioModal] = useState(false);
  const [indicioDomain, setIndicioDomain] = useState('');
  const [indicioDesc, setIndicioDesc] = useState('');
  const [indicioToast, setIndicioToast] = useState(false);

  // Filtrado de reportes
  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.domain.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.patternType.toLowerCase().includes(q)
    );
  });

  const handleIndicioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicioDomain || !indicioDesc) return;

    const newIndicio: Indicio = {
      id: `ind-${Date.now()}`,
      domain: indicioDomain.replace(/^https?:\/\//, '').split('/')[0],
      url: indicioDomain.startsWith('http') ? indicioDomain : `https://${indicioDomain}`,
      description: indicioDesc,
      authorId: currentUser.id,
      authorName: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    onAddIndicio(newIndicio);
    setIndicioDomain('');
    setIndicioDesc('');
    setShowIndicioModal(false);
    setIndicioToast(true);
    setTimeout(() => setIndicioToast(false), 3000);
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return 'text-red-400 bg-red-950/60 border-red-500/40';
    if (score >= 50) return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    return 'text-slate-400 bg-slate-800/80 border-slate-700';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera & Buscador */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Explorador de Dominios y Dark Patterns
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Consulta reportes activos verificados por la comunidad o aporta indicios rápidos sobre páginas sospechosas.
            </p>
          </div>

          <button
            onClick={() => setShowIndicioModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>Aportar Indicio Rápido</span>
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por dominio (ej: flyhigh-airline.com, hotelquickdeals.com) o tipo de patrón..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {indicioToast && (
        <div className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-sm flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-indigo-400" />
          <span>
            <strong>Indicio registrado:</strong> La comunidad podrá contrastar la página sin necesidad de un reporte formal.
          </span>
        </div>
      )}

      {/* Grid: Lista de Reportes y Panel de Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de reportes */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Resultados encontrados: {filteredReports.length}</span>
            <span className="text-[11px] text-slate-500">Más recientes primero</span>
          </div>

          {filteredReports.map((report) => {
            const isSelected = selectedReport?.id === report.id;
            return (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/40'
                    : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-300">
                    {report.domain}
                  </span>
                  <div
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getCredibilityColor(
                      report.credibilityScore
                    )}`}
                    title="Nivel de credibilidad comunitaria"
                  >
                    {report.credibilityScore}% sospechoso
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-200 mt-1 line-clamp-1">
                  {report.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{report.description}</p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="capitalize">{report.patternType.replace('_', ' ')}</span>
                  <span>{report.evidences.length} evidencias • {report.validations.length} votos</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detalle del Reporte Seleccionado */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-indigo-400 uppercase font-semibold">
                    {selectedReport.domain}
                  </span>
                  <div
                    className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${getCredibilityColor(
                      selectedReport.credibilityScore
                    )}`}
                  >
                    Credibilidad del reporte: {selectedReport.credibilityScore}%
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mt-1">{selectedReport.title}</h2>

                <a
                  href={selectedReport.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 font-mono break-all"
                >
                  <span>{selectedReport.url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              {/* Descripción */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 leading-relaxed">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Comportamiento Descrito:
                </h4>
                {selectedReport.description}
              </div>

              {/* Evidencias vinculadas */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Evidencias Aportadas ({selectedReport.evidences.length}):
                </h4>
                {selectedReport.evidences.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-lg border border-slate-800">
                    Aún no se han adjuntado capturas a este reporte. Puedes aportarlas desde la pestaña "Reportar".
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedReport.evidences.map((evi) => (
                      <div
                        key={evi.id}
                        className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950"
                      >
                        {evi.url ? (
                          <img
                            src={evi.url}
                            alt={evi.fileName}
                            className="aspect-video w-full object-cover"
                          />
                        ) : (
                          <div className="aspect-video flex items-center justify-center bg-slate-900 text-slate-500 text-xs font-mono">
                            Captura guardada
                          </div>
                        )}
                        <div className="p-2 text-xs text-slate-300 truncate font-mono">
                          {evi.fileName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Validar o Invalidar el reporte */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">
                      Validación Comunitaria
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Tu voto se ponderará con tu nivel de confianza ({currentUser.confidenceScore}%).
                    </p>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Votos actuales: {selectedReport.validations.length}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => onVoteReport(selectedReport.id, 'valido')}
                    className="flex-1 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Confirmar como Válido</span>
                  </button>
                  <button
                    onClick={() => onVoteReport(selectedReport.id, 'invalido')}
                    className="flex-1 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>Marcar Falso Positivo</span>
                  </button>
                </div>
              </div>

              {/* Explicación de credibilidad */}
              <div className="flex items-start gap-2.5 text-[11px] text-slate-500 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso de imparcialidad:</strong> El nivel de credibilidad es una valoración comunitaria
                  dinámica calculada a partir de los votos ponderados y las evidencias aportadas. No constituye una sentencia jurídica.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
              Selecciona un reporte de la lista para ver sus detalles
            </div>
          )}
        </div>
      </div>

      {/* Modal de Indicio Rápido */}
      {showIndicioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" />
                Aportar Indicio Básico
              </h3>
              <button
                onClick={() => setShowIndicioModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Indica una sospecha sin necesidad de rellenar el formulario formal. Un colaborador lo revisará después.
            </p>

            <form onSubmit={handleIndicioSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dominio o URL de la página:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: tiendavuelos.com/pago"
                  value={indicioDomain}
                  onChange={(e) => setIndicioDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ¿Qué comportamiento has notado sospechoso?
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="ej: Me cobraron una comisión que no aparecía desglosada en ningún paso previo..."
                  value={indicioDesc}
                  onChange={(e) => setIndicioDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIndicioModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Enviar Indicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
