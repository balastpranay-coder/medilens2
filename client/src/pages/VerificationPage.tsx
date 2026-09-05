import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MedicalReport, ExtractedResult, VerificationRecord } from '../types';
import { 
  Check, 
  Edit2, 
  XCircle, 
  HelpCircle, 
  CheckCircle2, 
  ExternalLink,
  History,
  X,
  AlertCircle
} from 'lucide-react';

interface ReportWithResults extends MedicalReport {
  results: ExtractedResult[];
}

export const VerificationPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { success, error } = useToast();

  const [queue, setQueue] = useState<ReportWithResults[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('pending');

  // Edit value modal
  const [editingResult, setEditingResult] = useState<ExtractedResult | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History modal
  const [historyResult, setHistoryResult] = useState<ExtractedResult | null>(null);
  const [historyRecords, setHistoryRecords] = useState<VerificationRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/verification/queue');
      if (res.ok) {
        const json = await res.json();
        setQueue(json.queue || []);
      } else {
        error('Failed to load verification queue.');
      }
    } catch (err) {
      error('Network communication error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (resultId: number, action: 'accepted' | 'edited' | 'rejected' | 'marked_uncertain', correctedValue?: string) => {
    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/verification/${resultId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, corrected_value: correctedValue })
      });

      if (res.ok) {
        const actionLabels = {
          accepted: 'Result accepted.',
          edited: 'Result corrected and verified.',
          rejected: 'Result rejected.',
          marked_uncertain: 'Marked uncertain.'
        };
        success(actionLabels[action] || 'Action recorded.');
        if (editingResult) {
          setEditingResult(null);
          setEditValue('');
        }
        fetchQueue();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to submit verification action.');
      }
    } catch (err) {
      error('Server communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openHistory = async (result: ExtractedResult) => {
    setHistoryResult(result);
    setIsHistoryLoading(true);
    try {
      const res = await authFetch(`/api/verification/history/${result.id}`);
      if (res.ok) {
        const json = await res.json();
        setHistoryRecords(json.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const uniquePatients = Array.from(new Set(queue.map(r => r.patient_identifier).filter(Boolean)));

  // Flatten tests for review queue table
  const allQueueItems = queue.flatMap(rep => 
    rep.results.map(r => ({
      ...r,
      report_title: rep.report_title,
      report_date: rep.report_date,
      patient_id: rep.patient_id,
      patient_identifier: rep.patient_identifier,
      file_name: rep.file_name
    }))
  ).filter(item => {
    if (filterPatient !== 'all' && item.patient_identifier !== filterPatient) return false;
    if (filterAction === 'pending') return !item.verification_action || item.verification_action === 'pending';
    if (filterAction === 'all') return true;
    return item.verification_action === filterAction;
  });

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

  return (
    <div className="space-y-5">
      
      {/* Header per Section 10 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Verification Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review extracted information before it becomes part of the verified patient record.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="all">All Patients</option>
            {uniquePatients.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="pending">Awaiting Review</option>
            <option value="all">All Items</option>
            <option value="accepted">Accepted</option>
            <option value="edited">Edited</option>
            <option value="marked_uncertain">Uncertain</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Verification Queue Table per Section 10 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading verification queue...
          </div>
        ) : allQueueItems.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
            <h3 className="text-sm font-semibold text-slate-800">No reports awaiting verification</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All extracted laboratory results have been verified, or no reports have been uploaded yet.
            </p>
            <div className="pt-2">
              <Link to="/reports" className="clinical-btn-secondary">
                View Reports Repository
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Test</th>
                  <th className="px-3 py-2.5">Patient</th>
                  <th className="px-3 py-2.5">Extracted Value</th>
                  <th className="px-3 py-2.5">Reference Range</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-2.5 py-2.5">Confidence</th>
                  <th className="px-4 py-2.5 max-w-xs">Source</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allQueueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-3 font-semibold text-slate-900">
                      <div>{item.test_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Report: {item.report_title}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono font-medium text-slate-700">
                      <Link to={`/patients/${item.patient_id}`} className="hover:underline text-blue-900">
                        {item.patient_identifier || `PT-${item.patient_id}`}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-900">
                      {item.verified_value ? (
                        <span title={`Corrected from: ${item.value}`}>
                          {item.verified_value} {item.unit || ''}*
                        </span>
                      ) : (
                        <span>{item.value} {item.unit || ''}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600">
                      {item.reference_range ? item.reference_range : <em className="text-slate-400">Not provided</em>}
                    </td>
                    <td className="px-3 py-3">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="px-2.5 py-3 text-slate-500">
                      {item.confidence_score}%
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="font-mono text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200 block truncate" title={item.source_snippet}>
                        "{item.source_snippet}"
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAction(item.id, 'accepted')}
                          disabled={isSubmitting}
                          title="Accept (Mark Verified)"
                          className="clinical-btn-primary py-1 px-2 text-[11px]"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingResult(item);
                            setEditValue(item.verified_value || item.value);
                          }}
                          disabled={isSubmitting}
                          title="Edit Value"
                          className="clinical-btn-secondary py-1 px-2 text-[11px]"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'marked_uncertain')}
                          disabled={isSubmitting}
                          title="Mark Uncertain"
                          className="clinical-btn-secondary py-1 px-2 text-[11px] text-amber-800"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Uncertain</span>
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'rejected')}
                          disabled={isSubmitting}
                          title="Reject"
                          className="clinical-btn-danger py-1 px-2 text-[11px]"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Value Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">Edit Extracted Value</h3>
              <button onClick={() => setEditingResult(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Test:</span>
                <span className="font-semibold text-slate-800">{editingResult.test_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Raw Extracted Value:</span>
                <span className="font-mono text-slate-600">{editingResult.value} {editingResult.unit}</span>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Corrected Value:</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="clinical-input w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingResult(null)}
                className="clinical-btn-secondary"
              >
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

    </div>
  );
};
