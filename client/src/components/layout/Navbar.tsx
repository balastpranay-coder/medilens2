import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { 
  Search, 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  Laptop, 
  ChevronDown, 
  Plus, 
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { Patient } from '../../types';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, authFetch } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Debounced search for patient identifier / MRN
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await authFetch(`/api/patients?search=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.patients || []);
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (id: number) => {
    setShowDropdown(false);
    setSearchQuery('');
    navigate(`/patients/${id}`);
  };

  const getThemeIcon = () => {
    if (theme === 'dark' || (theme === 'system' && isDark)) {
      return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
    }
    if (theme === 'system') {
      return <Laptop className="w-3.5 h-3.5 text-slate-400" />;
    }
    return <Sun className="w-3.5 h-3.5 text-amber-500" />;
  };

  const getThemeLabel = () => {
    if (theme === 'dark') return 'Dark';
    if (theme === 'system') return 'System';
    return 'Light';
  };

  return (
    <header className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              id="top-patient-search"
              type="text"
              className="block w-full pl-10 pr-4 py-2 bg-slate-100/70 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl border border-transparent focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
              placeholder="Search patient, MRN, or analyte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 max-h-72 overflow-y-auto">
              {searchResults.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    Matching Patients ({searchResults.length})
                  </div>
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{p.patient_identifier}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {p.sex}, {p.age ? `${p.age} yrs` : 'Age N/A'}
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.status}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  No records matching "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-3">
          
          {/* Guardrails Active Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Guardrails Active</span>
          </div>

          {/* Notification Bell */}
          <button 
            type="button" 
            title="Notifications"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600"></span>
          </button>

          {/* Theme Selector Pill & Dropdown */}
          <div className="relative" ref={themeMenuRef}>
            <button 
              type="button" 
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
            >
              {getThemeIcon()}
              <span>{getThemeLabel()}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs animate-in fade-in-50 duration-100">
                <button
                  type="button"
                  onClick={() => { setTheme('light'); setShowThemeMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${
                    theme === 'light' ? 'text-teal-700 dark:text-teal-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light</span>
                  </div>
                  {theme === 'light' && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${
                    theme === 'dark' ? 'text-teal-700 dark:text-teal-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dark</span>
                  </div>
                  {theme === 'dark' && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setTheme('system'); setShowThemeMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${
                    theme === 'system' ? 'text-teal-700 dark:text-teal-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Laptop className="w-3.5 h-3.5 text-slate-400" />
                    <span>System</span>
                  </div>
                  {theme === 'system' && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Authenticated User Profile Menu */}
          {user && (
            <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.full_name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left text-xs leading-tight">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                    {user.full_name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* + New Patient Primary Button */}
          <Link
            to="/patients/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Patient</span>
          </Link>

        </div>

      </div>
    </header>
  );
};
