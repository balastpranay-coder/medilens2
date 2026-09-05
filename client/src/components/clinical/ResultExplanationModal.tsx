import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  ShieldAlert, 
  FileText, 
  Calculator, 
  Info,
  AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ResultExplanation } from '../../types';

interface Props {
  resultId: number | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const ResultExplanationModal: React.FC<Props> = ({ resultId, isOpen = true, onClose }) => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<ResultExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resultId) return;

    const fetchExplanation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/extracted-results/${resultId}/explain`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError('Could not generate explanation for this result.');
        }
      } catch (err) {
        setError('Network error while requesting explanation.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [resultId, isOpen]);

  if (!isOpen || !resultId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-lg w-full p-5 space-y-4 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-900 text-white flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Result Evaluation & Explanation</h2>
              <p className="text-[11px] text-slate-500">Document-grounded factual analysis</p>
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
          <div className="py-10 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Evaluating document references...</p>
          </div>
        ) : error || !data ? (
          <div className="py-6 text-center text-xs text-rose-700 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto text-rose-600" />
            <p>{error || 'Explanation unavailable.'}</p>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            
            {/* Section 1: Reported Information */}
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-blue-900" />
                Reported Information
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block">Test:</span>
                  <strong className="text-slate-900">{data.test_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Reported Value:</span>
                  <strong className="text-slate-900 font-mono">{data.reported_value} {data.unit || ''}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Report-Provided Reference Range:</span>
                  <span className="text-slate-900 font-mono">{data.reference_range}</span>
                </div>
              </div>
            </div>

            {/* Section 2: System Calculation */}
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                <Calculator className="w-3.5 h-3.5 text-blue-900" />
                System Calculation
              </div>
              <div className="text-[11px] pt-1">
                <span className="text-slate-500 block">Deterministic Range Status:</span>
                <span className="font-semibold text-slate-900 uppercase">{data.system_status}</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Evaluated using rule-based comparison code without external AI diagnosis.
                </p>
              </div>
            </div>

            {/* Section 3: Safe Factual Explanation */}
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-md p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-blue-950 text-[11px] uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-blue-900" />
                Factual Narrative
              </div>
              <p className="text-slate-700 text-xs leading-relaxed pt-0.5">
                {data.explanation}
              </p>
            </div>

            {/* Safety Mandate Notice */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-md p-2.5 flex items-start gap-2 text-[10px] text-amber-950">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Clinical Notice:</strong> {data.disclaimer}
              </p>
            </div>

            {/* Footer button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={onClose}
                className="clinical-btn-secondary py-1.5 px-3 text-xs"
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
