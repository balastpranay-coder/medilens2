import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  Users, 
  FileText, 
  Layers, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  Calendar,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SearchResults } from '../types';

export const SearchPage: React.FC = () => {
  const { authFetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [labFilter, setLabFilter] = useState(searchParams.get('lab') || '');

  const [data, setData] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (labFilter.trim()) params.set('lab', labFilter.trim());

      setSearchParams(params);

      const res = await authFetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Search operation failed.');
      }
    } catch (err) {
      setError('Network error executing search.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleClear = () => {
    setQuery('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setLabFilter('');
    executeSearch('');
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || 'unknown').toLowerCase();
    switch (s) {
      case 'normal':
        return <span className="badge-normal">Normal</span>;
      case 'high':
        return <span className="badge-high">High</span>;
      case 'low':
        return <span className="badge-low">Low</span>;
      default:
        return <span className="badge-unknown">Unknown</span>;
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3.5">
        <h1 className="text-xl font-semibold text-slate-900">Smart Search & Clinical Filtering</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Query patient identifiers, reports, laboratory facilities, and extracted test measurements across the database.
        </p>
      </div>

      {/* Search Input and Filters Form */}
      <form onSubmit={handleFormSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient identifier, report title, laboratory, or test name..."
              className="clinical-input w-full pl-9 py-2 text-xs"
            />
          </div>
          <button type="submit" className="clinical-btn-primary py-2 px-4 text-xs w-full sm:w-auto">
            Search
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="clinical-btn-secondary py-2 px-3 text-xs w-full sm:w-auto"
          >
            Clear
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="clinical-input w-full py-1.5 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="low">Low</option>
              <option value="unknown">Unknown</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="clinical-input w-full py-1.5 text-xs"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="clinical-input w-full py-1.5 text-xs"
            />
          </div>

          {/* Laboratory */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Laboratory / Facility</label>
            <input
              type="text"
              placeholder="e.g. MetroPath"
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="clinical-input w-full py-1.5 text-xs"
            />
          </div>

        </div>
      </form>

      {/* Results Section */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-500 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Querying clinical database records...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-xs text-rose-700 space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-600" />
          <p>{error}</p>
        </div>
      ) : !data || data.total_matches === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-500 space-y-2">
          <Search className="w-7 h-7 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {query.trim()
              ? `No patient, report, or test matched your search criteria.`
              : 'Enter a search term or adjust filter parameters to search records.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          <div className="text-xs text-slate-500 px-1">
            Found <strong>{data.total_matches}</strong> matching record(s) across database.
          </div>

          {/* Group 1: Matching Patients */}
          {data.results.patients.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Users className="w-3.5 h-3.5 text-blue-900" />
                Matching Patients ({data.results.patients.length})
              </h2>
              <div className="divide-y divide-slate-100">
                {data.results.patients.map(p => (
                  <div key={p.id} className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded">
                    <div>
                      <strong className="font-mono text-slate-900">{p.patient_identifier}</strong>
                      <span className="text-slate-500 text-[11px] ml-2">
                        {p.sex}, {p.age !== null ? `${p.age} years` : 'Age N/A'} • Status: {p.status}
                      </span>
                    </div>
                    <Link
                      to={`/patients/${p.id}`}
                      className="text-blue-900 hover:underline font-medium text-xs flex items-center gap-1"
                    >
                      <span>Open Profile</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group 2: Matching Reports */}
          {data.results.reports.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-900" />
                Matching Medical Reports ({data.results.reports.length})
              </h2>
              <div className="divide-y divide-slate-100">
                {data.results.reports.map(r => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded">
                    <div className="space-y-0.5">
                      <strong className="text-slate-900">{r.report_title}</strong>
                      <div className="text-[11px] text-slate-500">
                        Patient: <span className="font-mono text-slate-700">{r.patient_identifier}</span> • Date: {r.report_date} • Lab: {r.lab_name || 'Standard Lab'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.2 rounded border uppercase font-medium bg-slate-100 text-slate-700">
                        {r.verification_status || 'pending'}
                      </span>
                      <Link
                        to={`/reports/${r.id}`}
                        className="text-blue-900 hover:underline font-medium text-xs flex items-center gap-1"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group 3: Matching Extracted Lab Tests */}
          {data.results.tests.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-900" />
                Matching Extracted Laboratory Tests ({data.results.tests.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Test Name</th>
                      <th className="px-3 py-2">Reported Value</th>
                      <th className="px-3 py-2">Patient</th>
                      <th className="px-3 py-2">Report Date</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.results.tests.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">{t.test_name}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">
                          {t.value} {t.unit || ''}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700">{t.patient_identifier}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{t.report_date}</td>
                        <td className="px-3 py-2">{renderStatusBadge(t.status)}</td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            to={`/reports/${t.report_id}`}
                            className="text-blue-900 hover:underline font-medium text-xs inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
