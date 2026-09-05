import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardData, ReviewCenterData } from '../types';
import { 
  Users, 
  FileText, 
  CheckCheck, 
  AlertTriangle, 
  Plus, 
  Upload, 
  ArrowRight, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  FileSearch,
  Activity
} from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const DashboardPage: React.FC = () => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [res, reviewRes] = await Promise.all([
        authFetch('/api/dashboard/stats'),
        authFetch('/api/review-center/items')
      ]);

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to load clinical dashboard data.');
      }

      if (reviewRes.ok) {
        const rJson = await reviewRes.json();
        setReviewData(rJson);
      }
    } catch (err: any) {
      setError('Network connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatDateGroup = (dateStr?: string) => {
    if (!dateStr) return 'Earlier';
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Today';
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Earlier';
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading clinical command center..." rows={6} />;
  }

  if (error || !data) {
    return (
      <div className="clinical-card p-6 text-center max-w-md mx-auto mt-8">
        <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Dashboard Error</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error || 'Unable to retrieve dashboard metrics.'}</p>
        <button onClick={fetchDashboardData} className="clinical-btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const totalPatients = data.metrics.total_patients ?? 0;
  const totalReports = data.metrics.total_reports ?? 0;
  const pendingReview = (data.metrics.pending_verification ?? data.metrics.reports_pending_verification ?? 0);
  const openConflicts = (data.metrics.conflicts_requiring_review ?? data.metrics.conflicts_detected ?? 0);

  const activities = data.recent_activity || [];
  
  // Group activities by date
  const groupedActivities: { [key: string]: typeof activities } = {};
  for (const act of activities) {
    const group = formatDateGroup(act.created_at);
    if (!groupedActivities[group]) groupedActivities[group] = [];
    groupedActivities[group].push(act);
  }

  // Triage items needing attention
  const pendingReportsCount = reviewData?.categories.pending_reports.count || 0;
  const lowConfCount = reviewData?.categories.low_confidence.count || 0;
  const uncertainCount = reviewData?.categories.uncertain_results.count || 0;
  const totalNeedsAttention = (reviewData?.total_items || 0) + openConflicts;

  return (
    <div className="space-y-5">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Clinical information overview and document processing center
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/patients/new"
            className="clinical-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Patient</span>
          </Link>
          <Link
            to="/reports"
            className="clinical-btn-secondary"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* 4 Compact Metric Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Patients */}
        <div className="clinical-card p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Patients
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {totalPatients}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{totalPatients === 1 ? '1 active record' : `${totalPatients} active records`}</span>
            <Link to="/patients" className="text-teal-800 dark:text-teal-400 hover:underline font-medium">
              View
            </Link>
          </div>
        </div>

        {/* Metric 2: Documents */}
        <div className="clinical-card p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Documents
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {totalReports}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{pendingReportsCount} awaiting review</span>
            <Link to="/reports" className="text-teal-800 dark:text-teal-400 hover:underline font-medium">
              Inspect
            </Link>
          </div>
        </div>

        {/* Metric 3: Pending Review */}
        <div className="clinical-card p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pending Review
          </div>
          <div className="my-2">
            <div className={`text-2xl font-bold tracking-tight ${pendingReview > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              {pendingReview}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{pendingReview > 0 ? 'Requires attention' : 'All clear'}</span>
            <Link to="/verification" className="text-teal-800 dark:text-teal-400 hover:underline font-medium">
              Review
            </Link>
          </div>
        </div>

        {/* Metric 4: Open Conflicts */}
        <div className="clinical-card p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Open Conflicts
          </div>
          <div className="my-2">
            <div className={`text-2xl font-bold tracking-tight ${openConflicts > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {openConflicts}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{openConflicts > 0 ? 'Needs resolution' : 'Zero detected'}</span>
            <Link to="/review-center" className="text-teal-800 dark:text-teal-400 hover:underline font-medium">
              Resolve
            </Link>
          </div>
        </div>

      </div>

      {/* Main Two-Column Clinical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT (7 cols): Recent Activity Timeline */}
        <div className="lg:col-span-7 clinical-card flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Recent Activity</span>
            </h2>
            <Link to="/timeline" className="text-[11px] text-teal-800 dark:text-teal-400 hover:underline font-medium">
              Full Audit Trail →
            </Link>
          </div>

          <div className="p-4 flex-1">
            {activities.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No recent activity recorded"
                description="Activity records will appear automatically as patients are created and documents are processed."
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedActivities).map(([groupLabel, items]) => (
                  <div key={groupLabel} className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {groupLabel}
                    </div>
                    <div className="space-y-2 border-l border-slate-200 dark:border-slate-800 ml-1.5 pl-3">
                      {items.map(act => (
                        <div key={act.id} className="text-xs relative">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {act.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {formatTimestamp(act.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                            {act.description}
                          </p>
                          {act.patient_identifier && (
                            <div className="mt-1">
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {act.patient_identifier}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT (5 cols): Needs Attention */}
        <div className="lg:col-span-5 clinical-card flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Needs Attention</span>
            </h2>
            <Link to="/review-center" className="text-[11px] text-teal-800 dark:text-teal-400 hover:underline font-medium">
              Review Center ({totalNeedsAttention})
            </Link>
          </div>

          <div className="p-4 flex-1">
            {totalNeedsAttention === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No items require attention"
                description="All uploaded documents have been verified and zero cross-record conflicts are detected."
              />
            ) : (
              <div className="space-y-2.5">
                {/* Pending Verifications */}
                {pendingReview > 0 && (
                  <div className="p-3 rounded border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>{pendingReview} test results awaiting verification</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        Human verification required before authoritative inclusion.
                      </p>
                    </div>
                    <Link
                      to="/verification"
                      className="clinical-btn-primary shrink-0 text-xs py-1 px-2.5"
                    >
                      Review
                    </Link>
                  </div>
                )}

                {/* Open Conflicts */}
                {openConflicts > 0 && (
                  <div className="p-3 rounded border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>{openConflicts} cross-record clinical conflict{openConflicts > 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        Contradictions detected between allergies/medications or reports.
                      </p>
                    </div>
                    <Link
                      to="/review-center"
                      className="clinical-btn-danger shrink-0 text-xs py-1 px-2.5"
                    >
                      Resolve
                    </Link>
                  </div>
                )}

                {/* Low confidence extractions */}
                {lowConfCount > 0 && (
                  <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {lowConfCount} low-confidence extraction{lowConfCount > 1 ? 's' : ''} (&lt;75%)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Manual validation of source snippet recommended.
                      </p>
                    </div>
                    <Link
                      to="/review-center"
                      className="clinical-btn-secondary shrink-0 text-xs py-1 px-2.5"
                    >
                      Inspect
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
