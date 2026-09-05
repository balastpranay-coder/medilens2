import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  GitCompare, 
  ArrowRight, 
  Calendar, 
  Filter, 
  Info, 
  AlertCircle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Patient, MedicalReport, ComparisonData, ComparisonItem } from '../types';

export const ComparisonPage: React.FC = () => {
  const { authFetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(searchParams.get('patient_id') || '');
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [reportAId, setReportAId] = useState<string>(searchParams.get('report_a') || '');
  const [reportBId, setReportBId] = useState<string>(searchParams.get('report_b') || '');

  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort state
  const [searchFilter, setSearchFilter] = useState('');
  const [changedOnly, setChangedOnly] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'change' | 'status'>('name');

  // Load patients on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await authFetch('/api/patients');
        if (res.ok) {
          const json = await res.json();
          setPatients(json.patients || []);
          if (!selectedPatientId && json.patients?.length > 0) {
            setSelectedPatientId(String(json.patients[0].id));
          }
        }
      } catch (err) {
        console.error('Error fetching patients:', err);
      }
    };
    fetchPatients();
  }, []);

  // Load patient reports when patient selected
  useEffect(() => {
    if (!selectedPatientId) {
      setReports([]);
      return;
    }

    const fetchReports = async () => {
      try {
        const res = await authFetch(`/api/reports?patient_id=${selectedPatientId}`);
        if (res.ok) {
          const json = await res.json();
          const rpts = json.reports || [];
          setReports(rpts);
          if (rpts.length >= 2) {
            setReportAId(String(rpts[1].id));
            setReportBId(String(rpts[0].id));
          } else if (rpts.length === 1) {
            setReportAId(String(rpts[0].id));
            setReportBId('');
          } else {
            setReportAId('');
            setReportBId('');
          }
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
      }
    };
    fetchReports();
  }, [selectedPatientId]);

  // Execute comparison
  const runComparison = async () => {
    if (!reportAId || !reportBId) {
      setComparisonData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/reports/compare?report_a=${reportAId}&report_b=${reportBId}`);
      if (res.ok) {
        const json = await res.json();
        setComparisonData(json);
        setSearchParams({
          patient_id: selectedPatientId,
          report_a: reportAId,
          report_b: reportBId
        });
      } else {
        const errJson = await res.json();
        setError(errJson.error || 'Failed to compare reports.');
      }
    } catch (err) {
      setError('Network error running report comparison.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (reportAId && reportBId && reportAId !== reportBId) {
      runComparison();
    }
  }, [reportAId, reportBId]);

  // Filter and sort items
  let displayItems = comparisonData?.comparison || [];
  if (searchFilter.trim()) {
    displayItems = displayItems.filter(i => 
      i.test_name.toLowerCase().includes(searchFilter.toLowerCase().trim())
    );
  }
  if (changedOnly) {
    displayItems = displayItems.filter(i => 
      i.numerical_delta !== null && i.numerical_delta !== 0
    );
  }

  displayItems = [...displayItems].sort((a, b) => {
    if (sortField === 'name') return a.test_name.localeCompare(b.test_name);
    if (sortField === 'change') {
      const dA = a.numerical_delta ?? -99999;
      const dB = b.numerical_delta ?? -99999;
      return Math.abs(dB) - Math.abs(dA);
    }
    if (sortField === 'status') return (a.current_status || '').localeCompare(b.current_status || '');
    return 0;
  });

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Multi-Report Comparison</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare structured laboratory measurements across chronological specimen dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/reports" className="clinical-btn-secondary py-1 px-3 text-xs">
            Back to Reports
          </Link>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* Patient Selector */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Patient</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="clinical-input w-full"
            >
              <option value="">Choose patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.patient_identifier} ({p.sex}, {p.age ? `${p.age}y` : 'Age N/A'})
                </option>
              ))}
            </select>
          </div>

          {/* Previous Report */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Previous Report (Baseline)</label>
            <select
              value={reportAId}
              onChange={(e) => setReportAId(e.target.value)}
              disabled={reports.length === 0}
              className="clinical-input w-full disabled:opacity-50"
            >
              <option value="">Choose baseline report...</option>
              {reports.map(r => (
                <option key={r.id} value={r.id} disabled={String(r.id) === reportBId}>
                  {r.report_title} ({r.report_date})
                </option>
              ))}
            </select>
          </div>

          {/* Current Report */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Current Report (Comparison)</label>
            <select
              value={reportBId}
              onChange={(e) => setReportBId(e.target.value)}
              disabled={reports.length < 2}
              className="clinical-input w-full disabled:opacity-50"
            >
              <option value="">Choose comparison report...</option>
              {reports.map(r => (
                <option key={r.id} value={r.id} disabled={String(r.id) === reportAId}>
                  {r.report_title} ({r.report_date})
                </option>
              ))}
            </select>
          </div>

        </div>

        {reports.length < 2 && selectedPatientId && (
          <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
            This patient currently has {reports.length} report. At least 2 uploaded reports are required to perform a comparison.
          </p>
        )}
      </div>

      {/* Comparison Results */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-500 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Aligning laboratory measurements...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-xs text-rose-700 space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-600" />
          <p>{error}</p>
        </div>
      ) : !comparisonData ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-500 space-y-2">
          <GitCompare className="w-7 h-7 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">Select Two Reports to Compare</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose a baseline report and a subsequent report to inspect delta changes across matched laboratory tests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          
          {/* Metadata Banner */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {comparisonData.matching_count} of {comparisonData.total_tests} Tests Matched
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Factual Deltas Only
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>Baseline: <strong>{comparisonData.previous_report.date}</strong></span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>Current: <strong>{comparisonData.current_report.date}</strong></span>
              </div>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Filter test name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="clinical-input py-1 px-2.5 text-xs w-36"
              />
              <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={changedOnly}
                  onChange={(e) => setChangedOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                />
                <span>Changed only</span>
              </label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="clinical-input py-1 px-2 text-xs"
              >
                <option value="name">Sort by Name</option>
                <option value="change">Sort by Delta Magnitude</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Laboratory Test</th>
                    <th className="px-3.5 py-2.5">
                      Previous ({comparisonData.previous_report.date})
                    </th>
                    <th className="px-3.5 py-2.5">
                      Current ({comparisonData.current_report.date})
                    </th>
                    <th className="px-3 py-2.5">Factual Delta</th>
                    <th className="px-3 py-2.5">Reference Range</th>
                    <th className="px-3.5 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                        No laboratory tests match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((item, idx) => {
                      const delta = item.numerical_delta;
                      const hasDelta = delta !== null;
                      const deltaFormatted = hasDelta 
                        ? (delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)) 
                        : null;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          
                          {/* Test Name */}
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {item.test_name}
                          </td>

                          {/* Previous Value */}
                          <td className="px-3.5 py-2.5 font-mono text-slate-700">
                            {item.previous_value ? (
                              <span>{item.previous_value} {item.previous_unit || ''}</span>
                            ) : (
                              <em className="text-slate-400 font-sans text-[11px]">Not available in previous report</em>
                            )}
                          </td>

                          {/* Current Value */}
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900">
                            {item.current_value ? (
                              <span>{item.current_value} {item.current_unit || ''}</span>
                            ) : (
                              <em className="text-slate-400 font-sans text-[11px]">Not available in current report</em>
                            )}
                          </td>

                          {/* Factual Delta */}
                          <td className="px-3 py-2.5 font-mono">
                            {hasDelta ? (
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                delta === 0 
                                  ? 'bg-slate-100 text-slate-600' 
                                  : 'bg-slate-100 text-slate-900 border border-slate-200'
                              }`}>
                                {deltaFormatted} {item.current_unit || item.previous_unit || ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Reference Range */}
                          <td className="px-3 py-2.5 font-mono text-slate-600">
                            {item.current_range || item.previous_range || <em className="text-slate-400 font-sans">Not provided</em>}
                          </td>

                          {/* Status */}
                          <td className="px-3.5 py-2.5 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              item.current_status === 'normal' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : item.current_status === 'high'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : item.current_status === 'low'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {item.current_status || item.previous_status || 'unknown'}
                            </span>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Non-Diagnostic Clinical Safety Notice */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong>Non-Diagnostic Notice:</strong> Numerical deltas represent chronological differences between reported laboratory measurements. Differences do not automatically indicate disease progression, clinical improvement, or medical diagnosis.
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
