import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Sparkles, 
  ClipboardList, 
  FileSearch, 
  CheckCheck, 
  AlertTriangle, 
  TrendingUp, 
  FileSpreadsheet, 
  History, 
  ShieldCheck, 
  Settings as SettingsIcon, 
  LogOut, 
  X,
  Activity,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const sections = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'PATIENTS',
      items: [
        { to: '/patients', label: 'Patients', icon: Users },
      ]
    },
    {
      title: 'DOCUMENTS',
      items: [
        { to: '/reports', label: 'Medical Documents', icon: FileText },
        { to: '/reports', label: 'AI Extraction', icon: Sparkles },
      ]
    },
    {
      title: 'REVIEW',
      items: [
        { to: '/patients', label: 'Structured Records', icon: ClipboardList },
        { to: '/search', label: 'Source Evidence', icon: FileSearch },
        { to: '/verification', label: 'Human Verification', icon: CheckCheck },
        { to: '/review-center', label: 'Conflict Detection', icon: AlertTriangle },
      ]
    },
    {
      title: 'INSIGHTS',
      items: [
        { to: '/comparison', label: 'Lab Trends', icon: TrendingUp },
        { to: '/ai-summary', label: 'Clinical Summary', icon: FileSpreadsheet },
        { to: '/timeline', label: 'Timeline', icon: History },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { to: '/timeline', label: 'Audit Trail', icon: ShieldCheck },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.full_name || user?.email || 'Reviewer';
  const displayRole = user?.role || 'Clinical Reviewer';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n.replace(/[^a-zA-Z]/g, '').charAt(0))
    .join('')
    .toUpperCase() || 'CR';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-60 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-transform duration-150 ease-in-out
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-teal-800 flex items-center justify-center text-white font-bold text-sm shadow-2xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white leading-tight tracking-tight">MedLens</div>
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-none">
                Clinical Intelligence
              </div>
            </div>
          </Link>
          <button 
            onClick={onCloseMobile} 
            className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-2.5 py-3 overflow-y-auto space-y-4">
          {sections.map((section, sIdx) => (
            <div key={section.title} className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </div>
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={`${item.to}-${sIdx}-${iIdx}`}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-teal-900 dark:text-teal-300 font-semibold border-l-2 border-teal-800 dark:border-teal-500'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-800 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Quick Action */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/patients/new"
              onClick={onCloseMobile}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Patient</span>
            </Link>
          </div>
        </div>

        {/* Bottom Section: Settings, Authenticated User & Logout */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-1.5 text-xs">
          
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center gap-2 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>

          {/* Real Authenticated User Card */}
          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-teal-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {displayRole}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg max-w-md w-full p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                MedLens System Configuration
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded space-y-0.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Deterministic Range Evaluation</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Values evaluated strictly against report-defined reference boundaries.</div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded space-y-0.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Safety Boundaries</div>
                <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">Non-diagnostic organization • Human reviewer required</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="clinical-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
