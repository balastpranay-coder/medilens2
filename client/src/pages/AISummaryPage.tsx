import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Patient, AISummary } from '../types';
import { 
  FileText, 
  ShieldAlert, 
  Copy, 
  Printer, 
  ChevronRight, 
  AlertCircle,
  Clock,
  Sparkles,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const AISummaryPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { success, error } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [activeSummary, setActiveSummary] = useState<AISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        const list = data.patients || [];
        setPatients(list);
        if (list.length > 0 && selectedPatientId === null) {
          setSelectedPatientId(list[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatientDetails = async (patientId: number) => {
    try {
      const [pRes, sRes] = await Promise.all([
        authFetch(`/api/patients/${patientId}`),
        authFetch(`/api/patients/${patientId}/summaries`)
      ]);

      if (pRes.ok) {
        const data = await pRes.json();
        setPatientData(data);
      }

      if (sRes.ok) {
        const sData = await sRes.json();
        const list = sData.summaries || [];
        setSummaries(list);
        if (list.length > 0) {
          setActiveSummary(list[0]);
        } else {
          setActiveSummary(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleGenerateSummary = async () => {
    if (!selectedPatientId) return;
    setIsGenerating(true);
    try {
      const res = await authFetch('/api/summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId })
      });

      if (res.ok) {
        success('Clinical summary generated from human-verified patient records.');
        fetchPatientDetails(selectedPatientId);
      } else {
        const errJson = await res.json().catch(() => ({}));
        error(errJson.error || 'Failed to generate summary.');
      }
    } catch (err) {
      error('Server communication error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!activeSummary) return;
    navigator.clipboard.writeText(activeSummary.content || activeSummary.summary_content || '');
    success('Summary copied to clipboard.');
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Clinical Summary</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Structured patient record summary synthesized strictly from verified laboratory findings and clinical intake
          </p>
        </div>

        <div className="flex items-center gap-2">
          {patients.length > 0 && (
            <select
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="clinical-input py-1.5 text-xs font-mono"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.patient_identifier} ({p.sex}, {p.age ? `${p.age}y` : 'Age N/A'})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating || !selectedPatientId}
            className="clinical-btn-primary"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing...' : 'Generate Summary'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading clinical summary workspace..." rows={5} />
      ) : !selectedPatientId ? (
        <EmptyState
          icon={UserIcon}
          title="No patients available"
          description="Register a patient profile to generate a structured clinical summary."
          actionLabel="New Patient"
          actionHref="/patients/new"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Left Column: Patient Context & History */}
          <div className="space-y-3">
            
            {/* Patient Card */}
            {patientData?.patient && (
              <div className="clinical-card p-3.5 space-y-2 text-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Patient Identifier</span>
                  <Link to={`/patients/${patientData.patient.id}`} className="font-mono font-bold text-teal-800 dark:text-teal-400 hover:underline text-sm">
                    {patientData.patient.patient_identifier}
                  </Link>
                </div>
                <div className="text-slate-600 dark:text-slate-300 space-y-1 text-[11px]">
                  <div>Age: <strong>{patientData.patient.age !== null ? `${patientData.patient.age} yrs` : 'N/A'}</strong></div>
                  <div>Sex: <strong>{patientData.patient.sex}</strong></div>
                  <div>Status: <span className="badge-normal text-[10px]">{patientData.patient.status}</span></div>
                </div>
              </div>
            )}

            {/* Version History */}
            <div className="clinical-card p-3.5 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                Summary Versions ({summaries.length})
              </span>
              {summaries.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No summary generated yet.</p>
              ) : (
                <div className="space-y-1">
                  {summaries.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSummary(s)}
                      className={`w-full text-left p-2 rounded text-xs transition-colors flex items-center justify-between ${
                        activeSummary?.id === s.id
                          ? 'bg-slate-100 dark:bg-slate-800 text-teal-900 dark:text-teal-300 font-semibold border border-teal-800/40 dark:border-teal-500/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div>Version {summaries.length - idx}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(s.generated_at || s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Structured Clinical Summary */}
          <div className="lg:col-span-3 space-y-3">
            {!activeSummary ? (
              <div className="clinical-card p-8 text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No summary generated for this patient</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Click "Generate Summary" above to synthesize an evidence-grounded clinical summary from verified laboratory data.
                </p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGenerating}
                  className="clinical-btn-primary"
                >
                  Generate Clinical Summary
                </button>
              </div>
            ) : (
              <div className="clinical-card p-5 space-y-4">
                
                {/* Actions Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="badge-verified">Verified Records Only</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Generated {new Date(activeSummary.generated_at || activeSummary.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copyToClipboard}
                      className="clinical-btn-secondary py-1 text-xs"
                      title="Copy markdown text"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="clinical-btn-secondary py-1 text-xs"
                      title="Print record"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Markdown Content */}
                <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed font-sans space-y-3">
                  <pre className="whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200 bg-transparent p-0 m-0 border-0">
                    {activeSummary.content || activeSummary.summary_content}
                  </pre>
                </div>

                {/* Mandatory Clinical Safety Notice */}
                <div className="p-3 rounded bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Notice:</strong> This summary organizes available medical information for clinical review. It is strictly non-diagnostic and must not replace clinical judgement or autonomous medical decisions.
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
