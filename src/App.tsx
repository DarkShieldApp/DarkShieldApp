/**
 * Dark-Shield — Aplicación Principal
 * Plataforma comunitaria para la detección, reporte y mitigación de Dark Patterns
 */

import React, { useState } from 'react';
import { Header } from './components/layout/Header.tsx';
import { ConsumerExplorerView } from './components/views/ConsumerExplorerView.tsx';
import { ContributorWorkspaceView } from './components/views/ContributorWorkspaceView.tsx';
import { DeveloperPortalView } from './components/views/DeveloperPortalView.tsx';
import { AdminModerationView } from './components/views/AdminModerationView.tsx';
import { ExtensionSimulatorView } from './components/views/ExtensionSimulatorView.tsx';
import { User, Report, Evidence, Indicio, ValidationVote } from './types/index.ts';
import { TEAM_MEMBERS, INITIAL_REPORTS } from './services/mockData.ts';
import { calculateReportCredibility } from './services/credibility.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(TEAM_MEMBERS[0]);
  const [activeTab, setActiveTab] = useState<string>('consumer');
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [indicios, setIndicios] = useState<Indicio[]>([]);

  // Añadir nuevo reporte
  const handleAddReport = (newReport: Report) => {
    setReports([newReport, ...reports]);
  };

  // Añadir nueva evidencia y recalcular credibilidad
  const handleAddEvidenceToReport = (reportId: string, newEvidence: Evidence) => {
    setReports((prevReports) =>
      prevReports.map((report) => {
        if (report.id === reportId) {
          const updatedEvidences = [newEvidence, ...report.evidences];
          const newCredibility = calculateReportCredibility({
            authorTrustScore: report.authorTrustAtCreation,
            evidences: updatedEvidences,
            validations: report.validations,
          });

          return {
            ...report,
            evidences: updatedEvidences,
            credibilityScore: newCredibility,
            updatedAt: new Date().toISOString(),
          };
        }
        return report;
      })
    );
  };

  // Voto de validación o invalidación comunitaria
  const handleVoteReport = (reportId: string, vote: 'valido' | 'invalido') => {
    setReports((prevReports) =>
      prevReports.map((report) => {
        if (report.id === reportId) {
          const newVote: ValidationVote = {
            id: `val-${Date.now()}`,
            reportId,
            userId: currentUser.id,
            userName: currentUser.name,
            vote,
            voterTrustScore: currentUser.confidenceScore,
            createdAt: new Date().toISOString(),
          };

          const updatedValidations = [newVote, ...report.validations];
          const newCredibility = calculateReportCredibility({
            authorTrustScore: report.authorTrustAtCreation,
            evidences: report.evidences,
            validations: updatedValidations,
          });

          return {
            ...report,
            validations: updatedValidations,
            credibilityScore: newCredibility,
            updatedAt: new Date().toISOString(),
          };
        }
        return report;
      })
    );
  };

  // Aportar indicio rápido
  const handleAddIndicio = (newIndicio: Indicio) => {
    setIndicios([newIndicio, ...indicios]);
  };

  // Moderación de reportes
  const handleModerateReport = (reportId: string, action: 'aprobar' | 'rechazar') => {
    setReports((prevReports) =>
      prevReports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: action === 'aprobar' ? 'validado' : 'rechazado',
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Barra de Navegación Principal */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'consumer' && (
          <ConsumerExplorerView
            reports={reports}
            currentUser={currentUser}
            onVoteReport={handleVoteReport}
            onAddIndicio={handleAddIndicio}
          />
        )}

        {activeTab === 'contributor' && (
          <ContributorWorkspaceView
            currentUser={currentUser}
            reports={reports}
            onAddReport={handleAddReport}
            onAddEvidenceToReport={handleAddEvidenceToReport}
          />
        )}

        {activeTab === 'developer' && <DeveloperPortalView currentUser={currentUser} />}

        {activeTab === 'admin' && (
          <AdminModerationView
            reports={reports}
            currentUser={currentUser}
            onModerateReport={handleModerateReport}
          />
        )}

        {activeTab === 'extension' && <ExtensionSimulatorView reports={reports} />}
      </main>

      {/* Pie de página oficial de la aplicación */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Dark-Shield</span>
            <span>—</span>
            <span>Plataforma comunitaria y abierta contra el diseño web engañoso</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Protección en Tiempo Real</span>
            <span>•</span>
            <span>Auditoría de Privacidad</span>
            <span>•</span>
            <span>Transparencia Web</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
