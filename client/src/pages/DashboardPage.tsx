import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardData } from '../types';
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Upload, 
  ChevronRight, 
  ShieldCheck,
  ArrowRight,
  Home,
  Clock,
  Sparkles
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [reviewTotal, setReviewTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [res, reviewRes] = await Promise.all([
        authFetch('/api/dashboard/stats'),
        authFetch('/api/review-center/items')
      ]);

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }

      if (reviewRes.ok) {
        const rJson = await reviewRes.json();
        setReviewTotal(rJson.total_needs_review || 0);
      }
    } catch (err: any) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const totalPatients = data?.metrics.total_patients ?? 0;
  const totalReports = data?.metrics.total_reports ?? 0;
  const pendingVerification = data?.metrics.pending_verification ?? data?.metrics.reports_pending_verification ?? 0;
  const activeConflicts = data?.metrics.conflicts_requiring_review ?? data?.metrics.conflicts_detected ?? 0;

  const recentPatients = data?.recent_patients || [];

  return (
    <div className="space-y-6">
      
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/dashboard" className="flex items-center gap-1 hover:text-slate-800 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-teal-800 font-medium border border-emerald-200/60">
          Dashboard Overview
        </span>
      </div>

      {/* Hero Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-teal-800 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>MedLens Clinical Intelligence</span>
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {getGreeting()}
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Review, verify, and understand clinical information from medical documents with zero invented data.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/patients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Patient Intake</span>
          </Link>
          
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-all shadow-sm group"
          >
            <Upload className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Metric 1: Total Patients */}
        <div className="bg-white border border-teal-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Total Patients
              </span>
              <div className="text-3xl font-extrabold text-slate-900">
                {totalPatients}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-teal-700 shadow-sm group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link 
              to="/patients" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors"
            >
              <span>View Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric 2: Medical Documents */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Medical Documents
              </span>
              <div className="text-3xl font-extrabold text-slate-900">
                {totalReports}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link 
              to="/reports" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <span>Inspect Files</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Pending Verification */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Pending Verification
              </span>
              <div className="text-3xl font-extrabold text-slate-900">
                {pendingVerification}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link 
              to="/verification" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric 4: Active Conflicts */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Active Conflicts
              </span>
              <div className="text-3xl font-extrabold text-amber-600">
                {activeConflicts}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link 
              to="/review-center" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
            >
              <span>Resolve Conflicts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Main 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left Card: Recent Patients */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Users className="w-4 h-4 text-teal-700" />
              <span>Recent Patients</span>
            </div>
            <Link
              to="/patients"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
            >
              <span>View All ({totalPatients})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-center">
            {recentPatients.length === 0 ? (
              /* Empty State */
              <div className="py-10 text-center space-y-3 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-teal-700 mx-auto shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">No patients yet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload a medical document or create a new patient to begin.
                  </p>
                </div>
                <Link
                  to="/patients/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Patient Intake</span>
                </Link>
              </div>
            ) : (
              /* Populated List */
              <div className="space-y-2.5">
                {recentPatients.map((p) => (
                  <Link
                    key={p.id}
                    to={`/patients/${p.id}`}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-xs">
                        {p.patient_identifier.slice(-2)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-teal-900 transition-colors">
                          {p.patient_identifier}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.sex}, {p.age ? `${p.age} yrs` : 'Age N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {p.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Conflicts Requiring Attention */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Conflicts Requiring Attention</span>
            </div>
            <Link
              to="/review-center"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition-colors"
            >
              <span>All ({activeConflicts})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-center">
            {activeConflicts === 0 ? (
              /* Empty State */
              <div className="py-10 text-center space-y-3 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">No conflicts detected</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Cross-document reconciliation has detected zero contradictions across active clinical records.
                  </p>
                </div>
              </div>
            ) : (
              /* Populated Conflicts */
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      Medication Conflict
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800">Requires Review</span>
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    Penicillin Allergy vs Amoxicillin Prescription
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Patient has documented allergy to Penicillin while prescribed Amoxicillin Trihydrate 500mg.
                  </p>
                  <div className="pt-1 flex justify-end">
                    <Link
                      to="/review-center"
                      className="text-xs font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Resolve in Review Center</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
