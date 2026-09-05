import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MedicalReport, ExtractedResult, QualityCheckData } from '../types';
import { EvidenceViewerModal } from '../components/clinical/EvidenceViewerModal';
import { ResultExplanationModal } from '../components/clinical/ResultExplanationModal';
import { 
  ArrowLeft, 
  FileText, 
  Check, 
  Edit2, 
  XCircle, 
  HelpCircle, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  X,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  Info
} from 'lucide-react';

export const ReportDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authFetch, token } = useAuth();
  const { success, error } = useToast();

  const [report, setReport] = useState<MedicalReport | null>(null);
  const [results, setResults] = useState<ExtractedResult[]>([]);
  const [qualityData, setQualityData] = useState<QualityCheckData | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Evidence & Explain Modals
  const [evidenceModalResultId, setEvidenceModalResultId] = useState<number | null>(null);
  const [explainModalResultId, setExplainModalResultId] = useState<number | null>(null);

  // Edit value modal
  const [editingResult, setEditingResult] = useState<ExtractedResult | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchReportData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [repRes, resRes, qualRes] = await Promise.all([
        authFetch(`/api/reports/${id}`),
        authFetch(`/api/reports/${id}/results`),
        authFetch(`/api/reports/${id}/quality`)
      ]);

      if (repRes.ok) {
        const repJson = await repRes.json();
        setReport(repJson.report);
      } else {
        error('Report not found or unauthorized.');
      }

      if (resRes.ok) {
        const resJson = await resRes.json();
        const extracted = resJson.results || [];
        setResults(extracted);
        if (extracted.length > 0 && selectedResultId === null) {
          setSelectedResultId(extracted[0].id);
        }
      }

      if (qualRes.ok) {
        const qJson = await qualRes.json();
        setQualityData(qJson);
      }
    } catch (err) {
      error('Failed to communicate with server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [id]);

  // Polling if processing
  useEffect(() => {
    if (!report || report.processing_status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`/api/reports/${report.id}/status`);
        if (res.ok) {
          const statusJson = await res.json();
          if (statusJson.processing_status !== 'processing') {
            fetchReportData();
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [report?.processing_status]);

  const handleRunExtraction = async () => {
    if (!report) return;
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/extraction/${report.id}/run`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        success(data.message || 'Information extracted successfully.');
        fetchReportData();
      } else {
        error(data.message || data.error || 'Extraction failed.');
        fetchReportData();
      }
    } catch (err) {
      error('Server connection error during extraction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerificationAction = async (
    resultId: number, 
    action: 'accepted' | 'edited' | 'rejected' | 'marked_uncertain', 
    correctedVal?: string
  ) => {
    setIsSubmittingAction(true);
    try {
      const res = await authFetch(`/api/verification/${resultId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, corrected_value: correctedVal })
      });

      if (res.ok) {
        const actionLabels = {
          accepted: 'Result accepted.',
          edited: 'Result corrected and verified.',
          marked_uncertain: 'Result marked as uncertain.',
          rejected: 'Result rejected.'
        };
        success(actionLabels[action] || 'Action recorded.');

        if (editingResult) {
          setEditingResult(null);
          setEditValue('');
        }
        fetchReportData();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to record verification action.');
      }
    } catch (err) {
      error('Server communication error.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Subtle Status Badges (Section 8: Normal subtle green, Low subtle amber, High subtle red, Unknown gray)
  const renderStatusBadge = (status: string) => {
    const s = (status || 'unknown').toLowerCase();
    if (s === 'normal') {
      return (
        <span className="badge-normal">
          Normal
        </span>
      );
    }
    if (s === 'high') {
      return (
        <span className="badge-high">
          High
        </span>
      );
    }
    if (s === 'low') {
      return (
        <span className="badge-low">
          Low
        </span>
      );
    }
    return (
      <span className="badge-unknown">
        Unknown
      </span>
    );
  };

  const selectedResult = results.find(r => r.id === selectedResultId) || results[0];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-28 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="h-64 bg-slate-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="clinical-card p-6 text-center max-w-md mx-auto mt-8">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-900 mb-1">Report Not Found</h2>
        <p className="text-xs text-slate-500 mb-4">The medical report could not be found or access is unauthorized.</p>
        <Link to="/reports" className="clinical-btn-primary">
          Return to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      
      {/* Back Link */}
      <div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Medical Reports</span>
        </Link>
      </div>

      {/* Header Card per Section 8: Report Details, Patient, Report Date, Laboratory, Processing Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-slate-900">{report.report_title}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                report.verification_status === 'verified'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {report.verification_status === 'verified' ? 'Verified' : 'Verification Required'}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600">
              <div>
                <span className="text-[11px] text-slate-400 block">Patient</span>
                <Link to={`/patients/${report.patient_id}`} className="font-mono font-medium text-blue-900 hover:underline">
                  {report.patient_identifier || `PT-${report.patient_id}`}
                </Link>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Report Date</span>
                <span className="font-medium text-slate-800">{report.report_date || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Laboratory</span>
                <span className="font-medium text-slate-800">{report.lab_name || 'Standard Laboratory'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Processing Status</span>
                <span className="font-medium capitalize text-slate-800">{report.processing_status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <a
              href={`/api/reports/${report.id}/download?token=${token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="clinical-btn-secondary"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Original</span>
            </a>
            {report.processing_status !== 'extracted' && report.processing_status !== 'processing' && (
              <button
                onClick={handleRunExtraction}
                disabled={isProcessing}
                className="clinical-btn-primary"
              >
                <span>{isProcessing ? 'Processing...' : 'Run Extraction'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Processing Status Banner if not normal */}
      {report.processing_status === 'processing' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <span>Processing document text and extracting structured clinical values...</span>
        </div>
      )}

      {report.processing_status === 'failed' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 flex items-center justify-between">
          <span>Report processing failed. Please check your OCR/AI configuration.</span>
          <button onClick={handleRunExtraction} className="clinical-btn-danger py-1">
            Retry Processing
          </button>
        </div>
      )}

      {/* Quality Overview: Document Quality Check (Feature 6) & Extraction Quality Dashboard (Feature 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* DOCUMENT QUALITY (Feature 6) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Document Quality Check
              </h3>
            </div>
            {qualityData && (
              <span className="text-[10px] text-slate-400 font-mono">
                {qualityData.file_type} • {qualityData.file_size_formatted}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">File Readable</span>
              {qualityData ? (
                qualityData.file_size_bytes > 0 ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">✓ Readable</span>
                ) : (
                  <span className="text-rose-700 font-medium">✕ Unreadable</span>
                )
              ) : (
                <span className="text-slate-400 italic">Not available</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">Text Extracted</span>
              {qualityData ? (
                qualityData.text_extraction_status === 'Successful' ? (
                  <span className="text-emerald-700 font-medium">✓ Extracted</span>
                ) : (
                  <span className="text-amber-700 font-medium">{qualityData.text_extraction_status}</span>
                )
              ) : (
                <span className="text-slate-400 italic">Not available</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">OCR Required</span>
              {qualityData ? (
                qualityData.ocr_required ? (
                  <span className="text-blue-900 font-medium">✓ OCR Applied</span>
                ) : (
                  <span className="text-slate-600">Direct Digital</span>
                )
              ) : (
                <span className="text-slate-400 italic">Not available</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">Report Date</span>
              {qualityData?.report_date_detected ? (
                <span className="text-emerald-700 font-medium">✓ Detected</span>
              ) : (
                <span className="text-amber-700 font-medium">Not detected</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">Laboratory</span>
              {qualityData?.laboratory_detected ? (
                <span className="text-emerald-700 font-medium">✓ Detected</span>
              ) : (
                <span className="text-slate-500">Not detected</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">Patient Identifier</span>
              {qualityData?.patient_identifier_detected ? (
                <span className="text-emerald-700 font-medium">✓ Detected</span>
              ) : (
                <span className="text-slate-500">Not detected</span>
              )}
            </div>
          </div>

          {/* Reference range detected notice */}
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>Reference ranges detected:</span>
            <span className="font-semibold text-slate-800">
              {qualityData ? `${qualityData.reference_ranges_detected} ranges recorded` : 'Not available'}
            </span>
          </div>

          {/* Potential Extraction Issues */}
          {qualityData?.warnings && qualityData.warnings.length > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Potential Extraction Notes:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {qualityData.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* EXTRACTION QUALITY / CONFIDENCE DASHBOARD (Feature 5) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Extraction Quality
              </h3>
            </div>
            {results.length > 0 && (
              <span className="text-base font-bold text-blue-900 font-mono">
                {Math.round(results.reduce((acc, r) => acc + (r.confidence_score || 0), 0) / results.length)}%
              </span>
            )}
          </div>

          {results.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  {results.filter(r => (r.confidence_score || 0) >= 80).length} high confidence
                </span>
                <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                  {results.filter(r => (r.confidence_score || 0) < 80).length} require review
                </span>
              </div>

              {/* Compact Confidence Breakdown Table */}
              <div className="max-h-36 overflow-y-auto border border-slate-100 rounded">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-2.5 py-1.5">Test</th>
                      <th className="px-2 py-1.5">Confidence</th>
                      <th className="px-2 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-2.5 py-1 font-medium text-slate-800">{r.test_name}</td>
                        <td className="px-2 py-1 font-mono">
                          <span className={r.confidence_score >= 80 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                            {r.confidence_score}%
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          {r.verified === 1 ? (
                            <span className="text-emerald-700 font-medium">Verified</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Review</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mandatory Non-diagnostic Safety Explanation */}
              <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200/80 leading-relaxed">
                <strong>Important:</strong> Confidence reflects the system's confidence in extracting this information from the source document. It is not a medical assessment.
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              Extraction quality metrics will appear once document processing is complete.
            </p>
          )}
        </div>

      </div>

      {/* Main Review Section: Table + Source Provenance Panel (Sections 8 & 9) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Extracted Results</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any test to inspect verbatim source provenance and review against the original document.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Professional Table (Columns: Test | Value | Unit | Reference Range | Status | Confidence | Source / Evidence) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Test</th>
                      <th className="px-3 py-2.5">Value</th>
                      <th className="px-2.5 py-2.5">Unit</th>
                      <th className="px-3 py-2.5">Reference Range</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-2.5 py-2.5">Confidence</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((res) => {
                      const isSelected = selectedResult?.id === res.id;
                      return (
                        <tr
                          key={res.id}
                          onClick={() => setSelectedResultId(res.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                            {res.test_name}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                            {res.verified_value || res.value}
                          </td>
                          <td className="px-2.5 py-2.5 text-slate-600">
                            {res.unit || '—'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">
                            {res.reference_range ? res.reference_range : <em className="text-slate-400">Not provided</em>}
                          </td>
                          <td className="px-3 py-2.5">
                            {renderStatusBadge(res.status)}
                          </td>
                          <td className="px-2.5 py-2.5 text-slate-500">
                            {res.confidence_score}%
                          </td>
                          <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEvidenceModalResultId(res.id)}
                                className="px-2 py-0.5 text-[11px] font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                title="View Evidence & Source"
                              >
                                View Evidence
                              </button>
                              <button
                                onClick={() => setExplainModalResultId(res.id)}
                                className="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                                title="Explain Result"
                              >
                                Explain
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No structured results extracted.
              </div>
            )}
          </div>

          {/* Source & Provenance Panel (Section 9: Clear, side-by-side or stacked evidence) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Source & Provenance Evidence</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Compare extracted value directly with original document text</p>
            </div>

            {selectedResult ? (
              <div className="space-y-3.5 text-xs">
                
                {/* Extracted Value */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">Extracted Value</span>
                  <div className="text-base font-semibold text-slate-900 font-mono">
                    {selectedResult.verified_value || selectedResult.value} {selectedResult.unit || ''}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Test: <strong>{selectedResult.test_name}</strong> • Range: {selectedResult.reference_range || 'Not provided'}
                  </div>
                </div>

                {/* Source Snippet */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">Source</span>
                  <div className="font-mono text-slate-900 bg-white p-2 rounded border border-slate-200 select-all leading-relaxed text-[11px]">
                    "{selectedResult.source_snippet}"
                  </div>
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    Source: Uploaded laboratory report ({report.file_name})
                  </span>
                </div>

                {/* AI Extracted Status */}
                <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100">
                  <span className="font-medium text-slate-600">AI Extracted</span>
                  <span className="text-slate-800 font-medium">Confidence: {selectedResult.confidence_score}%</span>
                </div>

                {/* Human Verified Status */}
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-600">Human Verified</span>
                  <span className={`font-medium ${
                    selectedResult.verified === 1 ? 'text-emerald-800' : 'text-amber-800'
                  }`}>
                    {selectedResult.verified === 1 ? 'Verified by reviewer' : 'Pending verification'}
                  </span>
                </div>

                {/* Evidence & Explanation Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setEvidenceModalResultId(selectedResult.id)}
                    className="clinical-btn-secondary text-xs flex items-center justify-center gap-1 py-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-900" />
                    <span>Evidence</span>
                  </button>
                  <button
                    onClick={() => setExplainModalResultId(selectedResult.id)}
                    className="clinical-btn-secondary text-xs flex items-center justify-center gap-1 py-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                    <span>Explain</span>
                  </button>
                </div>

                {/* Action Controls */}
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-medium text-slate-700 block">Review Decision:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleVerificationAction(selectedResult.id, 'accepted')}
                      disabled={isSubmittingAction}
                      className="clinical-btn-primary"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingResult(selectedResult);
                        setEditValue(selectedResult.verified_value || selectedResult.value);
                      }}
                      disabled={isSubmittingAction}
                      className="clinical-btn-secondary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleVerificationAction(selectedResult.id, 'marked_uncertain')}
                      disabled={isSubmittingAction}
                      className="clinical-btn-secondary text-amber-800"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Mark Uncertain</span>
                    </button>
                    <button
                      onClick={() => handleVerificationAction(selectedResult.id, 'rejected')}
                      disabled={isSubmittingAction}
                      className="clinical-btn-danger"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Select a test row from the table to view source evidence.
              </div>
            )}
          </div>

        </div>
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
                <span className="text-slate-500 block">Raw Value:</span>
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
                onClick={() => handleVerificationAction(editingResult.id, 'edited', editValue)}
                disabled={isSubmittingAction || !editValue.trim()}
                className="clinical-btn-primary"
              >
                Save & Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature 1 & Feature 7: Evidence / Source Viewer & Provenance Pipeline Modal */}
      <EvidenceViewerModal
        resultId={evidenceModalResultId}
        isOpen={evidenceModalResultId !== null}
        onClose={() => setEvidenceModalResultId(null)}
      />

      {/* Feature 10: Safe Result Explanation Modal */}
      <ResultExplanationModal
        resultId={explainModalResultId}
        isOpen={explainModalResultId !== null}
        onClose={() => setExplainModalResultId(null)}
      />

    </div>
  );
};
