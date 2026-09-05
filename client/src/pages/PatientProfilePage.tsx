import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Patient, 
  PatientInfoItem, 
  MedicalReport, 
  ExtractedResult, 
  TimelineEvent, 
  AISummary, 
  Conflict, 
  ComparisonData,
  InfoCategory 
} from '../types';
import { 
  User, 
  Activity, 
  HeartPulse, 
  AlertTriangle, 
  Pill, 
  History, 
  FileText, 
  Clock, 
  Upload, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldAlert, 
  Calendar, 
  FileUp, 
  ExternalLink,
  ChevronRight,
  GitCompare,
  AlertOctagon,
  CheckCheck,
  Quote,
  Check,
  Edit2,
  XCircle,
  HelpCircle,
  X,
  Copy,
  Printer,
  FileCheck2,
  Filter,
  TrendingUp
} from 'lucide-react';
import { TrendChart } from '../components/clinical/TrendChart';
import { EvidenceViewerModal } from '../components/clinical/EvidenceViewerModal';
import { ResultExplanationModal } from '../components/clinical/ResultExplanationModal';

export const PatientProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();

  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [patient, setPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<{
    symptoms: PatientInfoItem[];
    conditions: PatientInfoItem[];
    allergies: PatientInfoItem[];
    medications: PatientInfoItem[];
    medical_history: PatientInfoItem[];
    notes: PatientInfoItem[];
  }>({
    symptoms: [],
    conditions: [],
    allergies: [],
    medications: [],
    medical_history: [],
    notes: []
  });
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [extractedResults, setExtractedResults] = useState<ExtractedResult[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [selectedSummaryVersion, setSelectedSummaryVersion] = useState<AISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Evidence & Explain Modals
  const [evidenceModalResultId, setEvidenceModalResultId] = useState<number | null>(null);
  const [explainModalResultId, setExplainModalResultId] = useState<number | null>(null);

  // Modals state
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({
    patient_identifier: '',
    age: '',
    date_of_birth: '',
    sex: 'Male',
    status: 'Active'
  });

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemModalCategory, setItemModalCategory] = useState<InfoCategory>('symptom');
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    detailField1: '',
    detailField2: ''
  });
  const [editingItem, setEditingItem] = useState<PatientInfoItem | null>(null);

  // Report Upload modal state
  const [isUploadReportOpen, setIsUploadReportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('Lab Test');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadLab, setUploadLab] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Comparison State
  const [compareReportA, setCompareReportA] = useState<number | null>(null);
  const [compareReportB, setCompareReportB] = useState<number | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Summary generation state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Verification modal / inline state
  const [editingResult, setEditingResult] = useState<ExtractedResult | null>(null);
  const [editResultValue, setEditResultValue] = useState('');

  // Timeline filter
  const [timelineFilter, setTimelineFilter] = useState('all');

  // Overview sub-category filter
  const [overviewCategory, setOverviewCategory] = useState<'all' | InfoCategory>('all');

  // Fetch full patient record
  const fetchPatientRecord = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/patients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        setItems(data.items);
        setReports(data.reports || []);
        setExtractedResults(data.extractedResults || []);
        setTimeline(data.timeline || []);
        setConflicts(data.conflicts || []);
        setSummaries(data.summaries || []);
        if (data.summaries && data.summaries.length > 0) {
          setSelectedSummaryVersion(data.summaries[0]);
        } else if (data.aiSummary) {
          setSelectedSummaryVersion(data.aiSummary);
        }

        // Set default reports for comparison if available
        if (data.reports && data.reports.length >= 2) {
          setCompareReportA(data.reports[0].id);
          setCompareReportB(data.reports[1].id);
        }

        // Pre-fill edit patient form
        setEditPatientForm({
          patient_identifier: data.patient.patient_identifier,
          age: data.patient.age !== null ? data.patient.age.toString() : '',
          date_of_birth: data.patient.date_of_birth || '',
          sex: data.patient.sex,
          status: data.patient.status
        });
      } else {
        error('Could not load patient record.');
      }
    } catch (err) {
      error('Connection error while fetching patient.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientRecord();
  }, [id]);

  // Handle Edit Patient Demographics
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    try {
      const res = await authFetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          patient_identifier: editPatientForm.patient_identifier.trim(),
          age: editPatientForm.age ? parseInt(editPatientForm.age, 10) : null,
          date_of_birth: editPatientForm.date_of_birth || null,
          sex: editPatientForm.sex,
          status: editPatientForm.status
        })
      });

      if (res.ok) {
        success('Patient demographics updated.');
        setIsEditPatientOpen(false);
        fetchPatientRecord();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to update patient.');
      }
    } catch (err) {
      error('Server communication error.');
    }
  };

  // Delete Patient
  const handleDeletePatient = async () => {
    if (!patient) return;
    if (!window.confirm(`Are you sure you want to delete patient "${patient.patient_identifier}"? This action is permanent.`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/patients/${patient.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        success('Patient record deleted.');
        navigate('/patients');
      } else {
        error('Failed to delete patient.');
      }
    } catch (err) {
      error('Server communication error.');
    }
  };

  // Handle Add/Edit User Provided Item
  const handleOpenAddItem = (cat: InfoCategory, item?: PatientInfoItem) => {
    setItemModalCategory(cat);
    if (item) {
      setEditingItem(item);
      setItemForm({
        title: item.title,
        description: item.description,
        detailField1: item.details?.dosage || item.details?.severity || item.details?.onset || '',
        detailField2: item.details?.frequency || item.details?.reaction || ''
      });
    } else {
      setEditingItem(null);
      setItemForm({ title: '', description: '', detailField1: '', detailField2: '' });
    }
    setIsAddItemOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    const detailsObj: Record<string, any> = {};
    if (itemModalCategory === 'medication') {
      if (itemForm.detailField1) detailsObj.dosage = itemForm.detailField1;
      if (itemForm.detailField2) detailsObj.frequency = itemForm.detailField2;
    } else if (itemModalCategory === 'allergy') {
      if (itemForm.detailField1) detailsObj.severity = itemForm.detailField1;
      if (itemForm.detailField2) detailsObj.reaction = itemForm.detailField2;
    } else if (itemModalCategory === 'symptom') {
      if (itemForm.detailField1) detailsObj.severity = itemForm.detailField1;
      if (itemForm.detailField2) detailsObj.onset = itemForm.detailField2;
    } else if (itemModalCategory === 'medical_history') {
      if (itemForm.detailField1) detailsObj.year = itemForm.detailField1;
    }

    try {
      if (editingItem) {
        const res = await authFetch(`/api/patients/${patient.id}/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: itemForm.title.trim(),
            description: itemForm.description.trim(),
            details: Object.keys(detailsObj).length > 0 ? detailsObj : null
          })
        });
        if (res.ok) {
          success('Clinical information item updated.');
          setIsAddItemOpen(false);
          fetchPatientRecord();
        } else {
          error('Failed to update item.');
        }
      } else {
        const res = await authFetch(`/api/patients/${patient.id}/items`, {
          method: 'POST',
          body: JSON.stringify({
            category: itemModalCategory,
            title: itemForm.title.trim(),
            description: itemForm.description.trim(),
            details: Object.keys(detailsObj).length > 0 ? detailsObj : null
          })
        });
        if (res.ok) {
          success(`Added ${itemModalCategory} (Source: User Provided).`);
          setIsAddItemOpen(false);
          fetchPatientRecord();
        } else {
          error('Failed to add item.');
        }
      }
    } catch (err) {
      error('Server communication error.');
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: number) => {
    if (!patient) return;
    if (!window.confirm('Delete this information record? This will be recorded in the timeline.')) {
      return;
    }

    try {
      const res = await authFetch(`/api/patients/${patient.id}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        success('Item removed and logged in timeline.');
        fetchPatientRecord();
      } else {
        error('Failed to delete item.');
      }
    } catch (err) {
      error('Server communication error.');
    }
  };

  // Upload Report
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !patient) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('patient_id', String(patient.id));
      formData.append('report_title', uploadTitle.trim() || selectedFile.name);
      formData.append('report_type', uploadType);
      formData.append('report_date', uploadDate);
      if (uploadLab.trim()) formData.append('lab_name', uploadLab.trim());
      formData.append('file', selectedFile);

      const res = await authFetch('/api/reports', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const json = await res.json();
        success(json.message || 'Report uploaded. Processing pipeline initiated.');
        setIsUploadReportOpen(false);
        setSelectedFile(null);
        setUploadTitle('');
        setUploadLab('');
        fetchPatientRecord();
      } else {
        const json = await res.json();
        error(json.error || 'Upload failed.');
      }
    } catch (err) {
      error('Network error during file upload.');
    } finally {
      setIsUploading(false);
    }
  };



  // Verification Action
  const handleVerificationAction = async (resultId: number, action: 'accepted' | 'edited' | 'rejected' | 'marked_uncertain', correctedVal?: string) => {
    try {
      const res = await authFetch(`/api/verification/${resultId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, corrected_value: correctedVal })
      });

      if (res.ok) {
        success(`Test marked as ${action.replace('_', ' ')}.`);
        if (editingResult) {
          setEditingResult(null);
          setEditResultValue('');
        }
        fetchPatientRecord();
      } else {
        const json = await res.json();
        error(json.error || 'Failed to submit verification action.');
      }
    } catch (err) {
      error('Server communication error.');
    }
  };

  // Execute Comparison
  const handleRunComparison = async () => {
    if (!patient || !compareReportA || !compareReportB) return;
    if (compareReportA === compareReportB) {
      error('Please select two different reports to compare.');
      return;
    }

    setIsComparing(true);
    try {
      const res = await authFetch(`/api/patients/${patient.id}/comparison?report_a=${compareReportA}&report_b=${compareReportB}`);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      } else {
        const json = await res.json();
        error(json.error || 'Failed to compare reports.');
      }
    } catch (err) {
      error('Network communication error during comparison.');
    } finally {
      setIsComparing(false);
    }
  };

  // Resolve Conflict
  const handleResolveConflict = async (conflictId: number) => {
    const note = prompt('Enter resolution note (optional):', 'Clinician verified and reconciled.');
    if (note === null) return;

    try {
      const res = await authFetch(`/api/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_note: note })
      });

      if (res.ok) {
        success('Conflict marked as resolved.');
        fetchPatientRecord();
      } else {
        error('Failed to resolve conflict.');
      }
    } catch (err) {
      error('Server communication error.');
    }
  };

  // Generate Patient-Friendly Summary
  const handleGenerateSummary = async () => {
    if (!patient) return;
    setIsGeneratingSummary(true);
    try {
      const res = await authFetch(`/api/patients/${patient.id}/summary/generate`, {
        method: 'POST'
      });

      if (res.ok) {
        const json = await res.json();
        success('Patient-friendly summary synthesized from verified records.');
        fetchPatientRecord();
      } else {
        const json = await res.json();
        error(json.error || 'Failed to generate summary.');
      }
    } catch (err) {
      error('Server communication error.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading comprehensive patient record...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-12 text-center max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs mt-8">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 mb-1">Patient Not Found</h2>
        <p className="text-xs text-slate-500 mb-4">The requested patient record could not be found or has been deleted.</p>
        <Link to="/patients" className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold">
          Return to Patients
        </Link>
      </div>
    );
  }

  // Final 8 Tabs mandated by Section 15
  const pendingCount = extractedResults.filter(r => !r.verification_action || r.verification_action === 'pending').length;
  const conflictsCount = conflicts.filter(c => c.status === 'pending').length;

  const tabs = [
    { id: 'overview', label: 'Patient Information', icon: User },
    { id: 'reports', label: `Medical Reports (${reports.length})`, icon: FileText },
    { id: 'results', label: `Extracted Results (${extractedResults.length})`, icon: FileCheck2 },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'verification', label: `Verification (${pendingCount})`, icon: CheckCheck, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'comparison', label: 'Comparison', icon: GitCompare },
    { id: 'conflicts', label: `Conflicts (${conflictsCount})`, icon: AlertOctagon, alert: conflictsCount > 0 },
    { id: 'ai_summary', label: `Clinical Summary (${summaries.length})`, icon: FileText },
    { id: 'timeline', label: `Timeline (${timeline.length})`, icon: Clock },
  ];

  const getStatusBadge = (status: string) => {
    const s = (status || 'unknown').toLowerCase();
    switch (s) {
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            NORMAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            HIGH
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            UNKNOWN
          </span>
        );
    }
  };

  const getProvenanceBadge = (item: ExtractedResult) => {
    if (item.verified === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Human Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3 h-3 text-slate-500" />
        AI Extracted (Unverified)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Back Link */}
      <div>
        <Link
          to="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patient Directory
        </Link>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-mono">
                {patient.patient_identifier}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                {patient.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Internal ID #{patient.id}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              <span><strong>Age:</strong> {patient.age !== null ? `${patient.age} yrs` : 'Not recorded'}</span>
              <span>•</span>
              <span><strong>DOB:</strong> {patient.date_of_birth || 'Not recorded'}</span>
              <span>•</span>
              <span><strong>Sex:</strong> {patient.sex}</span>
              <span>•</span>
              <span className="text-slate-400">Updated: {new Date(patient.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto flex-wrap">
            <Link
              to={`/patients/${patient.id}/export`}
              className="clinical-btn-secondary"
              title="Export Patient Record (Print / PDF)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export Record</span>
            </Link>
            <button
              onClick={() => setIsUploadReportOpen(true)}
              className="clinical-btn-primary"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Report</span>
            </button>
            <button
              onClick={() => setIsEditPatientOpen(true)}
              className="clinical-btn-secondary"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Demographics</span>
            </button>
            <button
              onClick={handleDeletePatient}
              className="clinical-btn-danger"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-lg px-2 overflow-x-auto">
        <nav className="flex space-x-1 min-w-max p-1" aria-label="Tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold border-b-2 border-blue-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.label}</span>
                {t.alert && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PATIENT INFORMATION (Symptoms, Conditions, Allergies, Meds, History, Notes) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Clinical Provenance Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Patient Information Intake:</span>
              <span className="text-slate-600">All profile items below are attributed as <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-blue-900 font-semibold">Source: User Provided</code>.</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['symptom', 'condition', 'allergy', 'medication', 'medical_history', 'note'] as InfoCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => handleOpenAddItem(cat)}
                  className="clinical-btn-secondary text-[11px] py-1 px-2.5"
                >
                  + Add {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* User-Provided Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Symptoms */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Symptoms ({items.symptoms.length})</h3>
                </div>
                <button onClick={() => handleOpenAddItem('symptom')} className="text-xs font-medium text-blue-900 hover:underline">
                  + Add
                </button>
              </div>
              {items.symptoms.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No symptoms documented.</p>
              ) : (
                <div className="space-y-1.5">
                  {items.symptoms.map(item => (
                    <div key={item.id} className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge-source-user">User Provided</span>
                          <button onClick={() => handleOpenAddItem('symptom', item)} className="p-0.5 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-0.5 text-slate-400 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      {item.description && <p className="text-slate-600 text-[11px]">{item.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Conditions */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Existing Conditions ({items.conditions.length})</h3>
                </div>
                <button onClick={() => handleOpenAddItem('condition')} className="text-xs font-medium text-blue-900 hover:underline">
                  + Add
                </button>
              </div>
              {items.conditions.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No conditions documented.</p>
              ) : (
                <div className="space-y-1.5">
                  {items.conditions.map(item => (
                    <div key={item.id} className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge-source-user">User Provided</span>
                          <button onClick={() => handleOpenAddItem('condition', item)} className="p-0.5 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-0.5 text-slate-400 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      {item.description && <p className="text-slate-600 text-[11px]">{item.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Allergies */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Allergies ({items.allergies.length})</h3>
                </div>
                <button onClick={() => handleOpenAddItem('allergy')} className="text-xs font-medium text-blue-900 hover:underline">
                  + Add
                </button>
              </div>
              {items.allergies.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No allergies recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {items.allergies.map(item => (
                    <div key={item.id} className="p-2.5 bg-amber-50/40 border border-amber-200/70 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-950">{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge-source-user">User Provided</span>
                          <button onClick={() => handleOpenAddItem('allergy', item)} className="p-0.5 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-0.5 text-slate-400 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      {item.description && <p className="text-slate-600 text-[11px]">{item.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medications */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Current Medications ({items.medications.length})</h3>
                </div>
                <button onClick={() => handleOpenAddItem('medication')} className="text-xs font-medium text-blue-900 hover:underline">
                  + Add
                </button>
              </div>
              {items.medications.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No medications recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {items.medications.map(item => (
                    <div key={item.id} className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge-source-user">User Provided</span>
                          <button onClick={() => handleOpenAddItem('medication', item)} className="p-0.5 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-0.5 text-slate-400 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      {item.description && <p className="text-slate-600 text-[11px]">{item.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medical History */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Medical & Surgical History ({items.medical_history.length})</h3>
                </div>
                <button onClick={() => handleOpenAddItem('medical_history')} className="text-xs font-medium text-blue-900 hover:underline">
                  + Add
                </button>
              </div>
              {items.medical_history.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No history recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {items.medical_history.map(item => (
                    <div key={item.id} className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge-source-user">User Provided</span>
                          <button onClick={() => handleOpenAddItem('medical_history', item)} className="p-0.5 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-0.5 text-slate-400 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      {item.description && <p className="text-slate-600 text-[11px]">{item.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Clinical Notes ({items.notes.length})</h3>
                </div>
                <button onClick={() => handleOpenAddItem('note')} className="text-xs font-medium text-blue-900 hover:underline">
                  + Add
                </button>
              </div>
              {items.notes.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No clinical notes recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {items.notes.map(item => (
                    <div key={item.id} className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="badge-source-user">User Provided</span>
                          <button onClick={() => handleOpenAddItem('note', item)} className="p-0.5 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-0.5 text-slate-400 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      {item.description && <p className="text-slate-600 text-[11px] leading-relaxed">{item.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MEDICAL REPORTS (Clean Professional Table per Section 6) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Medical Reports</h2>
              <p className="text-[11px] text-slate-500">Uploaded clinical laboratory and diagnostic documents</p>
            </div>
            <button
              onClick={() => setIsUploadReportOpen(true)}
              className="clinical-btn-primary"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Report</span>
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-lg space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">No medical reports uploaded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a report to begin extraction and clinical review.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsUploadReportOpen(true)}
                  className="clinical-btn-primary"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Medical Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Report</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Lab / Facility</th>
                    <th className="px-3 py-2.5">Extracted Tests</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>{report.report_title}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{report.file_name}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {report.report_date || 'Not recorded'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {report.lab_name || 'Standard Laboratory'}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <span className="font-medium">{report.extracted_count || 0} tests</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                          report.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {report.verification_status || report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/reports/${report.id}`}
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXTRACTED RESULTS (Provenance: Human Verified vs AI Extracted) */}
      {/* ========================================================================= */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Structured Extracted Laboratory Results</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All laboratory tests extracted from uploaded documents with deterministic range classifications and provenance.
              </p>
            </div>
            <Link
              to="/verification"
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 self-start"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open Verification Queue</span>
            </Link>
          </div>

          {extractedResults.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Structured Results Extracted</h3>
              <p className="text-xs text-slate-500 mt-1">Upload a medical report to extract structured laboratory data.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3.5 pl-5">Test Name</th>
                      <th className="p-3.5">Report Source</th>
                      <th className="p-3.5">Value</th>
                      <th className="p-3.5">Reference Range</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Provenance</th>
                      <th className="p-3.5">Confidence</th>
                      <th className="p-3.5">Source Snippet</th>
                      <th className="p-3.5 pr-5 text-right">Evidence & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {extractedResults.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-slate-900">{r.test_name}</td>
                        <td className="p-3.5 text-slate-500 max-w-[140px] truncate" title={r.report_title}>
                          {r.report_title || `#${r.report_id}`}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-900 font-mono">
                            {r.verified_value || r.value} {r.unit || ''}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {r.reference_range ? r.reference_range : <em className="text-slate-400">Not provided</em>}
                        </td>
                        <td className="p-3.5">{getStatusBadge(r.status)}</td>
                        <td className="p-3.5">{getProvenanceBadge(r)}</td>
                        <td className="p-3.5">
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {r.confidence_score}%
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[200px]">
                          <span className="font-mono text-[11px] text-slate-600 truncate block bg-slate-50 p-1.5 rounded border border-slate-200/60 select-all" title={r.source_snippet}>
                            "{r.source_snippet}"
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEvidenceModalResultId(r.id)}
                              className="px-2 py-0.5 text-[11px] font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                              title="View Source Evidence"
                            >
                              Evidence
                            </button>
                            <button
                              onClick={() => setExplainModalResultId(r.id)}
                              className="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                              title="Explain Result"
                            >
                              Explain
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: TRENDS (Feature 4: Patient Trend Visualization) */}
      {/* ========================================================================= */}
      {activeTab === 'trends' && patient && (
        <div className="space-y-4">
          <TrendChart patientId={patient.id} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VERIFICATION (Direct In-Page Review) */}
      {/* ========================================================================= */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Verification Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review extracted information before it becomes part of the verified patient record.
              </p>
            </div>
            <Link to="/verification" className="text-xs font-medium text-blue-900 hover:underline">
              Open Master Queue →
            </Link>
          </div>

          {pendingCount === 0 ? (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">All Items Verified</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every extracted result for this patient has been verified by an authorized clinician.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {extractedResults.filter(r => !r.verification_action || r.verification_action === 'pending').map(item => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-900">{item.test_name}</h4>
                      {getStatusBadge(item.status)}
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                        Confidence: {item.confidence_score}%
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      <span>Extracted: <strong>{item.value} {item.unit || ''}</strong></span>
                      <span>Range: <strong>{item.reference_range || 'Not provided'}</strong></span>
                      <span>Report: <em>{item.report_title}</em></span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-2 rounded text-[11px] text-slate-800 font-mono select-all">
                      <span className="font-semibold text-slate-700 not-italic block mb-0.5">Source Snippet:</span>
                      "{item.source_snippet}"
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-start md:self-auto">
                    <button
                      onClick={() => handleVerificationAction(item.id, 'accepted')}
                      className="clinical-btn-primary"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingResult(item);
                        setEditResultValue(item.value);
                      }}
                      className="clinical-btn-secondary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleVerificationAction(item.id, 'marked_uncertain')}
                      className="clinical-btn-secondary"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Mark Uncertain</span>
                    </button>
                    <button
                      onClick={() => handleVerificationAction(item.id, 'rejected')}
                      className="clinical-btn-danger"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REPORT COMPARISON (Numerical Only, No Subjective Claims) */}
      {/* ========================================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Compare Medical Reports</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Align identical tests across previous and current reports to inspect numerical change side-by-side.
              </p>
            </div>

            {reports.length < 2 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
                Patient requires at least 2 uploaded reports to perform longitudinal comparison. Upload an additional report to compare.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Previous Report</label>
                  <select
                    value={compareReportA || ''}
                    onChange={(e) => setCompareReportA(Number(e.target.value))}
                    className="clinical-input w-full py-1.5 text-xs"
                  >
                    {reports.map(r => (
                      <option key={r.id} value={r.id}>{r.report_title} ({r.report_date || 'Date N/A'})</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Current Report</label>
                  <select
                    value={compareReportB || ''}
                    onChange={(e) => setCompareReportB(Number(e.target.value))}
                    className="clinical-input w-full py-1.5 text-xs"
                  >
                    {reports.map(r => (
                      <option key={r.id} value={r.id}>{r.report_title} ({r.report_date || 'Date N/A'})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleRunComparison}
                  disabled={isComparing || !compareReportA || !compareReportB}
                  className="clinical-btn-primary"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>{isComparing ? 'Comparing...' : 'Compare Reports'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Comparison Table per Section 12 */}
          {comparisonData && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden space-y-3 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Longitudinal Test Alignment</h3>
                  <p className="text-[11px] text-slate-500">
                    Aligned tests: <strong>{comparisonData.matching_count}</strong> of {comparisonData.total_tests} tests matched.
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {comparisonData.notice}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="px-3 py-2">Test</th>
                      <th className="px-3 py-2">Previous Report ({comparisonData.previous_report.date})</th>
                      <th className="px-3 py-2">Current Report ({comparisonData.current_report.date})</th>
                      <th className="px-3 py-2">Change</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {comparisonData.comparison.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-900">{row.test_name}</td>
                        <td className="px-3 py-2 font-mono">
                          {row.previous_value} {row.previous_unit}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                          {row.current_value} {row.current_unit}
                        </td>
                        <td className="px-3 py-2 font-mono font-medium">
                          {row.numerical_delta !== null ? (
                            <span className={row.numerical_delta > 0 ? 'text-amber-800' : row.numerical_delta < 0 ? 'text-blue-800' : 'text-slate-600'}>
                              {row.numerical_delta > 0 ? `+${row.numerical_delta}` : row.numerical_delta} {row.current_unit}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-slate-500 text-[11px]">
                            {row.current_range !== '—' ? row.current_range : row.previous_range}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CONFLICTS (Section 13: Clean Review Required) */}
      {/* ========================================================================= */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Open Conflicts</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inconsistencies detected across records that require clinical review.
              </p>
            </div>
          </div>

          {conflicts.length === 0 ? (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No conflicts detected</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cross-reference checks between patient allergies, prescriptions, and lab tests revealed no conflicting information.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {conflicts.map(conf => (
                <div
                  key={conf.id}
                  className={`border rounded-lg p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 transition-colors ${
                    conf.status === 'resolved'
                      ? 'bg-slate-50 border-slate-200 opacity-75'
                      : 'bg-white border-rose-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{conf.title}</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                        {conf.type.replace('_', ' ')}
                      </span>
                      {conf.status === 'resolved' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Resolved
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {conf.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                      {conf.source_a_ref && <div><strong>Source A:</strong> {conf.source_a_ref}</div>}
                      {conf.source_b_ref && <div><strong>Source B:</strong> {conf.source_b_ref}</div>}
                    </div>
                  </div>

                  {conf.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                      <button
                        onClick={() => handleResolveConflict(conf.id)}
                        className="clinical-btn-primary"
                      >
                        Review / Resolve
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conf.id)}
                        className="clinical-btn-secondary"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: CLINICAL SUMMARY (Section 11) */}
      {/* ========================================================================= */}
      {activeTab === 'ai_summary' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Clinical Summary</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Summary generated from verified patient information and extracted report results.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {summaries.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs">
                  <span className="text-slate-400 font-medium">Version:</span>
                  <select
                    value={selectedSummaryVersion?.id || ''}
                    onChange={(e) => {
                      const found = summaries.find(s => s.id === Number(e.target.value));
                      if (found) setSelectedSummaryVersion(found);
                    }}
                    className="bg-transparent font-medium text-slate-800 outline-none"
                  >
                    {summaries.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        v{summaries.length - idx} ({new Date(s.generated_at || s.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="clinical-btn-primary"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isGeneratingSummary ? 'Generating...' : 'Generate Clinical Summary'}</span>
              </button>
            </div>
          </div>

          {!selectedSummaryVersion ? (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-lg space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">No Summary Generated Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate a structured clinical summary from verified results and patient intake.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="clinical-btn-primary"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Summary Now</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="text-xs text-slate-500">
                  <span>Generated: <strong>{new Date(selectedSummaryVersion.generated_at || selectedSummaryVersion.created_at).toLocaleString()}</strong></span>
                  {selectedSummaryVersion.based_on_report_ids && (
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Contributing Reports: {selectedSummaryVersion.based_on_report_ids}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSummaryVersion.content);
                      success('Summary copied to clipboard.');
                    }}
                    className="clinical-btn-secondary"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="clinical-btn-secondary"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Mandatory Non-Diagnostic Clinical Disclaimer */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded text-xs text-amber-950 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-950">Important Notice:</span>
                  <p className="mt-0.5 text-amber-900 leading-relaxed">
                    This summary organizes the available information for review and is not a medical diagnosis or treatment recommendation.
                  </p>
                </div>
              </div>

              {/* Render Structured Content */}
              <div className="whitespace-pre-wrap font-sans text-slate-800 text-xs sm:text-sm leading-relaxed space-y-3 pt-2">
                {selectedSummaryVersion.content}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: TIMELINE (Complete Chronological History) */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Authentic Patient Lifecycle History</h2>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs shadow-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={timelineFilter}
                onChange={(e) => setTimelineFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none"
              >
                <option value="all">All Events ({timeline.length})</option>
                <option value="PATIENT_CREATED">Patient Created</option>
                <option value="REPORT_UPLOADED">Report Uploaded</option>
                <option value="REPORT_VERIFIED">Report Verified</option>
                <option value="RESULT_VERIFIED">Result Verified</option>
                <option value="CONFLICT_DETECTED">Conflict Detected</option>
                <option value="COMPARISON_PERFORMED">Comparison Performed</option>
                <option value="SUMMARY_GENERATED">Summary Generated</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
              {timeline
                .filter(evt => timelineFilter === 'all' || evt.event_type === timelineFilter)
                .map(evt => (
                  <div key={evt.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-700 border-2 border-white shadow-sm"></div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-sm">{evt.title}</span>
                        <span className="text-[11px] text-slate-500">{new Date(evt.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{evt.description}</p>
                      <div className="text-[11px] text-slate-500 pt-0.5">
                        Author: <strong className="text-slate-700">{evt.author_name || user?.full_name || user?.email || 'Reviewer'}</strong> • Event: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">{evt.event_type}</code>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Patient Demographics */}
      {isEditPatientOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Edit Patient Demographics</h3>
              <button onClick={() => setIsEditPatientOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePatient} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Patient Identifier</label>
                <input
                  type="text"
                  required
                  value={editPatientForm.patient_identifier}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, patient_identifier: e.target.value })}
                  className="clinical-input font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={editPatientForm.age}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, age: e.target.value })}
                    className="clinical-input"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Biological Sex</label>
                  <select
                    value={editPatientForm.sex}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, sex: e.target.value as any })}
                    className="clinical-input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditPatientOpen(false)} className="clinical-btn-secondary">Cancel</button>
                <button type="submit" className="clinical-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit User-Provided Clinical Item */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingItem ? 'Edit Item' : `Add ${itemModalCategory.replace('_', ' ')}`}
                </h3>
                <span className="badge-source-user mt-1 inline-block">
                  Source: User Provided
                </span>
              </div>
              <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exertional Dyspnea, Penicillin, Lisinopril"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  className="clinical-input"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Clinical observations, frequency, dosage, or reactions..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="clinical-input"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddItemOpen(false)} className="clinical-btn-secondary">Cancel</button>
                <button type="submit" className="clinical-btn-primary">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Upload Medical Report */}
      {isUploadReportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-semibold text-slate-900">Upload Medical Report</h3>
              </div>
              <button onClick={() => setIsUploadReportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadReport} className="mt-4 space-y-3 text-xs">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-lg p-5 text-center cursor-pointer transition-colors">
                <input
                  type="file"
                  id="report-file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      if (!uploadTitle) setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="report-file" className="cursor-pointer block space-y-1">
                  <FileUp className="w-6 h-6 text-blue-700 mx-auto" />
                  <span className="font-medium text-slate-800 block">
                    {selectedFile ? selectedFile.name : 'Select PDF or Image Scan'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">Supported: PDF, PNG, JPG, JPEG up to 10MB</span>
                </label>
              </div>

              {selectedFile && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] space-y-0.5">
                  <div><strong>File:</strong> {selectedFile.name}</div>
                  <div><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</div>
                  <div><strong>Type:</strong> {selectedFile.type || 'application/octet-stream'}</div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Report Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Complete Blood Count & Metabolic Panel"
                  className="clinical-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Report Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="clinical-input"
                  >
                    <option value="Lab Test">Lab Test</option>
                    <option value="Imaging / Radiology">Imaging / Radiology</option>
                    <option value="Clinical Note">Clinical Note</option>
                    <option value="Pathology">Pathology</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Specimen Date</label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="clinical-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Facility / Laboratory Name</label>
                <input
                  type="text"
                  value={uploadLab}
                  onChange={(e) => setUploadLab(e.target.value)}
                  placeholder="e.g. Quest Diagnostics, MetroPath Lab"
                  className="clinical-input"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsUploadReportOpen(false)} className="clinical-btn-secondary">Cancel</button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="clinical-btn-primary disabled:opacity-50"
                >
                  {isUploading ? 'Uploading & Processing...' : 'Upload & Extract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inline Value Edit */}
      {editingResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Correct Test Value</h3>
              <button onClick={() => setEditingResult(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerificationAction(editingResult.id, 'edited', editResultValue);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Test Name</span>
                <span className="font-semibold text-slate-900 text-sm">{editingResult.test_name}</span>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Clinician-Verified Value *</label>
                <input
                  type="text"
                  required
                  value={editResultValue}
                  onChange={(e) => setEditResultValue(e.target.value)}
                  className="clinical-input font-semibold"
                />
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-700 font-mono select-all">
                "{editingResult.source_snippet}"
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingResult(null)} className="clinical-btn-secondary">Cancel</button>
                <button type="submit" className="clinical-btn-primary">Save & Verify</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature 1 & Feature 7: Evidence / Source Viewer Modal */}
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
