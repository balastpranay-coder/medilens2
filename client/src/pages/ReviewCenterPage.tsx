import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CheckCheck, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ReviewCenterData } from '../types';

export const ReviewCenterPage: React.FC = () => {
  const { authFetch } = useAuth();
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
    return (
      <div className="space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-24 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="h-64 bg-slate-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center max-w-md mx-auto my-8 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-sm font-semibold text-slate-900">Review Center Error</h2>
        <p className="text-xs text-slate-500">{error || 'Unable to load items requiring review.'}</p>
        <button onClick={fetchReviewItems} className="clinical-btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const { total_items, categories } = data;

  return (
    <div className="space-y-5">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Review Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized queue of clinical reports, extractions, and data conflicts requiring human attention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${
            total_items > 0 ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-emerald-50 text-emerald-900 border-emerald-300'
          }`}>
            {total_items} {total_items === 1 ? 'item requires review' : 'items require review'}
          </span>
          <button
            onClick={fetchReviewItems}
            className="clinical-btn-secondary py-1 px-2.5 text-xs"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* 5 Category Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Category 1: Pending Reports */}
        <button
          onClick={() => setActiveTab('pending_reports')}
          className={`text-left p-3 rounded-lg border transition-all ${
            activeTab === 'pending_reports'
              ? 'bg-blue-50/80 border-blue-900 ring-1 ring-blue-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500 block truncate">Reports Awaiting Verification</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {categories.pending_reports.count}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Require sign-off</span>
        </button>

        {/* Category 2: Low Confidence */}
        <button
          onClick={() => setActiveTab('low_confidence')}
          className={`text-left p-3 rounded-lg border transition-all ${
            activeTab === 'low_confidence'
              ? 'bg-blue-50/80 border-blue-900 ring-1 ring-blue-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500 block truncate">Low-Confidence Extractions</span>
          <div className={`text-xl font-bold mt-1 ${categories.low_confidence.count > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {categories.low_confidence.count}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">&lt; 80% OCR clarity</span>
        </button>

        {/* Category 3: Uncertain Results */}
        <button
          onClick={() => setActiveTab('uncertain_results')}
          className={`text-left p-3 rounded-lg border transition-all ${
            activeTab === 'uncertain_results'
              ? 'bg-blue-50/80 border-blue-900 ring-1 ring-blue-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500 block truncate">Uncertain Results</span>
          <div className={`text-xl font-bold mt-1 ${categories.uncertain_results.count > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {categories.uncertain_results.count}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Missing ranges / flagged</span>
        </button>

        {/* Category 4: Open Conflicts */}
        <button
          onClick={() => setActiveTab('open_conflicts')}
          className={`text-left p-3 rounded-lg border transition-all ${
            activeTab === 'open_conflicts'
              ? 'bg-blue-50/80 border-blue-900 ring-1 ring-blue-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500 block truncate">Open Conflicts</span>
          <div className={`text-xl font-bold mt-1 ${categories.open_conflicts.count > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {categories.open_conflicts.count}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Need resolution</span>
        </button>

        {/* Category 5: Processing Failures */}
        <button
          onClick={() => setActiveTab('processing_issues')}
          className={`text-left p-3 rounded-lg border transition-all ${
            activeTab === 'processing_issues'
              ? 'bg-blue-50/80 border-blue-900 ring-1 ring-blue-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500 block truncate">Processing Failures</span>
          <div className={`text-xl font-bold mt-1 ${categories.processing_issues.count > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {categories.processing_issues.count}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">File reading errors</span>
        </button>

      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Items ({total_items})
        </button>
        <button
          onClick={() => setActiveTab('pending_reports')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            activeTab === 'pending_reports'
              ? 'bg-blue-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Reports Awaiting Verification ({categories.pending_reports.count})
        </button>
        <button
          onClick={() => setActiveTab('low_confidence')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            activeTab === 'low_confidence'
              ? 'bg-blue-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Low Confidence ({categories.low_confidence.count})
        </button>
        <button
          onClick={() => setActiveTab('uncertain_results')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            activeTab === 'uncertain_results'
              ? 'bg-blue-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Uncertain ({categories.uncertain_results.count})
        </button>
        <button
          onClick={() => setActiveTab('open_conflicts')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            activeTab === 'open_conflicts'
              ? 'bg-blue-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Conflicts ({categories.open_conflicts.count})
        </button>
        <button
          onClick={() => setActiveTab('processing_issues')}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            activeTab === 'processing_issues'
              ? 'bg-blue-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Failures ({categories.processing_issues.count})
        </button>
      </div>

      {/* Main Queue Items Content */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {total_items === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No items require review</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All extracted laboratory reports and patient records are verified and consistent.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            
            {/* 1. Reports Awaiting Verification */}
            {(activeTab === 'all' || activeTab === 'pending_reports') && categories.pending_reports.items.map((rpt: any) => (
              <div key={`rep-${rpt.id}`} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4 transition-colors">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      Report Awaiting Verification
                    </span>
                    <strong className="text-slate-900 font-semibold">{rpt.report_title}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Patient: <Link to={`/patients/${rpt.patient_id}`} className="font-mono font-medium text-blue-900 hover:underline">{rpt.patient_identifier}</Link> • Date: {rpt.report_date} • Laboratory: {rpt.lab_name || 'Standard Lab'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {rpt.extracted_count} extracted laboratory results require clinical verification.
                  </p>
                </div>
                <Link
                  to={`/reports/${rpt.id}`}
                  className="clinical-btn-primary py-1 px-3 text-xs shrink-0 flex items-center gap-1"
                >
                  <span>Review Report</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}

            {/* 2. Low Confidence Extractions */}
            {(activeTab === 'all' || activeTab === 'low_confidence') && categories.low_confidence.items.map((item: any) => (
              <div key={`low-${item.id}`} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4 transition-colors">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      Low-Confidence Extraction ({item.confidence_score}%)
                    </span>
                    <strong className="text-slate-900 font-semibold">{item.test_name}: {item.value} {item.unit || ''}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Patient: <Link to={`/patients/${item.patient_id}`} className="font-mono font-medium text-blue-900 hover:underline">{item.patient_identifier}</Link> • Report: {item.report_title}
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] font-mono text-slate-700 max-w-lg">
                    "{item.source_snippet}"
                  </div>
                </div>
                <Link
                  to={`/reports/${item.report_id}`}
                  className="clinical-btn-secondary py-1 px-3 text-xs shrink-0 flex items-center gap-1"
                >
                  <span>Verify Result</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}

            {/* 3. Uncertain Results */}
            {(activeTab === 'all' || activeTab === 'uncertain_results') && categories.uncertain_results.items.map((item: any) => (
              <div key={`unc-${item.id}`} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4 transition-colors">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      Uncertain Classification
                    </span>
                    <strong className="text-slate-900 font-semibold">{item.test_name}: {item.value} {item.unit || ''}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Patient: <Link to={`/patients/${item.patient_id}`} className="font-mono font-medium text-blue-900 hover:underline">{item.patient_identifier}</Link> • Report: {item.report_title}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {item.reference_range ? `Flagged as uncertain (${item.reference_range}).` : 'Reference range was not detected in report source text.'}
                  </p>
                </div>
                <Link
                  to={`/verification`}
                  className="clinical-btn-secondary py-1 px-3 text-xs shrink-0 flex items-center gap-1"
                >
                  <span>Queue Action</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}

            {/* 4. Open Conflicts */}
            {(activeTab === 'all' || activeTab === 'open_conflicts') && categories.open_conflicts.items.map((c: any) => (
              <div key={`conf-${c.id}`} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4 transition-colors">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 uppercase">
                      Open Conflict: {c.type.replace('_', ' ')}
                    </span>
                    <strong className="text-slate-900 font-semibold">{c.title}</strong>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {c.description}
                  </p>
                  <div className="text-[11px] text-slate-500">
                    Patient: <Link to={`/patients/${c.patient_id}`} className="font-mono font-medium text-blue-900 hover:underline">{c.patient_identifier}</Link>
                  </div>
                </div>
                <Link
                  to={`/patients/${c.patient_id}?tab=conflicts`}
                  className="clinical-btn-danger py-1 px-3 text-xs shrink-0 flex items-center gap-1"
                >
                  <span>Resolve</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}

            {/* 5. Processing Issues */}
            {(activeTab === 'all' || activeTab === 'processing_issues') && categories.processing_issues.items.map((rpt: any) => (
              <div key={`err-${rpt.id}`} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4 transition-colors">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 uppercase">
                      Extraction Failure
                    </span>
                    <strong className="text-slate-900 font-semibold">{rpt.report_title}</strong>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    {rpt.error_message || 'File text could not be extracted.'}
                  </p>
                  <div className="text-[11px] text-slate-500">
                    Patient: <Link to={`/patients/${rpt.patient_id}`} className="font-mono font-medium text-blue-900 hover:underline">{rpt.patient_identifier}</Link>
                  </div>
                </div>
                <Link
                  to={`/reports/${rpt.id}`}
                  className="clinical-btn-secondary py-1 px-3 text-xs shrink-0 flex items-center gap-1"
                >
                  <span>Inspect Details</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}

          </div>
        )}
      </div>

    </div>
  );
};
