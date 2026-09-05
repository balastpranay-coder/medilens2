import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MedicalReport, Patient, ReportType } from '../types';
import { 
  FileText, 
  Upload, 
  ChevronRight, 
  X,
  FileUp,
  AlertCircle
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Upload Report Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<ReportType>('Lab Test');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadLab, setUploadLab] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/reports?status=${statusFilter}&type=${typeFilter}`);
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } catch (err) {
      error('Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await authFetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        setPatients(json.patients || []);
        if (json.patients?.length > 0 && !uploadPatientId) {
          setUploadPatientId(json.patients[0].id.toString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPatientId) {
      error('Please select a patient.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('patient_id', uploadPatientId);
      formData.append('report_title', uploadTitle.trim() || (selectedFile ? selectedFile.name : 'Medical Report'));
      formData.append('report_type', uploadType);
      formData.append('report_date', uploadDate);
      if (uploadLab.trim()) formData.append('lab_name', uploadLab.trim());

      const res = await authFetch('/api/reports', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        success('Report uploaded successfully.');
        setIsUploadOpen(false);
        setSelectedFile(null);
        setUploadTitle('');
        setUploadLab('');
        fetchReports();
        if (data.report?.id) {
          navigate(`/reports/${data.report.id}`);
        }
      } else {
        error(data.error || 'Failed to upload report.');
      }
    } catch (err) {
      error('Server communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Medical Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload and review clinical laboratory and diagnostic reports.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="clinical-btn-primary self-start sm:self-auto"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Medical Report</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="all">All Verification Statuses</option>
            <option value="pending">Pending Verification</option>
            <option value="verified">Verified</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="all">All Report Types</option>
            <option value="Lab Test">Lab Test</option>
            <option value="Imaging / Radiology">Imaging / Radiology</option>
            <option value="Clinical Note">Clinical Note</option>
            <option value="Discharge Summary">Discharge Summary</option>
            <option value="Pathology">Pathology</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 self-end sm:self-auto">
          Total: <strong>{reports.length}</strong> reports
        </span>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading medical reports...
          </div>
        ) : reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Report</th>
                  <th className="px-3 py-2.5">Patient</th>
                  <th className="px-3 py-2.5">Type & Date</th>
                  <th className="px-3 py-2.5">Extracted Tests</th>
                  <th className="px-3 py-2.5">Processing</th>
                  <th className="px-3 py-2.5">Verification</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/reports/${r.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{r.report_title}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {r.file_name} {r.lab_name ? `• ${r.lab_name}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono font-medium text-slate-700">
                      {r.patient_identifier || `PT-${r.patient_id}`}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{r.report_type}</div>
                      <div className="text-[10px] text-slate-400">{r.report_date}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-medium">
                      {r.extracted_count ?? 0} tests
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                        r.processing_status === 'extracted'
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : r.processing_status === 'processing'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : r.processing_status === 'failed'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {r.processing_status === 'extracted'
                          ? 'Extracted'
                          : r.processing_status === 'processing'
                          ? 'Extracting'
                          : r.processing_status === 'failed'
                          ? 'Failed'
                          : 'Uploaded'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                        r.verification_status === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {r.verification_status === 'verified' ? 'Verified' : 'Verification Required'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/reports/${r.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-900 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">No medical reports uploaded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a PDF or image of a medical report for structured extraction.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="clinical-btn-primary"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Medical Report</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Upload Medical Report Modal (Section 7) */}
      {/* ---------------------------------------------------- */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-lg w-full p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Upload Medical Report</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload a PDF or image of a medical report for structured extraction.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setSelectedFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              
              {/* Select Patient */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Target Patient <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={uploadPatientId}
                  onChange={(e) => setUploadPatientId(e.target.value)}
                  className="clinical-input w-full"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.patient_identifier} ({p.sex}, {p.age ? `${p.age} yrs` : 'Age N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Large Simple Upload Area per Section 7 */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Report Document
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
                    isDragging 
                      ? 'border-blue-900 bg-blue-50/50' 
                      : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="reports-file-input"
                  />
                  <label htmlFor="reports-file-input" className="cursor-pointer flex flex-col items-center">
                    <FileUp className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="text-xs font-medium text-slate-800">
                      Drag and drop your report here
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      or <span className="text-blue-900 font-semibold underline">Choose File</span>
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Supported: PDF, PNG, JPG, JPEG
                    </span>
                  </label>
                </div>
              </div>

              {/* Selected File Details */}
              {selectedFile && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">File name:</span>
                    <span className="font-mono text-slate-900">{selectedFile.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">File size:</span>
                    <span className="text-slate-600">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Upload status:</span>
                    <span className="text-blue-900 font-medium">Ready for upload</span>
                  </div>
                </div>
              )}

              {/* Title & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Report Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Comprehensive Metabolic Panel"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="clinical-input w-full"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Report Type
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as any)}
                    className="clinical-input w-full"
                  >
                    <option value="Lab Test">Lab Test</option>
                    <option value="Imaging / Radiology">Imaging / Radiology</option>
                    <option value="Clinical Note">Clinical Note</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                    <option value="Pathology">Pathology</option>
                  </select>
                </div>
              </div>

              {/* Date & Facility */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Report Date
                  </label>
                  <input
                    type="date"
                    required
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="clinical-input w-full"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Laboratory / Facility
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quest Diagnostics"
                    value={uploadLab}
                    onChange={(e) => setUploadLab(e.target.value)}
                    className="clinical-input w-full"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="clinical-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedFile}
                  className="clinical-btn-primary"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Uploading...' : 'Upload & Process'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
