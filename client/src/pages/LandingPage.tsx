import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, 
  ArrowRight, 
  FileText, 
  CheckCheck, 
  Scale, 
  Quote, 
  Layers, 
  ShieldAlert,
  ClipboardList,
  Upload,
  Cpu,
  UserCheck,
  GitCompare,
  AlertTriangle,
  Lock,
  SearchCode
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  const workflowSteps = [
    {
      step: '01',
      title: 'Upload Authorized Reports',
      description: 'Ingest laboratory diagnostics in PDF, PNG, JPG, or JPEG formats into private, isolated clinical storage.',
      icon: Upload
    },
    {
      step: '02',
      title: 'Extract & Deterministic Range Structure',
      description: 'Optical and semantic text parsing extracts clinical parameters with exact verbatim provenance snippets and report-defined reference ranges.',
      icon: Cpu
    },
    {
      step: '03',
      title: 'Human Review & Verification',
      description: 'Clinicians accept, edit, or reject observations with an immutable audit log before structured records become authoritative.',
      icon: UserCheck
    }
  ];

  const coreCapabilities = [
    {
      title: 'Structured Extraction',
      description: 'Automated tabular parsing of clinical tests, numerical values, units, and source reference intervals.',
      icon: Layers,
    },
    {
      title: 'Source Evidence & Provenance',
      description: 'Every extracted value links directly back to its verbatim source document quote and page index.',
      icon: Quote,
    },
    {
      title: 'Deterministic Range Evaluation',
      description: 'Strict, rule-based classification into Low, Normal, High, or Unknown derived exclusively from source ranges.',
      icon: Scale,
    },
    {
      title: 'Human Verification Center',
      description: 'Supervised review queue ensuring AI remains assistive while clinicians maintain authoritative decision control.',
      icon: CheckCheck,
    },
    {
      title: 'Conflict & Discrepancy Detection',
      description: 'Cross-document reconciliation flags conflicting ages, inconsistent medications, and divergent measurements.',
      icon: AlertTriangle,
    },
    {
      title: 'Safe Clinical Summaries',
      description: 'Synthesized reports generated strictly from verified observations with clear non-diagnostic safety guardrails.',
      icon: ClipboardList,
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Top Banner: Clinical Safety Notice */}
      <aside aria-label="Clinical Notice" className="bg-[#fffef2] dark:bg-amber-950/40 border-b border-[#fef08a] dark:border-amber-900/60 px-4 py-2 text-center text-xs text-amber-950 dark:text-amber-200 transition-colors">
        <span className="font-bold mr-1.5">SAFETY NOTICE:</span>
        MedLens organizes and summarizes medical documents. It must <strong>never</strong> diagnose diseases, prescribe treatment, recommend medications or dosages, or make autonomous clinical decisions.
      </aside>

      {/* Navigation Header */}
      <header className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">MedLens</span>
              <span className="ml-2 text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider hidden sm:inline">
                CLINICAL INTELLIGENCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  Clinician Sign In
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-xs font-semibold text-teal-800 dark:text-emerald-300 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-teal-700 dark:text-emerald-400" />
            <span>AI-Powered Clinical Information Intelligence</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Transform Fragmented Medical Documents into <span className="text-teal-700 dark:text-teal-400">Traceable Intelligence</span>
          </h1>
          
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Transform fragmented patient information and medical reports into structured, traceable information for faster, more reliable clinical review with zero invented data.
          </p>

          <div className="pt-4 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition-all shadow-sm hover:shadow"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-all"
            >
              See How It Works
            </a>
          </div>

          {/* Differentiator Callout */}
          <div className="pt-6 max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-center">
              <span className="font-bold text-slate-900 dark:text-white">Core Principle: </span>
              MedLens doesn't just summarize medical reports. It converts fragmented information into structured, traceable records while keeping human reviewers in control.
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Production Workflow Section */}
      <section id="how-it-works" className="py-14 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            How MedLens Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            A 3-step evidence-first workflow built for clinical accuracy, provenance tracing, and human oversight.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workflowSteps.map((ws) => {
            const Icon = ws.icon;
            return (
              <div key={ws.step} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-teal-700 dark:text-teal-400 font-mono">
                      {ws.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-teal-700 dark:text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {ws.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {ws.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className="py-14 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-8 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Production Clinical Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Designed specifically for hospital clinicians, diagnostic labs, and medical record reviewers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coreCapabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div key={idx} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-teal-700 dark:text-emerald-400">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {cap.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-700 flex items-center justify-center text-white text-[11px] font-bold">
              ML
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">MedLens</span>
            <span>• Clinical Information Intelligence</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Strictly Non-Diagnostic • Human Reviewer Supervised
          </div>
        </div>
      </footer>

    </div>
  );
};
