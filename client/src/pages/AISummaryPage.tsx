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
  AlertCircle
} from 'lucide-react';

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
      const res = await authFetch(`/api/patients/${selectedPatientId}/summary/generate`, {
        method: 'POST'
      });

      if (res.ok) {
        success('Clinical summary generated from verified patient records.');
        fetchPatientDetails(selectedPatientId);
      } else {
        const errJson = await res.json();
        error(errJson.error || 'Failed to generate summary.');
      }
    } catch (err) {
      error('Network communication error.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header per Section 11 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clinical Summary</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Summary generated from verified patient information and extracted report results.
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
                  {p.patient_identifier} ({p.sex}, {p.age ? `${p.age} yrs` : 'Age N/A'})
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
            <span>{isGenerating ? 'Generating...' : 'Generate Clinical Summary'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-xs text-slate-500">
          <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading patient summary data...
        </div>
      ) : !selectedPatientId ? (
        <div className="p-10 text-center bg-white border border-slate-200 rounded-lg space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">No patients available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a patient profile to generate a structured clinical summary.
          </p>
          <div className="pt-2">
            <Link to="/patients/new" className="clinical-btn-primary">
              Add Patient
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          
          {/* Left Column: Summary Versions & Patient Meta */}
          <div className="space-y-4">
            
            {/* Patient Context Card */}
            {patientData?.patient && (
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                <div className="border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Patient Record</span>
                  <Link to={`/patients/${patientData.patient.id}`} className="font-mono font-semibold text-blue-900 hover:underline text-sm">
                    {patientData.patient.patient_identifier}
                  </Link>
                </div>
                <div className="text-slate-600 space-y-1 text-[11px]">
                  <div>Age: <strong>{patientData.patient.age !== null ? `${patientData.patient.age} yrs` : 'N/A'}</strong></div>
                  <div>Sex: <strong>{patientData.patient.sex}</strong></div>
                  <div>Verified Results: <strong>{patientData.extracted_count || 0}</strong></div>
                  <div>Uploaded Reports: <strong>{patientData.report_count || 0}</strong></div>
                </div>
              </div>
            )}

            {/* Version History */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Summary Versions ({summaries.length})
              </span>
              {summaries.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No summaries generated.</p>
              ) : (
                <div className="space-y-1">
                  {summaries.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSummary(s)}
                      className={`w-full text-left p-2 rounded text-xs transition-colors flex items-center justify-between ${
                        activeSummary?.id === s.id
                          ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                          : 'hover:bg-slate-50 text-slate-700'
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

          {/* Right Column: Structured Document View */}
          <div className="lg:col-span-3 space-y-4">
            {!activeSummary ? (
              <div className="p-10 text-center bg-white border border-slate-200 rounded-lg space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <h3 className="text-sm font-semibold text-slate-800">No Summary Generated Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "Generate Clinical Summary" to synthesize available verified laboratory results and user profile data.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGenerating}
                    className="clinical-btn-primary"
                  >
                    Generate Summary Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                
                {/* Header Actions */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="text-xs text-slate-500">
                    <span>Generated on: <strong>{new Date(activeSummary.generated_at || activeSummary.created_at).toLocaleString()}</strong></span>
                    {activeSummary.based_on_report_ids && (
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        Contributing Reports: {activeSummary.based_on_report_ids}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeSummary.content);
                        success('Summary copied to clipboard.');
                      }}
                      className="clinical-btn-secondary py-1 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="clinical-btn-secondary py-1 text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Structured Document Content */}
                <div className="whitespace-pre-wrap font-sans text-slate-800 text-xs sm:text-sm leading-relaxed space-y-3 py-1">
                  {activeSummary.content}
                </div>

                {/* Mandatory Clinical Disclaimer Banner at the bottom per Section 10 & 11 */}
                <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-950 flex items-start gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-950">Important Notice:</span>
                    <p className="mt-0.5 text-amber-900 leading-relaxed">
                      This summary organizes the available information for review and is not a medical diagnosis or treatment recommendation.
                    </p>
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
