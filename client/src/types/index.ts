export interface User {
  id: number | string;
  email: string;
  full_name: string;
  role: string;
  photo_url?: string | null;
  phone_number?: string | null;
  created_at?: string;
}

export interface Patient {
  id: number;
  patient_identifier: string;
  age: number | null;
  date_of_birth: string | null;
  sex: 'Male' | 'Female' | 'Other';
  status: 'Active' | 'Discharged' | 'Review Required' | 'Inactive';
  created_by?: number;
  created_at: string;
  updated_at: string;
  info_count?: number;
  report_count?: number;
}

export type InfoCategory = 
  | 'symptom' 
  | 'condition' 
  | 'allergy' 
  | 'medication' 
  | 'medical_history' 
  | 'note';

export interface PatientInfoItem {
  id: number;
  patient_id: number;
  category: InfoCategory;
  title: string;
  description: string;
  details_json: string | null;
  details?: any;
  source: 'USER_PROVIDED';
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus = 'uploaded' | 'processing' | 'extracted' | 'failed';
export type VerificationStatus = 'pending' | 'in_review' | 'verified';
export type VerificationAction = 'pending' | 'accepted' | 'edited' | 'rejected' | 'marked_uncertain';
export type ReportType = 'Lab Test' | 'Imaging / Radiology' | 'Clinical Note' | 'Discharge Summary' | 'Pathology' | 'Other';

export interface MedicalReport {
  id: number;
  patient_id: number;
  report_title: string;
  report_type: ReportType;
  report_date: string;
  upload_date?: string;
  file_path?: string;
  file_name?: string;
  file_type?: string;
  lab_name?: string;
  processing_status?: ProcessingStatus;
  verification_status?: VerificationStatus;
  error_message?: string;
  status: string;
  raw_text?: string;
  summary?: string;
  conflict_notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  patient_identifier?: string;
  age?: number;
  sex?: string;
  extracted_count?: number;
}

export interface ExtractedResult {
  id: number;
  report_id: number;
  test_name: string;
  value: string;
  unit: string | null;
  reference_range: string | null; // NULL if not provided in report
  status: 'normal' | 'high' | 'low' | 'unknown'; // strictly computed deterministically
  observation: string | null;
  confidence_score: number; // 0 to 100 extraction confidence only
  source_snippet: string; // verbatim quote from uploaded report
  verified: number; // 0 or 1
  verified_value?: string | null;
  verification_action?: VerificationAction;
  reviewed_by?: number;
  reviewed_at?: string;
  report_title?: string;
  report_date?: string;
  lab_name?: string;
  patient_identifier?: string;
  page_number?: number | null;
  created_at: string;
}

export interface VerificationRecord {
  id: number;
  extracted_result_id: number;
  action: 'accepted' | 'edited' | 'rejected' | 'marked_uncertain';
  previous_value: string | null;
  new_value: string | null;
  reviewed_by: number | null;
  reviewer_name?: string;
  reviewer_role?: string;
  created_at: string;
}

export type ConflictType = 
  | 'age_mismatch'
  | 'medication_conflict'
  | 'duplicate_report'
  | 'value_mismatch'
  | 'date_inconsistency';

export interface Conflict {
  id: number;
  patient_id: number;
  type: ConflictType;
  title: string;
  description: string;
  source_a_ref: string | null;
  source_b_ref: string | null;
  status: 'pending' | 'resolved';
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
}

export interface ComparisonItem {
  test_name: string;
  previous_value: string;
  previous_unit: string;
  previous_range: string;
  previous_status: string;
  current_value: string;
  current_unit: string;
  current_range: string;
  current_status: string;
  numerical_delta: number | null;
  matching: boolean;
}

export interface ComparisonData {
  previous_report: {
    id: number;
    title: string;
    date: string;
    lab_name?: string;
  };
  current_report: {
    id: number;
    title: string;
    date: string;
    lab_name?: string;
  };
  matching_count: number;
  total_tests: number;
  comparison: ComparisonItem[];
  notice: string;
}

export type TimelineEventType = 
  | 'PATIENT_CREATED'
  | 'INFO_ADDED'
  | 'INFO_EDITED'
  | 'INFO_DELETED'
  | 'REPORT_UPLOADED'
  | 'REPORT_PROCESSED'
  | 'REPORT_VERIFIED'
  | 'RESULT_VERIFIED'
  | 'RESULT_EDITED'
  | 'RESULT_REJECTED'
  | 'RESULT_UNCERTAIN'
  | 'CONFLICT_DETECTED'
  | 'CONFLICT_RESOLVED'
  | 'COMPARISON_PERFORMED'
  | 'SUMMARY_GENERATED';

export interface TimelineEvent {
  id: number;
  patient_id: number;
  event_type: TimelineEventType;
  title: string;
  description: string;
  metadata_json: string | null;
  metadata?: any;
  created_by?: number;
  author_name?: string;
  patient_identifier?: string;
  created_at: string;
}

export interface AISummary {
  id: number;
  patient_id: number;
  content: string;
  summary_content?: string;
  key_observations?: string;
  disclaimer: string;
  based_on_report_ids?: string; // JSON string
  generated_by?: number;
  author_name?: string;
  generated_at?: string;
  created_by?: number;
  created_at: string;
}

export interface DashboardMetrics {
  total_patients: number;
  total_reports: number;
  reports_processed: number;
  reports_pending_verification: number;
  pending_verification: number;
  verified_results: number;
  conflicts_detected: number;
  conflicts_requiring_review: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recent_patients: Patient[];
  recent_reports: MedicalReport[];
  recent_activity?: TimelineEvent[];
}

export interface PipelineStep {
  step: number;
  title: string;
  status: 'completed' | 'pending' | 'omitted';
  detail: string;
}

export interface EvidenceData {
  result: {
    id: number;
    test_name: string;
    value: string;
    verified_value?: string | null;
    unit: string | null;
    reference_range: string | null;
    status: 'normal' | 'high' | 'low' | 'unknown';
    confidence_score: number;
    verified: boolean;
    verification_action?: VerificationAction;
    provenance: string;
    source_snippet: string;
    page_number: number;
  };
  report: {
    id: number;
    title: string;
    date: string;
    laboratory: string;
    file_name?: string;
    file_type?: string;
  };
  patient: {
    id: number;
    patient_identifier: string;
  };
  pipeline: PipelineStep[];
}

export interface QualityCheckData {
  report_id: number;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  file_size_formatted: string;
  text_extraction_status: string;
  ocr_required: boolean;
  report_date_detected: boolean;
  report_date: string;
  laboratory_detected: boolean;
  laboratory: string;
  patient_identifier_detected: boolean;
  patient_identifier: string;
  total_tests_extracted: number;
  reference_ranges_detected: number;
  warnings: string[];
}

export interface TrendDataPoint {
  result_id: number;
  report_id: number;
  report_title: string;
  date: string;
  raw_value: string;
  numeric_value: number | null;
  unit: string;
  reference_range: string | null;
  status: string;
  verified: boolean;
  lab_name?: string;
}

export interface TestTrend {
  test_name: string;
  unit: string;
  data_points: TrendDataPoint[];
}

export interface ReviewCenterCategory {
  title: string;
  count: number;
  items: any[];
}

export interface ReviewCenterData {
  total_items: number;
  categories: {
    pending_reports: ReviewCenterCategory;
    low_confidence: ReviewCenterCategory;
    uncertain_results: ReviewCenterCategory;
    open_conflicts: ReviewCenterCategory;
    processing_issues: ReviewCenterCategory;
  };
}

export interface ResultExplanation {
  test_name: string;
  reported_value: string;
  unit: string | null;
  reference_range: string;
  system_status: string;
  source_snippet: string;
  source_report: string;
  explanation: string;
  disclaimer: string;
}

export interface SearchResults {
  query: string;
  results: {
    patients: Patient[];
    reports: MedicalReport[];
    tests: ExtractedResult[];
  };
  total_matches: number;
}

export interface PatientExportData {
  patient: Patient;
  info_items: PatientInfoItem[];
  reports: MedicalReport[];
  results: ExtractedResult[];
  conflicts: Conflict[];
  timeline: TimelineEvent[];
  latest_summary: AISummary | null;
  generated_at: string;
  disclaimer: string;
}
