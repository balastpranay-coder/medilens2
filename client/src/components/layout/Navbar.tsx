import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Menu, 
  User, 
  LogOut, 
  ChevronDown, 
  Activity, 
  FileText,
  CheckCheck,
  Shield
} from 'lucide-react';
import { Patient } from '../../types';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Debounced search for patient identifier
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
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
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

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Quick Search for Patient Identifier */}
        <div className="flex-1 max-w-sm relative" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              id="top-patient-search"
              type="text"
              className="block w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-md border border-slate-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition-colors outline-none"
              placeholder="Search Patient Identifier (e.g. PT-1001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                <div className="w-3.5 h-3.5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-md border border-slate-200 py-1 z-50 max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                <>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Matching Patients ({searchResults.length})
                  </div>
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{p.patient_identifier}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.sex}, {p.age ? `${p.age} yrs` : 'Age N/A'}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {p.status}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-3 text-center text-xs text-slate-500">
                  No patient found matching "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Clinician Info & Profile Menu */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-700 text-xs"
            >
              <div className="w-6 h-6 rounded bg-blue-900 text-white flex items-center justify-center font-bold text-[11px]">
                {user?.full_name 
                  ? user.full_name.charAt(0).toUpperCase() 
                  : (user?.email ? user.email.charAt(0).toUpperCase() : 'R')}
              </div>
              <span className="hidden sm:inline font-medium text-slate-800">
                {user?.full_name || user?.email || 'Reviewer'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-900 truncate">{user?.full_name || user?.email || 'Reviewer'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                    {user?.role || 'Reviewer'}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    Dashboard
                  </Link>
                  <Link
                    to="/verification"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                    Verification Queue
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-700 hover:bg-rose-50 text-left transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
