import React from 'react';
import {
  ShieldAlert,
  Search,
  FilePlus2,
  Code2,
  ShieldCheck,
  Puzzle,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';
import { User } from '../../types/index.ts';
import { TEAM_MEMBERS } from '../../services/mockData.ts';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  const navItems = [
    { id: 'consumer', label: 'Explorador', icon: Search },
    { id: 'contributor', label: 'Reportar', icon: FilePlus2 },
    { id: 'developer', label: 'Portal Desarrollador', icon: Code2 },
    { id: 'admin', label: 'Administración', icon: ShieldCheck },
    { id: 'extension', label: 'Extensión Web', icon: Puzzle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('consumer')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Dark-Shield
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Detección, reporte y prevención de dark patterns
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Account / Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-left transition-colors"
              title="Perfil de usuario y rol activo"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                  {currentUser.name}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="capitalize font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-indigo-400">
                    {currentUser.role}
                  </span>
                  <span>Confianza: {currentUser.confidenceScore}%</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Cambiar Cuenta / Rol Activo
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Permite verificar los permisos y vistas de cada rol en la plataforma.
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {TEAM_MEMBERS.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setCurrentUser(member);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        currentUser.id === member.id
                          ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-medium text-slate-200 truncate">{member.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {member.role} • {member.confidenceScore}% reputación
                        </div>
                      </div>
                      {currentUser.id === member.id && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
