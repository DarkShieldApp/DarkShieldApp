import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  FilePlus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { User, Report, DarkPatternType, Evidence } from '../../types/index.ts';
import { validateEvidenceFile, FileValidationResult } from '../../services/validation.ts';
import { calculateReportCredibility } from '../../services/credibility.ts';

interface ContributorWorkspaceViewProps {
  currentUser: User;
  reports: Report[];
  onAddReport: (report: Report) => void;
  onAddEvidenceToReport: (reportId: string, evidence: Evidence) => void;
}

export const ContributorWorkspaceView: React.FC<ContributorWorkspaceViewProps> = ({
  currentUser,
  reports,
  onAddReport,
  onAddEvidenceToReport,
}) => {
  // Estado para creación de reporte
  const [targetDomain, setTargetDomain] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [patternType, setPatternType] = useState<DarkPatternType>('urgencia_falsa');

  // Estado para subida y validación de evidencias
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const [stagedFile, setStagedFile] = useState<{
    file: File;
    previewUrl: string;
    hasSensitiveData: boolean;
  } | null>(null);
  const [hasSensitiveData, setHasSensitiveData] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  // Validación de archivo de evidencia
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validateEvidenceFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    setValidationResult(result);

    if (result.valid) {
      const previewUrl = URL.createObjectURL(file);
      setStagedFile({
        file,
        previewUrl,
        hasSensitiveData,
      });
    } else {
      setStagedFile(null);
    }
  };

  const handleConfirmUpload = () => {
    if (!stagedFile || !selectedReportId) return;

    const newEvidence: Evidence = {
      id: `evi-${Date.now()}`,
      reportId: selectedReportId,
      fileName: stagedFile.file.name,
      fileSize: stagedFile.file.size,
      mimeType: stagedFile.file.type as any,
      url: stagedFile.previewUrl,
      hasSensitiveData,
      sanitized: hasSensitiveData ? true : false,
      status: 'aprobada',
      uploadedBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    onAddEvidenceToReport(selectedReportId, newEvidence);
    setStagedFile(null);
    setValidationResult(null);
    setUploadSuccessToast(true);
    setTimeout(() => setUploadSuccessToast(false), 3500);
  };

  const projectedCredibility = selectedReport
    ? calculateReportCredibility({
        authorTrustScore: selectedReport.authorTrustAtCreation,
        evidences: stagedFile
          ? [
              ...selectedReport.evidences,
              {
                id: 'mock',
                fileName: stagedFile.file.name,
                fileSize: stagedFile.file.size,
                mimeType: stagedFile.file.type as any,
                url: '',
                status: 'aprobada',
                hasSensitiveData: false,
                sanitized: true,
                uploadedBy: currentUser.id,
                createdAt: '',
              } as any,
            ]
          : selectedReport.evidences,
        validations: selectedReport.validations,
      })
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Crear Reporte y Adjuntar Evidencias
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Contribuye informando a la comunidad sobre prácticas de diseño engañosas. Puedes dar de alta
            un nuevo reporte o adjuntar capturas de pantalla a reportes existentes para elevar su nivel de credibilidad.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
            {currentUser.name[0]}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
            <div className="text-[11px] text-slate-400">
              Nivel de Confianza: <span className="text-indigo-400 font-bold">{currentUser.confidenceScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {uploadSuccessToast && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>¡Evidencia adjuntada con éxito! La credibilidad comunitaria ha sido actualizada.</span>
        </div>
      )}

      {reportSuccessToast && (
        <div className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-sm flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-indigo-400" />
          <span>¡Reporte registrado correctamente! Ya está disponible para la consulta y validación comunitaria.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA: Formulario de Creación de Reportes */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-indigo-400" />
                Nuevo Reporte de Dark Pattern
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Rellena la información básica sobre el sitio web y el tipo de patrón identificado.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Dominio o Web afectada:
              </label>
              <input
                type="text"
                placeholder="ej: ejemplo-tienda.com"
                value={targetDomain}
                onChange={(e) => setTargetDomain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                URL específica del dark pattern:
              </label>
              <input
                type="text"
                placeholder="https://ejemplo-tienda.com/checkout/step-2"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo de Dark Pattern:
              </label>
              <select
                value={patternType}
                onChange={(e) => setPatternType(e.target.value as DarkPatternType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="urgencia_falsa">Urgencia Falsa (Relojes ficticios / escasez inventada)</option>
                <option value="costes_ocultos">Costes Ocultos (Drip pricing / comisiones añadidas al final)</option>
                <option value="confirmshaming">Confirmshaming (Culpa emocional para evitar cancelar)</option>
                <option value="suscripcion_trampa">Suscripción Trampa (Fácil entrar, imposible salir)</option>
                <option value="obstaculizacion">Obstaculización (Pasos tortuosos para privacidad)</option>
                <option value="accion_forzada">Acción Forzada (Barreras o preselección obligatoria)</option>
                <option value="otro">Otro tipo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Título del reporte:
              </label>
              <input
                type="text"
                placeholder="ej: Casilla premarcada de seguro de viaje en checkout"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Descripción detallada de la interacción:
              </label>
              <textarea
                rows={3}
                placeholder="Describe qué hace la página, qué opciones confunden al usuario y qué ocurre al intentar rechazarlas..."
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!targetDomain || !reportTitle) return;
                  const newRep: Report = {
                    id: `rep-${Date.now()}`,
                    domain: targetDomain.replace(/^https?:\/\//, '').split('/')[0],
                    url: targetUrl || `https://${targetDomain}`,
                    title: reportTitle,
                    description: reportDesc || 'Sin descripción detallada.',
                    patternType,
                    status: 'pendiente_validacion',
                    credibilityScore: Math.round(currentUser.confidenceScore * 0.4),
                    authorId: currentUser.id,
                    authorName: currentUser.name,
                    authorTrustAtCreation: currentUser.confidenceScore,
                    evidences: [],
                    validations: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  onAddReport(newRep);
                  setSelectedReportId(newRep.id);
                  setTargetDomain('');
                  setTargetUrl('');
                  setReportTitle('');
                  setReportDesc('');
                  setReportSuccessToast(true);
                  setTimeout(() => setReportSuccessToast(false), 3000);
                }}
                disabled={!targetDomain || !reportTitle}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
              >
                Publicar Reporte
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Carga y Validación de Evidencias */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
                Adjuntar Evidencia Multimedia
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sube capturas de pantalla para respaldar un reporte. Se validará el formato y tamaño antes del envío.
              </p>
            </div>

            {/* Selección del reporte al que adjuntar */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Selecciona el reporte sobre el que aportar evidencia:
              </label>
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.domain}] {r.title.slice(0, 50)}... ({r.credibilityScore}% credibilidad)
                  </option>
                ))}
              </select>
            </div>

            {/* Dropzone de subida */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Captura de pantalla (Máximo 5 MB • PNG, JPEG o WEBP):
              </label>

              <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-2xl p-6 text-center transition-colors bg-slate-950/40 group">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Arrastra o selecciona una imagen de evidencia"
                />

                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-medium text-slate-200">
                    Arrastra aquí tu captura o <span className="text-indigo-400 underline">haz clic para examinar</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Formatos seguros admitidos: PNG, JPG, WEBP hasta 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Mensajes de validación de archivo */}
            {validationResult && !validationResult.valid && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Archivo no válido:</strong>
                  <p className="mt-0.5 text-red-200/90">{validationResult.error}</p>
                </div>
              </div>
            )}

            {/* Archivo válido staged listo para confirmar */}
            {stagedFile && validationResult?.valid && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
                      {stagedFile.file.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({(stagedFile.file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setStagedFile(null);
                      setValidationResult(null);
                    }}
                    className="p-1 text-slate-400 hover:text-red-400"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                  <img
                    src={stagedFile.previewUrl}
                    alt="Preview de evidencia"
                    className="object-contain max-h-48 w-full"
                  />
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={hasSensitiveData}
                    onChange={(e) => setHasSensitiveData(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>
                    La imagen contiene datos personales o sensibles de terceros (solicitar sanitización automática).
                  </span>
                </label>

                {selectedReport && (
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-3 text-xs flex items-center justify-between">
                    <span className="text-slate-300">
                      Credibilidad proyectada con esta evidencia:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-slate-500 font-mono">
                        {selectedReport.credibilityScore}%
                      </span>
                      <span className="text-emerald-400 font-bold font-mono text-sm">
                        → {projectedCredibility}%
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConfirmUpload}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Confirmar y Guardar Evidencia</span>
                </button>
              </div>
            )}

            {/* Evidencias ya existentes en el reporte */}
            {selectedReport && selectedReport.evidences.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">
                  Evidencias vinculadas actualmente ({selectedReport.evidences.length}):
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedReport.evidences.map((evi) => (
                    <div
                      key={evi.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                    >
                      <div className="text-[11px] font-medium text-slate-300 truncate">
                        {evi.fileName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>{(evi.fileSize / 1024).toFixed(0)} KB</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 capitalize">
                          {evi.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
