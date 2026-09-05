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
  AlertCircle,
  Search,
  Filter,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const ReportsPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
      error('Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await authFetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        const pts = json.patients || [];
        setPatients(pts);
        if (pts.length > 0 && !uploadPatientId) {
          setUploadPatientId(pts[0].id.toString());
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

      if (res.ok) {
        const data = await res.json();
        success('Medical report uploaded and structured extraction completed.');
        setIsUploadOpen(false);
        setSelectedFile(null);
        setUploadTitle('');
        setUploadLab('');
        fetchReports();
        if (data.report?.id) {
          navigate(`/reports/${data.report.id}`);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        error(data.error || 'Failed to upload document.');
      }
    } catch (err) {
      error('Error processing document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReports = reports.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.report_title.toLowerCase().includes(q) ||
      r.lab_name?.toLowerCase().includes(q) ||
      r.patient_identifier?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Medical Documents</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Uploaded clinical reports, OCR extractions, and document provenance records
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="clinical-btn-primary self-start sm:self-auto"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            className="clinical-input w-full pl-8 py-1.5 text-xs"
            placeholder="Search documents by title, lab, patient ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="all">All Types</option>
            <option value="Lab Test">Lab Test</option>
            <option value="Imaging / Radiology">Imaging / Radiology</option>
            <option value="Clinical Note">Clinical Note</option>
            <option value="Pathology">Pathology</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="all">All Verifications</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending Review</option>
            <option value="in_review">In Review</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="clinical-card overflow-hidden">
        {isLoading ? (
          <LoadingState message="Loading medical documents..." rows={5} />
        ) : filteredReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Patient</th>
                  <th>Specimen Date</th>
                  <th>Laboratory</th>
                  <th>Processing</th>
                  <th>Verification</th>
                  <th>Uploaded</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/reports/${r.id}`)}
                    className="cursor-pointer transition-colors"
                  >
                    <td className="font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-teal-800 dark:text-teal-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{r.report_title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal pl-5">{r.report_type}</div>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {r.patient_identifier || `Patient #${r.patient_id}`}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {r.report_date}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                      {r.lab_name || 'Clinical Lab'}
                    </td>
                    <td>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {r.processing_status || 'extracted'}
                      </span>
                    </td>
                    <td>
                      <span className={r.verification_status === 'verified' || r.status === 'VERIFIED' ? 'badge-verified' : 'badge-pending'}>
                        {r.verification_status === 'verified' || r.status === 'VERIFIED' ? 'Verified' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Today'}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/reports/${r.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-teal-800 dark:text-teal-400 hover:underline font-semibold inline-flex items-center gap-0.5 text-xs"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload a medical document to begin structured extraction and review."
            actionLabel="Upload Document"
            onAction={() => setIsUploadOpen(true)}
          />
        )}
      </div>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                Upload Medical Document
              </h3>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              
              {/* Drag & Drop File Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/30' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-850'
                }`}
                onClick={() => document.getElementById('report-file-input')?.click()}
              >
                <input
                  id="report-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <FileUp className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                {selectedFile ? (
                  <div className="text-xs">
                    <span className="font-semibold text-teal-900 dark:text-teal-300">{selectedFile.name}</span>
                    <span className="text-slate-400 ml-1.5">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      Drop medical report here, or <span className="text-teal-800 dark:text-teal-400 underline">browse</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Supports PDF, Images, Text, CSV</div>
                  </div>
                )}
              </div>

              {/* Patient Selection */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Patient Record *
                </label>
                {patients.length > 0 ? (
                  <select
                    value={uploadPatientId}
                    onChange={(e) => setUploadPatientId(e.target.value)}
                    required
                    className="clinical-input w-full"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.patient_identifier} ({p.sex}, {p.age ? `${p.age}y` : 'Age N/A'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
                    No patients registered yet. <Link to="/patients/new" className="underline font-semibold">Create a patient</Link> first.
                  </div>
                )}
              </div>

              {/* Document Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Complete Blood Count"
                    className="clinical-input w-full"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Document Type
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as ReportType)}
                    className="clinical-input w-full"
                  >
                    <option value="Lab Test">Lab Test</option>
                    <option value="Imaging / Radiology">Imaging / Radiology</option>
                    <option value="Clinical Note">Clinical Note</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date & Lab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Specimen / Report Date
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
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Laboratory / Facility
                  </label>
                  <input
                    type="text"
                    value={uploadLab}
                    onChange={(e) => setUploadLab(e.target.value)}
                    placeholder="e.g. Central Diagnostic Lab"
                    className="clinical-input w-full"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="clinical-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || patients.length === 0}
                  className="clinical-btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Extracting Structured Results...</span>
                    </>
                  ) : (
                    <span>Process & Extract</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
