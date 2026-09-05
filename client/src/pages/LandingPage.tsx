import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  ArrowRight, 
  FileText, 
  CheckCheck, 
  Scale, 
  Quote, 
  Layers, 
  ShieldAlert,
  ClipboardList
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  const coreCapabilities = [
    {
      title: 'Patient Information Intake',
      description: 'Structured collection of symptoms, chronic conditions, verified allergies, active medications, and surgical history with clear source attribution.',
      icon: Layers,
    },
    {
      title: 'Medical Report Ingestion',
      description: 'Secure ingestion and optical parsing of PDF, PNG, JPG, and JPEG laboratory documents into structured clinical data points.',
      icon: FileText,
    },
    {
      title: 'Deterministic Range Evaluation',
      description: 'Classification into Low, Normal, High, or Unknown based strictly on laboratory reference ranges provided in the document.',
      icon: Scale,
    },
    {
      title: 'Human Verification Queue',
      description: 'Clinician-in-the-loop review queue allowing authorized reviewers to accept, edit, reject, or mark results uncertain with an immutable audit trail.',
      icon: CheckCheck,
    },
    {
      title: 'Source Provenance',
      description: 'Full traceability from patient to report, extracted result, verbatim source snippet, extraction confidence, and reviewer audit log.',
      icon: Quote,
    },
    {
      title: 'Clinical Summarization',
      description: 'Structured clinical summary synthesized exclusively from human-verified results and user-provided profile data, guarded by clinical safety notices.',
      icon: ClipboardList,
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      
      {/* Top Banner: Clinical Safety Notice */}
      <aside aria-label="Clinical Notice" className="bg-amber-50/80 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-950">
        <span className="font-semibold mr-1.5">CLINICAL NOTICE:</span>
        MedLens organizes and summarizes medical records. It does <u>not</u> diagnose diseases, prescribe treatment, or recommend medications/dosages.
      </aside>

      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-900 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base text-slate-900 tracking-tight">MedLens</span>
              <span className="ml-2 text-[11px] font-medium text-slate-500 hidden sm:inline">
                Clinical Information System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="clinical-btn-primary"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="clinical-btn-secondary"
                >
                  Clinician Sign In
                </Link>
                <Link
                  to="/login"
                  className="clinical-btn-primary"
                >
                  <span>Open Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200">
            Healthcare Information Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-tight">
            Structured Clinical Data Extraction & Verification System
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            MedLens ingests clinical laboratory and diagnostic reports, extracts structured observations with verbatim provenance quotes, applies deterministic reference-range rules, and provides a clinician review queue.
          </p>

          <div className="pt-3 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/login"
              className="clinical-btn-primary py-2.5 px-5 text-sm"
            >
              <span>Access Clinical Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="clinical-btn-secondary py-2.5 px-5 text-sm"
            >
              One-Click Reviewer Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Core Capabilities</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Designed for institutional record organization, traceability, and supervised review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreCapabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{cap.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety & Compliance Section */}
      <section className="py-8 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>Clinical Boundaries & Grounding</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            MedLens strictly maintains an information-support boundary. Extracted values are compared against report-defined reference ranges via deterministic rules in application code. Final clinical summaries are synthesized exclusively from clinician-verified findings and user-provided profile data, with full source provenance linked to each result.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MedLens Clinical Information Intelligence • Version 1.0</span>
          <span>Node.js / Express / SQLite / Gemini Clinical Pipeline</span>
        </div>
      </footer>

    </div>
  );
};
