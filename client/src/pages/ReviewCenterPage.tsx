import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CheckCheck, 
  ChevronRight, 
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ReviewCenterData } from '../types';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const ReviewCenterPage: React.FC = () => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ReviewCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  const fetchReviewItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/review-center/items');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to retrieve review center items.');
      }
    } catch (err) {
      setError('Network error loading review center.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewItems();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading prioritized clinical review queue..." rows={5} />;
  }

  if (error || !data) {
    return (
      <div className="clinical-card p-6 text-center max-w-md mx-auto my-8 space-y-3">
        <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 mx-auto" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Review Center Error</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'Unable to load items requiring review.'}</p>
        <button onClick={fetchReviewItems} className="clinical-btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const { total_items, categories } = data;

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Review Center</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Prioritized clinical triage of unverified records, low-confidence extractions, and data conflicts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
            total_items > 0 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
          }`}>
            {total_items} {total_items === 1 ? 'item requires review' : 'items require review'}
          </span>
          <button
            onClick={fetchReviewItems}
            className="clinical-btn-secondary"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* 5 Compact Category Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        <button
          onClick={() => setActiveTab('pending_reports')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'pending_reports'
              ? 'bg-slate-100 dark:bg-slate-800 border-teal-800 dark:border-teal-500 shadow-2xs'
              : 'clinical-card hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Awaiting Verification
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {categories.pending_reports.count}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('low_confidence')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'low_confidence'
              ? 'bg-slate-100 dark:bg-slate-800 border-teal-800 dark:border-teal-500 shadow-2xs'
              : 'clinical-card hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Low Confidence (&lt;75%)
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {categories.low_confidence.count}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('uncertain_results')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'uncertain_results'
              ? 'bg-slate-100 dark:bg-slate-800 border-teal-800 dark:border-teal-500 shadow-2xs'
              : 'clinical-card hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Uncertain Results
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {categories.uncertain_results.count}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('open_conflicts')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'open_conflicts'
              ? 'bg-slate-100 dark:bg-slate-800 border-teal-800 dark:border-teal-500 shadow-2xs'
              : 'clinical-card hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Open Conflicts
          </div>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-1">
            {categories.open_conflicts.count}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('processing_issues')}
          className={`p-3 rounded-lg border text-left transition-all ${
            activeTab === 'processing_issues'
              ? 'bg-slate-100 dark:bg-slate-800 border-teal-800 dark:border-teal-500 shadow-2xs'
              : 'clinical-card hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Processing Issues
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {categories.processing_issues.count}
          </div>
        </button>

      </div>

      {/* Prioritized Review Queue Table */}
      <div className="clinical-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {activeTab === 'all' ? 'All Priority Review Items' : categories[activeTab as keyof typeof categories]?.title || 'Review Queue'}
          </h2>
          {activeTab !== 'all' && (
            <button onClick={() => setActiveTab('all')} className="text-xs text-teal-800 dark:text-teal-400 hover:underline">
              Show All
            </button>
          )}
        </div>

        {total_items === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All clear — zero items require review"
            description="All uploaded documents have been verified and zero cross-record conflicts are recorded in the database."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            
            {/* Pending Reports Section */}
            {(activeTab === 'all' || activeTab === 'pending_reports') && categories.pending_reports.items.map((r: any) => (
              <div key={`rep-${r.id}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                      Awaiting Verification
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate">{r.report_title}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Patient {r.patient_identifier || `#${r.patient_id}`} • Specimen Date: {r.report_date} • Lab: {r.lab_name || 'Clinical Lab'}
                  </div>
                </div>
                <Link
                  to={`/reports/${r.id}`}
                  className="clinical-btn-primary text-xs py-1 px-3 shrink-0"
                >
                  Review
                </Link>
              </div>
            ))}

            {/* Conflicts Section */}
            {(activeTab === 'all' || activeTab === 'open_conflicts') && categories.open_conflicts.items.map((c: any) => (
              <div key={`conf-${c.id}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      Conflict
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate">{c.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {c.description}
                  </div>
                </div>
                <Link
                  to={`/patients/${c.patient_id}?tab=conflicts`}
                  className="clinical-btn-danger text-xs py-1 px-3 shrink-0"
                >
                  Resolve
                </Link>
              </div>
            ))}

            {/* Low Confidence Section */}
            {(activeTab === 'all' || activeTab === 'low_confidence') && categories.low_confidence.items.map((lc: any) => (
              <div key={`lc-${lc.id}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Low Confidence ({lc.confidence_score}%)
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{lc.test_name}: {lc.value} {lc.unit || ''}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Source snippet: "{lc.source_snippet}"
                  </div>
                </div>
                <Link
                  to={`/reports/${lc.report_id}`}
                  className="clinical-btn-secondary text-xs py-1 px-3 shrink-0"
                >
                  Inspect
                </Link>
              </div>
            ))}

          </div>
        )}
      </div>

    </div>
  );
};
