import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { 
  Search, 
  Menu, 
  Sun, 
  Moon, 
  Laptop, 
  ChevronDown, 
  Plus, 
  Check, 
  FileText, 
  User as UserIcon, 
  Activity,
  LogOut
} from 'lucide-react';
import { Patient, MedicalReport, ExtractedResult } from '../../types';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, authFetch, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    patients: Patient[];
    reports: MedicalReport[];
    tests: ExtractedResult[];
  }>({ patients: [], reports: [], tests: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Debounced search for patients, reports, and tests
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ patients: [], reports: [], tests: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await authFetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || { patients: [], reports: [], tests: [] });
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Navbar search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResults = searchResults.patients.length + searchResults.reports.length + searchResults.tests.length;

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
    <header className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-150">
      <div className="px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              id="top-patient-search"
              type="text"
              className="block w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100/80 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded border border-slate-200 dark:border-slate-700 focus:border-teal-700 focus:ring-1 focus:ring-teal-700/30 transition-colors outline-none"
              placeholder="Search patients, reports, tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (totalResults > 0) setShowDropdown(true); }}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                <div className="w-3 h-3 border-2 border-teal-800 dark:border-teal-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 max-h-80 overflow-y-auto text-xs">
              {totalResults > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.patients.length > 0 && (
                    <div className="p-1">
                      <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Patients ({searchResults.patients.length})
                      </div>
                      {searchResults.patients.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setShowDropdown(false); setSearchQuery(''); navigate(`/patients/${p.id}`); }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5 text-teal-800 dark:text-teal-400" />
                            <span className="font-medium text-slate-900 dark:text-slate-100">{p.patient_identifier}</span>
                            <span className="text-slate-400 text-[11px]">({p.sex}, {p.age ? `${p.age}y` : 'Age N/A'})</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{p.status}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.reports.length > 0 && (
                    <div className="p-1">
                      <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Documents ({searchResults.reports.length})
                      </div>
                      {searchResults.reports.map(r => (
                        <button
                          key={r.id}
                          onClick={() => { setShowDropdown(false); setSearchQuery(''); navigate(`/reports/${r.id}`); }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{r.report_title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{r.report_date}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.tests.length > 0 && (
                    <div className="p-1">
                      <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Test Results ({searchResults.tests.length})
                      </div>
                      {searchResults.tests.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setShowDropdown(false); setSearchQuery(''); navigate(`/reports/${t.report_id}`); }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-900 dark:text-slate-100">{t.test_name}</span>
                            <span className="text-slate-600 dark:text-slate-400 font-mono">{t.value} {t.unit || ''}</span>
                          </div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500">{t.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-500">
                  No records found matching "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2.5">
          
          {/* Subtle System Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
            <span>Guardrails active</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

          {/* Theme Selector Dropdown */}
          <div className="relative" ref={themeMenuRef}>
            <button 
              type="button" 
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 transition-colors"
              title="Select theme"
            >
              {theme === 'dark' || (theme === 'system' && isDark) ? (
                <Moon className="w-3 h-3 text-slate-400" />
              ) : theme === 'system' ? (
                <Laptop className="w-3 h-3 text-slate-400" />
              ) : (
                <Sun className="w-3 h-3 text-slate-400" />
              )}
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 rounded-md shadow-md border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => { setTheme('light'); setShowThemeMenu(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-slate-700 dark:text-slate-300"
                >
                  <span>Light</span>
                  {theme === 'light' && <Check className="w-3 h-3 text-teal-700 dark:text-teal-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-slate-700 dark:text-slate-300"
                >
                  <span>Dark</span>
                  {theme === 'dark' && <Check className="w-3 h-3 text-teal-700 dark:text-teal-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setTheme('system'); setShowThemeMenu(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-slate-700 dark:text-slate-300"
                >
                  <span>System</span>
                  {theme === 'system' && <Check className="w-3 h-3 text-teal-700 dark:text-teal-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Authenticated User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 text-xs"
            >
              <div className="w-5 h-5 rounded bg-teal-800 text-white flex items-center justify-center font-semibold text-[10px]">
                {initials}
              </div>
              <span className="hidden md:inline font-medium text-xs truncate max-w-[120px]">
                {displayName}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{displayName}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
                  <div className="text-[10px] text-teal-800 dark:text-teal-400 font-medium mt-0.5">{displayRole}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
