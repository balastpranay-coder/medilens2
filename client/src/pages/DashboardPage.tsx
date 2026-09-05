import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardData } from '../types';
import { 
  Users, 
  FileText, 
  CheckCheck, 
  AlertCircle, 
  Plus, 
  Upload, 
  ChevronRight, 
  Activity,
  ArrowRight
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [reviewTotal, setReviewTotal] = useState<number>(0);
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
        setError('Failed to load clinical dashboard metrics.');
      }

      if (reviewRes.ok) {
        const rJson = await reviewRes.json();
        setReviewTotal(rJson.total_needs_review || 0);
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

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="clinical-card p-6 text-center max-w-md mx-auto mt-8">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-900 mb-1">Dashboard Error</h2>
        <p className="text-xs text-slate-600 mb-4">{error || 'Unable to retrieve dashboard metrics.'}</p>
        <button onClick={fetchDashboardData} className="clinical-btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const pendingCount = data.metrics.pending_verification ?? data.metrics.reports_pending_verification ?? 0;
  const conflictsCount = data.metrics.conflicts_requiring_review ?? data.metrics.conflicts_detected ?? 0;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of your clinical records and report processing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/review-center" className="clinical-btn-secondary relative flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Review Center</span>
            {reviewTotal > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                {reviewTotal} {reviewTotal === 1 ? 'item' : 'items'} need review
              </span>
            )}
          </Link>
          <Link to="/patients/new" className="clinical-btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Patient</span>
          </Link>
          <Link to="/reports" className="clinical-btn-secondary">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Report</span>
          </Link>
          <Link to="/verification" className="clinical-btn-secondary">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Verification Queue</span>
          </Link>
        </div>
      </div>

      {/* Review Center Attention Notice */}
      {reviewTotal > 0 && (
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Attention Required:</strong> {reviewTotal} {reviewTotal === 1 ? 'clinical item requires' : 'clinical items require'} human attention across your patients and reports.
            </span>
          </div>
          <Link to="/review-center" className="font-semibold text-amber-900 hover:underline flex items-center gap-1 shrink-0 ml-3">
            <span>Open Review Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 4 Simple Rectangular Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Patients */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs font-medium text-slate-500 block">Patients</span>
          <div className="text-2xl font-semibold text-slate-900 mt-1">
            {data.metrics.total_patients}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Total patient records
          </span>
        </div>

        {/* Card 2: Reports */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs font-medium text-slate-500 block">Reports</span>
          <div className="text-2xl font-semibold text-slate-900 mt-1">
            {data.metrics.total_reports}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Uploaded reports
          </span>
        </div>

        {/* Card 3: Awaiting Verification */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs font-medium text-slate-500 block">Awaiting Verification</span>
          <div className={`text-2xl font-semibold mt-1 ${pendingCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {pendingCount}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Require review
          </span>
        </div>

        {/* Card 4: Open Conflicts */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs font-medium text-slate-500 block">Open Conflicts</span>
          <div className={`text-2xl font-semibold mt-1 ${conflictsCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {conflictsCount}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Need attention
          </span>
        </div>

      </div>

      {/* Main Content: Recent Activity (clean list) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
            <p className="text-[11px] text-slate-500">Chronological clinical actions recorded in database</p>
          </div>
          <Link to="/timeline" className="text-xs font-medium text-blue-900 hover:underline">
            View All Timeline
          </Link>
        </div>

        {!data.recent_activity || data.recent_activity.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No clinical activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recent_activity.slice(0, 8).map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{evt.title}</span>
                    {evt.patient_identifier && (
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                        {evt.patient_identifier}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-1">{evt.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 font-medium block" title={new Date(evt.created_at).toLocaleString()}>
                    {formatTimeAgo(evt.created_at)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {evt.author_name || user?.full_name || user?.email || 'Reviewer'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Patients & Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Recent Patients Table */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Recent Patients</h2>
            <Link to="/patients" className="text-xs font-medium text-blue-900 hover:underline">
              View All
            </Link>
          </div>

          {!data.recent_patients || data.recent_patients.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No patients yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 font-medium">
                  <th className="pb-2">Patient</th>
                  <th className="pb-2">Demographics</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recent_patients.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 font-medium text-slate-900">{p.patient_identifier}</td>
                    <td className="py-2 text-slate-600">
                      {p.age !== null ? `${p.age} yrs` : 'Age N/A'}, {p.sex}
                    </td>
                    <td className="py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        to={`/patients/${p.id}`}
                        className="text-xs text-blue-900 hover:underline font-medium"
                      >
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Reports Table */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Recent Reports</h2>
            <Link to="/reports" className="text-xs font-medium text-blue-900 hover:underline">
              View All
            </Link>
          </div>

          {!data.recent_reports || data.recent_reports.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No reports uploaded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 font-medium">
                  <th className="pb-2">Report</th>
                  <th className="pb-2">Patient</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recent_reports.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 font-medium text-slate-900 truncate max-w-[150px]">
                      {r.report_title}
                    </td>
                    <td className="py-2 text-slate-600 font-mono">
                      {r.patient_identifier || `PT-${r.patient_id}`}
                    </td>
                    <td className="py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                        r.verification_status === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {r.verification_status || r.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        to={`/reports/${r.id}`}
                        className="text-xs text-blue-900 hover:underline font-medium"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
};
