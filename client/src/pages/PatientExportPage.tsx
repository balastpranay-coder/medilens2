import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Printer, 
  ArrowLeft, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  Layers, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PatientExportData } from '../types';

export const PatientExportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useAuth();
  const [data, setData] = useState<PatientExportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExportData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/patients/${id}/export`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError('Failed to compile patient export record.');
        }
      } catch (err) {
        setError('Network error compiling patient record.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchExportData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p>Compiling institutional patient record...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center max-w-md mx-auto my-8 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-sm font-semibold text-slate-900">Export Generation Failed</h2>
        <p className="text-xs text-slate-500">{error || 'Unable to load export record.'}</p>
        <Link to={`/patients/${id}`} className="clinical-btn-secondary inline-block">
          Return to Profile
        </Link>
      </div>
    );
  }

  const { patient, info_items, reports, results, timeline, latest_summary, disclaimer } = data;

  const symptoms = info_items.filter(i => i.category === 'symptom');
  const conditions = info_items.filter(i => i.category === 'condition');
  const allergies = info_items.filter(i => i.category === 'allergy');
  const medications = info_items.filter(i => i.category === 'medication');

  return (
    <div className="max-w-4xl mx-auto space-y-5 print:space-y-4 print:max-w-none print:m-0">
      
      {/* Non-Printable Header & Actions */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
        <Link
          to={`/patients/${patient.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patient Profile</span>
        </Link>

        <button
          onClick={handlePrint}
          className="clinical-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* Printable Institutional Medical Record Document */}
      <div className="bg-white border border-slate-200 rounded-lg p-8 print:p-0 print:border-0 space-y-6 text-xs text-slate-900">
        
        {/* Document Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-900">MedLens Clinical Information System</div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">Comprehensive Patient Clinical Record</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Verified Medical Summary & Traceable Diagnostic Extraction</p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <div>Generated: {new Date(data.generated_at).toLocaleString()}</div>
            <div>Classification: <strong>Authorized Clinical Record</strong></div>
          </div>
        </div>

        {/* Section 1: Patient Demographics */}
        <div className="border border-slate-200 rounded p-3.5 space-y-2 bg-slate-50/50 print:bg-white">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Patient Demographics & Identification
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Patient Identifier:</span>
              <strong className="font-mono text-slate-900 text-sm">{patient.patient_identifier}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Biological Sex:</span>
              <strong className="text-slate-900">{patient.sex}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Age:</span>
              <strong className="text-slate-900">{patient.age !== null ? `${patient.age} years` : 'Age N/A'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Record Status:</span>
              <span className="inline-block font-semibold text-slate-800">{patient.status}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Profile (User Provided) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Clinical Profile Information
            </h2>
            <span className="text-[10px] text-slate-500">Source: User Provided</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Conditions & Diagnoses */}
            <div className="border border-slate-200 rounded p-2.5 space-y-1">
              <span className="font-semibold text-slate-800 text-[11px] block">Existing Conditions</span>
              {conditions.length === 0 ? (
                <em className="text-slate-400 text-[11px]">None recorded</em>
              ) : (
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {conditions.map(c => (
                    <li key={c.id}><strong>{c.title}</strong>{c.description ? `: ${c.description}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Allergies */}
            <div className="border border-slate-200 rounded p-2.5 space-y-1">
              <span className="font-semibold text-slate-800 text-[11px] block">Documented Allergies</span>
              {allergies.length === 0 ? (
                <em className="text-slate-400 text-[11px]">No known allergies</em>
              ) : (
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {allergies.map(a => (
                    <li key={a.id}><strong>{a.title}</strong>{a.description ? `: ${a.description}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Current Medications */}
            <div className="border border-slate-200 rounded p-2.5 space-y-1">
              <span className="font-semibold text-slate-800 text-[11px] block">Active Medications</span>
              {medications.length === 0 ? (
                <em className="text-slate-400 text-[11px]">None recorded</em>
              ) : (
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {medications.map(m => (
                    <li key={m.id}><strong>{m.title}</strong>{m.description ? `: ${m.description}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reported Symptoms */}
            <div className="border border-slate-200 rounded p-2.5 space-y-1">
              <span className="font-semibold text-slate-800 text-[11px] block">Reported Symptoms</span>
              {symptoms.length === 0 ? (
                <em className="text-slate-400 text-[11px]">None recorded</em>
              ) : (
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {symptoms.map(s => (
                    <li key={s.id}><strong>{s.title}</strong>{s.description ? `: ${s.description}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

        {/* Section 3: Uploaded Medical Reports */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Associated Medical Reports ({reports.length})
          </h2>
          {reports.length === 0 ? (
            <p className="text-slate-500 text-xs py-2">No medical reports uploaded yet.</p>
          ) : (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-2">Report Title</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Specimen Date</th>
                  <th className="p-2">Laboratory</th>
                  <th className="p-2 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map(r => (
                  <tr key={r.id}>
                    <td className="p-2 font-medium text-slate-900">{r.report_title}</td>
                    <td className="p-2 text-slate-600">{r.report_type}</td>
                    <td className="p-2 font-mono text-slate-600">{r.report_date}</td>
                    <td className="p-2 text-slate-600">{r.lab_name || 'Standard Lab'}</td>
                    <td className="p-2 text-right uppercase font-semibold text-[10px]">
                      {r.verification_status || 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 4: Verified Laboratory Results */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Authoritative Extracted Laboratory Results ({results.length})
          </h2>
          {results.length === 0 ? (
            <p className="text-slate-500 text-xs py-2">No extracted laboratory tests available.</p>
          ) : (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-2">Test Name</th>
                  <th className="p-2">Reported Value</th>
                  <th className="p-2">Report-Provided Reference Range</th>
                  <th className="p-2">Deterministic Status</th>
                  <th className="p-2">Confidence</th>
                  <th className="p-2 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map(r => (
                  <tr key={r.id}>
                    <td className="p-2 font-medium text-slate-900">{r.test_name}</td>
                    <td className="p-2 font-mono font-bold text-slate-900">
                      {r.verified_value ? `${r.verified_value} ${r.unit || ''}*` : `${r.value} ${r.unit || ''}`}
                    </td>
                    <td className="p-2 font-mono text-slate-600">
                      {r.reference_range ? r.reference_range : <em>Not provided</em>}
                    </td>
                    <td className="p-2 uppercase font-semibold text-[10px]">
                      {r.status}
                    </td>
                    <td className="p-2 font-mono text-slate-600">
                      {r.confidence_score}%
                    </td>
                    <td className="p-2 text-right text-[10px] font-semibold">
                      {r.verified ? 'Verified' : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 5: Clinical Summary (if available) */}
        {latest_summary && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Clinical Summary
            </h2>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap text-slate-800 leading-relaxed font-sans text-xs">
              {latest_summary.content || latest_summary.summary_content}
            </div>
          </div>
        )}

        {/* Mandatory Clinical Safety Disclaimer */}
        <div className="border-t-2 border-slate-900 pt-3 text-[10px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-900 uppercase">Non-Diagnostic Clinical Safety Mandate:</div>
          <p className="leading-normal">
            {disclaimer} MedLens is strictly an information organization, extraction, and summarization tool. It does not diagnose diseases, recommend medications, recommend dosages, or provide autonomous medical treatment plans. All clinical actions require clinician review.
          </p>
        </div>

      </div>
    </div>
  );
};
