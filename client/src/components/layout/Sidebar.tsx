import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Sparkles, 
  ListFilter, 
  SearchCode, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  History, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Plus, 
  X,
  Activity,
  Stethoscope,
  LogOut
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

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/reports', label: 'Medical Documents', icon: FileText },
    { to: '/reports', label: 'AI Extraction', icon: Sparkles },
    { to: '/patients', label: 'Structured Records', icon: ListFilter },
    { to: '/search', label: 'Source Evidence', icon: SearchCode },
    { to: '/review-center', label: 'Conflict Detection', icon: AlertTriangle },
    { to: '/verification', label: 'Human Verification', icon: CheckCircle2 },
    { to: '/comparison', label: 'Lab Trends', icon: TrendingUp },
    { to: '/timeline', label: 'Audit Trail', icon: History },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.full_name || user?.email?.split('@')[0] || (user?.phone_number ? `Reviewer (${user.phone_number})` : 'Authorized Reviewer');
  const displayRole = user?.role || 'Clinical Reviewer';
  const photoUrl = user?.photo_url;
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
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-200 ease-in-out
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base text-slate-900 dark:text-white leading-tight tracking-tight">MedLens</div>
              <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider leading-none mt-0.5">
                Clinical Intelligence
              </div>
            </div>
          </Link>
          {/* Mobile Close Button */}
          <button 
            onClick={onCloseMobile} 
            className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          
          {/* Main Navigation */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation
            </div>
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={`${item.to}-${index}`}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-teal-900 dark:text-emerald-300 font-semibold border border-emerald-200/70 dark:border-emerald-800 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Workspace Actions */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Workspace
            </div>
            <Link
              to="/patients/new"
              onClick={onCloseMobile}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-teal-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-xs font-semibold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-teal-700 dark:text-emerald-400" />
              <span>New Patient Intake</span>
            </Link>
          </div>

        </div>

        {/* Bottom Section: Settings, Help & User Profile */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Help</span>
            </button>
          </div>

          {/* User Account Info Card */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={displayName} 
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{displayRole}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                MedLens Clinical Intelligence System
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Deterministic Range Evaluation</div>
                <div>Values compared strictly against document-defined reference boundaries.</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Clinical Safety Guardrails</div>
                <div className="text-emerald-800 dark:text-emerald-300 font-medium">Active • Zero autonomous diagnosis • Supervised Review</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="clinical-btn-primary"
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
