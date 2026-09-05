import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CheckCheck, 
  History, 
  ClipboardList,
  Settings as SettingsIcon, 
  LogOut, 
  X,
  Activity,
  CheckCircle2,
  AlertCircle,
  GitCompare,
  Search
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
    { to: '/review-center', label: 'Review Center', icon: AlertCircle },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/comparison', label: 'Comparison', icon: GitCompare },
    { to: '/verification', label: 'Verification', icon: CheckCheck },
    { to: '/timeline', label: 'Timeline', icon: History },
    { to: '/ai-summary', label: 'Clinical Summary', icon: ClipboardList },
    { to: '/search', label: 'Search', icon: Search },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-900 flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 leading-tight">MedLens</div>
              <div className="text-[11px] text-slate-500 leading-none">Clinical Information</div>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={onCloseMobile} 
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-2.5 space-y-0.5 overflow-y-auto">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 font-semibold border-l-2 border-blue-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section: Settings, User Account, Logout */}
        <div className="p-2.5 border-t border-slate-200 bg-slate-50/50 space-y-1 text-xs">
          
          {/* Settings button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>

          {/* User Account Info */}
          <div className="px-2.5 py-1.5 rounded bg-white border border-slate-200">
            <div className="text-xs font-medium text-slate-900 truncate">
              {user?.full_name || user?.email || 'Reviewer'}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {user?.role || 'Clinical Reviewer'}
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

        </div>

      </aside>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-blue-900" />
                System Information & Configuration
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-800 mb-1">Optical Text Extraction</div>
                <div>PDF Parsing: Native <code>pdf-parse</code></div>
                <div>Image OCR: Local <code>Tesseract.js</code> (Offline)</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-800 mb-1">Clinical AI Model</div>
                <div>Primary: Google Gemini (Structured Extraction & Grounded Summary)</div>
                <div>Model: <code>gemini-1.5-flash</code></div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-800 mb-1">Deterministic Classifier</div>
                <div>Reference-range evaluation: Evaluated in application code</div>
                <div>Rule: Value compared strictly against report-defined bounds</div>
              </div>

              <div className="flex items-center gap-2 text-emerald-800 text-[11px] font-medium pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All clinical pipelines active and operating on genuine records.</span>
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
