import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Cpu, 
  UserCheck, 
  Eye, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EvidenceData } from '../../types';

interface Props {
  resultId: number | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const EvidenceViewerModal: React.FC<Props> = ({ resultId, isOpen = true, onClose }) => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<EvidenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resultId) return;
    const fetchEvidence = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/extracted-results/${resultId}/evidence`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError('Could not retrieve evidence data for this result.');
        }
      } catch (err) {
        setError('Network error loading evidence.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvidence();
  }, [resultId]);

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

  if (!isOpen || !resultId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-2xl w-full p-5 my-8 space-y-4 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-900 text-white flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Evidence & Provenance Viewer</h2>
              <p className="text-[11px] text-slate-500">Documentary source verification and pipeline traceability</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Loading documentary evidence...</p>
          </div>
        ) : error || !data ? (
          <div className="py-8 text-center text-xs text-rose-700 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto text-rose-600" />
            <p>{error || 'Evidence could not be loaded.'}</p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            
            {/* Top Grid: Source Document & Structured Result */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* Box 1: SOURCE DOCUMENT */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-900" />
                    Source Document
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {data.patient.patient_identifier}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Report Title:</span>
                    <strong className="text-slate-900 font-medium">{data.report.title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <span className="text-slate-500 block">Date:</span>
                      <span className="text-slate-800">{data.report.date || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Location:</span>
                      <span className="text-slate-800">
                        {data.result.page_number ? `Page ${data.result.page_number}` : 'Source location unavailable.'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Laboratory / Facility:</span>
                    <span className="text-slate-800">{data.report.laboratory}</span>
                  </div>
                </div>

                {/* Verbatim Source Snippet */}
                <div className="pt-1.5">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                    Verbatim Document Excerpt
                  </span>
                  <div className="bg-white p-2 rounded border border-slate-200 text-[11px] font-mono text-slate-800 select-all leading-relaxed break-words">
                    "{data.result.source_snippet}"
                  </div>
                </div>
              </div>

              {/* Box 2: STRUCTURED RESULT */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-900" />
                    Structured Result
                  </span>
                  <div>
                    {renderStatusBadge(data.result.status)}
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Test Name:</span>
                    <strong className="text-slate-900 font-medium text-xs">{data.result.test_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <span className="text-slate-500 block">Extracted Value:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {data.result.verified_value ? (
                          <span title={`Corrected from: ${data.result.value}`}>
                            {data.result.verified_value} {data.result.unit || ''} (verified)
                          </span>
                        ) : (
                          <span>{data.result.value} {data.result.unit || ''}</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Extraction Confidence:</span>
                      <span className="font-mono text-slate-800">{data.result.confidence_score}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reference Interval Sourced:</span>
                    <span className="font-mono text-slate-800">
                      {data.result.reference_range || <em className="text-slate-400">Not provided by report</em>}
                    </span>
                  </div>
                </div>

                {/* Status & Provenance Tags */}
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                    <Cpu className="w-2.5 h-2.5" />
                    AI Extracted
                  </span>
                  {data.result.verified ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <UserCheck className="w-2.5 h-2.5" />
                      Human Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock className="w-2.5 h-2.5" />
                      Verification Pending
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* FEATURE 7: "How this result was produced" Pipeline Progression */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-900" />
                  How this result was produced
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  AI assists • Evidence supports • Humans verify
                </span>
              </div>

              <div className="space-y-2">
                {data.pipeline.map((step) => {
                  const isCompleted = step.status === 'completed';
                  const isPending = step.status === 'pending';
                  return (
                    <div key={step.step} className="flex items-start gap-2.5 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        isCompleted 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : isPending
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {isCompleted ? '✓' : step.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-[11px]">{step.title}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-bold ${
                            isCompleted ? 'bg-emerald-50 text-emerald-800' : isPending ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Non-Diagnostic Footnote */}
            <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
              <span>This evidence viewer displays documentary provenance and does not constitute medical diagnosis.</span>
              <button
                onClick={onClose}
                className="clinical-btn-secondary py-1 px-3 text-xs"
              >
                Close
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
