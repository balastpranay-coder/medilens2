import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ExtractedResult } from '../types';
import { 
  Check, 
  Edit2, 
  XCircle, 
  HelpCircle, 
  CheckCircle2, 
  ExternalLink,
  History,
  X,
  AlertCircle,
  ShieldAlert,
  FileCheck2,
  Clock
} from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { EvidenceViewerModal } from '../components/clinical/EvidenceViewerModal';

export const VerificationPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [results, setResults] = useState<ExtractedResult[]>([]);
  const [filterAction, setFilterAction] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(true);

  // Edit value modal
  const [editingResult, setEditingResult] = useState<ExtractedResult | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evidence modal
  const [evidenceResultId, setEvidenceResultId] = useState<number | null>(null);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/verification/pending');
      if (res.ok) {
        const json = await res.json();
        setResults(json.pending_results || []);
      }
    } catch (err) {
      error('Failed to load verification queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleAction = async (resultId: number, action: 'accepted' | 'edited' | 'rejected' | 'marked_uncertain', correctedValue?: string) => {
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/verification/verify-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          result_id: resultId, 
          action, 
          custom_value: correctedValue 
        })
      });

      if (res.ok) {
        success(`Result ${action === 'accepted' ? 'accepted and verified' : action}.`);
        if (editingResult) {
          setEditingResult(null);
          setEditValue('');
        }
        fetchResults();
      } else {
        const data = await res.json().catch(() => ({}));
        error(data.error || 'Failed to submit verification action.');
      }
    } catch (err) {
      error('Server communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
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

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Verification Queue
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review extracted laboratory values before they become authoritative clinical records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchResults()}
            className="clinical-btn-secondary"
          >
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-2.5 rounded-md bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 text-xs text-teal-950 dark:text-teal-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-teal-800 dark:text-teal-400 shrink-0" />
          <span>
            <strong>Human Supervision Required:</strong> AI-extracted values are non-authoritative until verified and accepted by a human reviewer.
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900 px-1.5 py-0.5 rounded shrink-0">
          Supervised Intake
        </span>
      </div>

      {/* Verification Queue Table */}
      <div className="clinical-card overflow-hidden">
        {isLoading ? (
          <LoadingState message="Loading unverified test queue..." rows={5} />
        ) : results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Document</th>
                  <th>Test Name</th>
                  <th>Extracted Value</th>
                  <th>Reference Range</th>
                  <th>Confidence</th>
                  <th>System Status</th>
                  <th className="text-right">Reviewer Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                      {r.patient_identifier || 'PT-RECORD'}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300 max-w-[150px] truncate">
                      <Link to={`/reports/${r.report_id}`} className="hover:underline text-teal-800 dark:text-teal-400">
                        {r.report_title || `Report #${r.report_id}`}
                      </Link>
                    </td>
                    <td className="font-semibold text-slate-900 dark:text-white">
                      <div>{r.test_name}</div>
                      <button
                        onClick={() => setEvidenceResultId(r.id)}
                        className="text-[10px] text-slate-400 hover:text-teal-800 dark:hover:text-teal-400 underline font-normal mt-0.5"
                      >
                        View Evidence Snippet
                      </button>
                    </td>
                    <td className="font-mono font-bold text-slate-900 dark:text-white">
                      {r.value} {r.unit || ''}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {r.reference_range || 'Not provided'}
                    </td>
                    <td>
                      <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        {r.confidence_score}%
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleAction(r.id, 'accepted')}
                          disabled={isSubmitting}
                          title="Accept verbatim value"
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingResult(r);
                            setEditValue(r.value);
                          }}
                          disabled={isSubmitting}
                          title="Correct value"
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleAction(r.id, 'marked_uncertain')}
                          disabled={isSubmitting}
                          title="Mark uncertain"
                          className="p-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleAction(r.id, 'rejected')}
                          disabled={isSubmitting}
                          title="Reject result"
                          className="p-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Verification queue is clear"
            description="All extracted laboratory results have been reviewed and verified. New uploaded documents will appear here automatically."
            actionLabel="Upload Medical Report"
            onAction={() => navigate('/reports')}
          />
        )}
      </div>

      {/* Edit Value Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                Edit Value for {editingResult.test_name}
              </h3>
              <button onClick={() => setEditingResult(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                <span className="text-slate-500">Source verbatim: </span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{editingResult.source_snippet}</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Corrected Numeric Value
                </label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="clinical-input w-full"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setEditingResult(null)} className="clinical-btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleAction(editingResult.id, 'edited', editValue)}
                disabled={isSubmitting || !editValue.trim()}
                className="clinical-btn-primary"
              >
                Save & Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Viewer Modal */}
      {evidenceResultId !== null && (
        <EvidenceViewerModal
          isOpen={true}
          onClose={() => setEvidenceResultId(null)}
          resultId={evidenceResultId}
        />
      )}

    </div>
  );
};
