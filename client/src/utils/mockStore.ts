import { 
  Patient, 
  PatientInfoItem, 
  MedicalReport, 
  ExtractedResult, 
  Conflict, 
  TimelineEvent, 
  AISummary, 
  DashboardData,
  ReviewCenterData,
  TestTrend,
  EvidenceData,
  QualityCheckData,
  PatientExportData,
  SearchResults
} from '../types';

// Default initial dataset for resilient fallback
const INITIAL_PATIENTS: Patient[] = [
  {
    id: 1,
    patient_identifier: 'PT-DEMO-101',
    age: 58,
    date_of_birth: '1968-04-12',
    sex: 'Male',
    status: 'Active',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    info_count: 8,
    report_count: 3
  },
  {
    id: 2,
    patient_identifier: 'PT-DEMO-102',
    age: 34,
    date_of_birth: '1991-08-25',
    sex: 'Female',
    status: 'Review Required',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    info_count: 6,
    report_count: 1
  },
  {
    id: 3,
    patient_identifier: 'PT-DEMO-103',
    age: 71,
    date_of_birth: '1954-11-03',
    sex: 'Female',
    status: 'Active',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    info_count: 5,
    report_count: 1
  }
];

const INITIAL_INFO_ITEMS: PatientInfoItem[] = [
  {
    id: 1,
    patient_id: 1,
    category: 'symptom',
    title: 'Exertional dyspnea',
    description: 'Shortness of breath walking up stairs for the past 3 weeks',
    details_json: JSON.stringify({ severity: 'Moderate', onset: '3 weeks ago' }),
    source: 'USER_PROVIDED',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    patient_id: 1,
    category: 'condition',
    title: 'Essential Hypertension',
    description: 'Diagnosed in 2018, managed on oral antihypertensives',
    details_json: JSON.stringify({ diagnosed_year: 2018, icd_ref: 'I10' }),
    source: 'USER_PROVIDED',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 3,
    patient_id: 1,
    category: 'allergy',
    title: 'Penicillin',
    description: 'Causes generalized urticaria and hives. Avoid beta-lactams.',
    details_json: JSON.stringify({ reaction: 'Urticaria / Hives', severity: 'High' }),
    source: 'USER_PROVIDED',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 4,
    patient_id: 1,
    category: 'medication',
    title: 'Lisinopril',
    description: '20 mg Oral Tablet, once daily in the morning',
    details_json: JSON.stringify({ dosage: '20mg', route: 'Oral', frequency: 'Daily' }),
    source: 'USER_PROVIDED',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 5,
    patient_id: 1,
    category: 'medication',
    title: 'Metformin HCl',
    description: '1000 mg Oral Tablet, twice daily with meals',
    details_json: JSON.stringify({ dosage: '1000mg', route: 'Oral', frequency: 'BID' }),
    source: 'USER_PROVIDED',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 6,
    patient_id: 1,
    category: 'medication',
    title: 'Amoxicillin Trihydrate',
    description: '500 mg Oral Capsule, TID (Dental prophylaxis record)',
    details_json: JSON.stringify({ dosage: '500mg', route: 'Oral', frequency: 'TID' }),
    source: 'USER_PROVIDED',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const INITIAL_REPORTS: MedicalReport[] = [
  {
    id: 1,
    patient_id: 1,
    report_title: 'Baseline Complete Blood Count & Metabolic Panel',
    report_type: 'Lab Test',
    report_date: '2025-01-15',
    upload_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    status: 'VERIFIED',
    processing_status: 'extracted',
    verification_status: 'verified',
    file_name: 'pt101_baseline_panel.pdf',
    file_type: 'application/pdf',
    lab_name: 'MetroPath Central Lab',
    raw_text: `METROPATH CLINICAL REPORT\nPatient: PT-DEMO-101 | Specimen: 2025-01-15\nHemoglobin: 12.8 g/dL (Reference Range: 12.0-16.0 g/dL)\nFasting Glucose: 102 mg/dL (Reference Range: 70-100 mg/dL)\nSerum Creatinine: 0.90 mg/dL (Reference Range: 0.70-1.30 mg/dL)\neGFR: >60 mL/min (Reference Range: Not provided)\nPlatelet Count: 230 K/uL (Reference Range: 150-450 K/uL)\nTotal Cholesterol: 195 mg/dL (Reference Range: < 200 mg/dL)`,
    summary: 'Baseline laboratory testing showing normal hemoglobin and slight elevated fasting glucose.',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    patient_identifier: 'PT-DEMO-101'
  },
  {
    id: 2,
    patient_id: 1,
    report_title: 'Follow-up Complete Blood Count & Metabolic Panel',
    report_type: 'Lab Test',
    report_date: '2025-02-22',
    upload_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: 'VERIFIED',
    processing_status: 'extracted',
    verification_status: 'verified',
    file_name: 'pt101_followup_panel.pdf',
    file_type: 'application/pdf',
    lab_name: 'MetroPath Central Lab',
    raw_text: `METROPATH CLINICAL REPORT\nPatient: PT-DEMO-101 | Specimen: 2025-02-22\nHemoglobin: 13.2 g/dL (Reference Range: 12.0-16.0 g/dL)\nFasting Glucose: 118 mg/dL (Reference Range: 70-100 mg/dL)\nSerum Creatinine: 0.95 mg/dL (Reference Range: 0.70-1.30 mg/dL)\neGFR: >60 mL/min (Reference Range: Not provided)\nPlatelet Count: 245 K/uL (Reference Range: 150-450 K/uL)\nTotal Cholesterol: 215 mg/dL (Reference Range: < 200 mg/dL)`,
    summary: 'Follow-up testing showing normal hemoglobin and elevated fasting glucose and total cholesterol.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    patient_identifier: 'PT-DEMO-101'
  },
  {
    id: 3,
    patient_id: 1,
    report_title: 'Acute Chemistry & Electrolyte Panel',
    report_type: 'Lab Test',
    report_date: '2025-02-28',
    upload_date: new Date(Date.now() - 86400000).toISOString(),
    status: 'PENDING_VERIFICATION',
    processing_status: 'extracted',
    verification_status: 'pending',
    file_name: 'pt101_acute_labs.pdf',
    file_type: 'application/pdf',
    lab_name: 'MetroPath Express Lab',
    raw_text: `METROPATH EXPRESS PANEL\nPatient: PT-DEMO-101\nWhite Blood Cell Count: 14.5 K/uL (Reference Range: 4.5-11.0 K/uL)\nSerum Potassium: 3.1 mEq/L (Reference Range: 3.5-5.1 mEq/L)\nSerum Sodium: 138 mEq/L (Reference Range: 135-145 mEq/L)\nTroponin I: <0.01 ng/mL (Reference Range: Not provided)`,
    summary: 'Acute panel pending clinician verification.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    patient_identifier: 'PT-DEMO-101'
  }
];

const INITIAL_RESULTS: ExtractedResult[] = [
  {
    id: 1,
    report_id: 1,
    test_name: 'Hemoglobin',
    value: '12.8',
    unit: 'g/dL',
    reference_range: '12.0-16.0 g/dL',
    status: 'normal',
    observation: null,
    confidence_score: 96,
    source_snippet: 'Hemoglobin: 12.8 g/dL (Reference Range: 12.0-16.0 g/dL)',
    verified: 1,
    verified_value: '12.8',
    verification_action: 'accepted',
    report_title: 'Baseline Complete Blood Count & Metabolic Panel',
    report_date: '2025-01-15',
    lab_name: 'MetroPath Central Lab',
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 2,
    report_id: 1,
    test_name: 'Fasting Glucose',
    value: '102',
    unit: 'mg/dL',
    reference_range: '70-100 mg/dL',
    status: 'high',
    observation: null,
    confidence_score: 94,
    source_snippet: 'Fasting Glucose: 102 mg/dL (Reference Range: 70-100 mg/dL)',
    verified: 1,
    verified_value: '102',
    verification_action: 'accepted',
    report_title: 'Baseline Complete Blood Count & Metabolic Panel',
    report_date: '2025-01-15',
    lab_name: 'MetroPath Central Lab',
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 3,
    report_id: 2,
    test_name: 'Hemoglobin',
    value: '13.2',
    unit: 'g/dL',
    reference_range: '12.0-16.0 g/dL',
    status: 'normal',
    observation: null,
    confidence_score: 96,
    source_snippet: 'Hemoglobin: 13.2 g/dL (Reference Range: 12.0-16.0 g/dL)',
    verified: 1,
    verified_value: '13.2',
    verification_action: 'accepted',
    report_title: 'Follow-up Complete Blood Count & Metabolic Panel',
    report_date: '2025-02-22',
    lab_name: 'MetroPath Central Lab',
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 4,
    report_id: 2,
    test_name: 'Fasting Glucose',
    value: '118',
    unit: 'mg/dL',
    reference_range: '70-100 mg/dL',
    status: 'high',
    observation: null,
    confidence_score: 95,
    source_snippet: 'Fasting Glucose: 118 mg/dL (Reference Range: 70-100 mg/dL)',
    verified: 1,
    verified_value: '118',
    verification_action: 'accepted',
    report_title: 'Follow-up Complete Blood Count & Metabolic Panel',
    report_date: '2025-02-22',
    lab_name: 'MetroPath Central Lab',
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 5,
    report_id: 3,
    test_name: 'White Blood Cell Count',
    value: '14.5',
    unit: 'K/uL',
    reference_range: '4.5-11.0 K/uL',
    status: 'high',
    observation: null,
    confidence_score: 97,
    source_snippet: 'White Blood Cell Count: 14.5 K/uL (Reference Range: 4.5-11.0 K/uL)',
    verified: 0,
    verified_value: null,
    verification_action: 'pending',
    report_title: 'Acute Chemistry & Electrolyte Panel',
    report_date: '2025-02-28',
    lab_name: 'MetroPath Express Lab',
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 6,
    report_id: 3,
    test_name: 'Serum Potassium',
    value: '3.1',
    unit: 'mEq/L',
    reference_range: '3.5-5.1 mEq/L',
    status: 'low',
    observation: null,
    confidence_score: 95,
    source_snippet: 'Serum Potassium: 3.1 mEq/L (Reference Range: 3.5-5.1 mEq/L)',
    verified: 0,
    verified_value: null,
    verification_action: 'pending',
    report_title: 'Acute Chemistry & Electrolyte Panel',
    report_date: '2025-02-28',
    lab_name: 'MetroPath Express Lab',
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const INITIAL_CONFLICTS: Conflict[] = [
  {
    id: 1,
    patient_id: 1,
    type: 'medication_conflict',
    title: 'Allergy & Active Medication Inconsistency: Penicillin vs Amoxicillin Trihydrate',
    description: 'Patient has documented allergy to "Penicillin" while concurrently prescribed "Amoxicillin Trihydrate". Immediate clinical reconciliation advised.',
    source_a_ref: 'Allergy: Penicillin (High Severity)',
    source_b_ref: 'Medication: Amoxicillin Trihydrate 500mg',
    status: 'pending',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

const INITIAL_TIMELINE: TimelineEvent[] = [
  {
    id: 1,
    patient_id: 1,
    event_type: 'PATIENT_CREATED',
    title: 'Patient Profile Created',
    description: 'Registered patient record PT-DEMO-101.',
    metadata_json: null,
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 2,
    patient_id: 1,
    event_type: 'REPORT_UPLOADED',
    title: 'Baseline Lab Report Uploaded',
    description: 'Uploaded pt101_baseline_panel.pdf.',
    metadata_json: JSON.stringify({ report_id: 1 }),
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 3,
    patient_id: 1,
    event_type: 'REPORT_VERIFIED',
    title: 'Baseline Results Verified',
    description: 'All 6 baseline tests reviewed and verified.',
    metadata_json: JSON.stringify({ report_id: 1 }),
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 18 * 86400000).toISOString()
  },
  {
    id: 4,
    patient_id: 1,
    event_type: 'CONFLICT_DETECTED',
    title: 'Medication Conflict Flagged',
    description: 'Allergy & active medication clash identified: Penicillin vs Amoxicillin.',
    metadata_json: JSON.stringify({ type: 'medication_conflict' }),
    patient_identifier: 'PT-DEMO-101',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

// Helper to get or initialize persistent localStorage data
function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(`medlens_store_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`medlens_store_${key}`, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export class LocalClinicalStore {
  private static patients: Patient[] = getStored('patients', INITIAL_PATIENTS);
  private static items: PatientInfoItem[] = getStored('items', INITIAL_INFO_ITEMS);
  private static reports: MedicalReport[] = getStored('reports', INITIAL_REPORTS);
  private static results: ExtractedResult[] = getStored('results', INITIAL_RESULTS);
  private static conflicts: Conflict[] = getStored('conflicts', INITIAL_CONFLICTS);
  private static timeline: TimelineEvent[] = getStored('timeline', INITIAL_TIMELINE);

  static getDashboardData(): DashboardData {
    const total_patients = this.patients.length;
    const total_reports = this.reports.length;
    const reports_processed = this.reports.filter(r => r.processing_status === 'extracted').length;
    const pending_verification = this.results.filter(r => !r.verified).length;
    const verified_results = this.results.filter(r => r.verified === 1).length;
    const conflicts_detected = this.conflicts.length;
    const conflicts_requiring_review = this.conflicts.filter(c => c.status === 'pending').length;

    return {
      metrics: {
        total_patients,
        total_reports,
        reports_processed,
        reports_pending_verification: this.reports.filter(r => r.verification_status === 'pending').length,
        pending_verification,
        verified_results,
        conflicts_detected,
        conflicts_requiring_review
      },
      recent_patients: this.patients.slice(0, 5),
      recent_reports: this.reports.slice(0, 5),
      recent_activity: this.timeline.slice(0, 6)
    };
  }

  static getReviewCenterItems(): ReviewCenterData {
    const pendingReports = this.reports.filter(r => r.verification_status === 'pending');
    const lowConf = this.results.filter(r => r.confidence_score < 75);
    const uncertain = this.results.filter(r => r.verification_action === 'marked_uncertain');
    const openConflicts = this.conflicts.filter(c => c.status === 'pending');
    const procIssues = this.reports.filter(r => r.processing_status === 'failed');

    return {
      total_items: pendingReports.length + lowConf.length + uncertain.length + openConflicts.length + procIssues.length,
      categories: {
        pending_reports: { title: 'Pending Report Verifications', count: pendingReports.length, items: pendingReports },
        low_confidence: { title: 'Low Extraction Confidence', count: lowConf.length, items: lowConf },
        uncertain_results: { title: 'Marked Uncertain by Reviewers', count: uncertain.length, items: uncertain },
        open_conflicts: { title: 'Unresolved Clinical Inconsistencies', count: openConflicts.length, items: openConflicts },
        processing_issues: { title: 'Processing & Extraction Errors', count: procIssues.length, items: procIssues }
      }
    };
  }

  static getPatients(): Patient[] {
    return this.patients;
  }

  static getPatient(id: number): Patient | undefined {
    return this.patients.find(p => p.id === id);
  }

  static createPatient(data: Partial<Patient>): Patient {
    const newId = Date.now();
    const newPatient: Patient = {
      id: newId,
      patient_identifier: data.patient_identifier || `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      age: data.age || 45,
      date_of_birth: data.date_of_birth || '1980-01-01',
      sex: data.sex || 'Male',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      info_count: 0,
      report_count: 0
    };
    this.patients.unshift(newPatient);
    setStored('patients', this.patients);

    this.timeline.unshift({
      id: Date.now(),
      patient_id: newId,
      event_type: 'PATIENT_CREATED',
      title: 'Patient Profile Created',
      description: `Registered patient ${newPatient.patient_identifier}.`,
      metadata_json: null,
      patient_identifier: newPatient.patient_identifier,
      created_at: new Date().toISOString()
    });
    setStored('timeline', this.timeline);

    return newPatient;
  }

  static getPatientItems(patientId: number): PatientInfoItem[] {
    return this.items.filter(i => i.patient_id === patientId);
  }

  static addPatientItem(patientId: number, item: Partial<PatientInfoItem>): PatientInfoItem {
    const newItem: PatientInfoItem = {
      id: Date.now(),
      patient_id: patientId,
      category: item.category || 'note',
      title: item.title || 'Clinical Item',
      description: item.description || '',
      details_json: item.details_json || null,
      source: 'USER_PROVIDED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.items.unshift(newItem);
    setStored('items', this.items);
    return newItem;
  }

  static getPatientReports(patientId: number): MedicalReport[] {
    return this.reports.filter(r => r.patient_id === patientId);
  }

  static getAllReports(): MedicalReport[] {
    return this.reports;
  }

  static getReport(reportId: number): MedicalReport | undefined {
    return this.reports.find(r => r.id === reportId);
  }

  static getReportResults(reportId: number): ExtractedResult[] {
    return this.results.filter(r => r.report_id === reportId);
  }

  static verifyResult(resultId: number, action: 'accepted' | 'edited' | 'rejected' | 'marked_uncertain', customValue?: string): ExtractedResult | undefined {
    const res = this.results.find(r => r.id === resultId);
    if (res) {
      res.verification_action = action;
      res.verified = action === 'rejected' || action === 'marked_uncertain' ? 0 : 1;
      if (customValue !== undefined) {
        res.verified_value = customValue;
      }
      res.reviewed_at = new Date().toISOString();
      setStored('results', this.results);
    }
    return res;
  }

  static getPatientTimeline(patientId: number): TimelineEvent[] {
    return this.timeline.filter(t => t.patient_id === patientId);
  }

  static getPatientConflicts(patientId: number): Conflict[] {
    return this.conflicts.filter(c => c.patient_id === patientId);
  }

  static getPatientTrends(patientId: number): TestTrend[] {
    const patientReportIds = this.reports.filter(r => r.patient_id === patientId).map(r => r.id);
    const patientResults = this.results.filter(r => patientReportIds.includes(r.report_id));

    const grouped: { [key: string]: ExtractedResult[] } = {};
    for (const r of patientResults) {
      if (!grouped[r.test_name]) grouped[r.test_name] = [];
      grouped[r.test_name].push(r);
    }

    const trends: TestTrend[] = [];
    for (const [test_name, list] of Object.entries(grouped)) {
      trends.push({
        test_name,
        unit: list[0]?.unit || '',
        data_points: list.map(item => ({
          result_id: item.id,
          report_id: item.report_id,
          report_title: item.report_title || 'Report',
          date: item.report_date || '2025-01-01',
          raw_value: item.value,
          numeric_value: parseFloat(item.value.replace(/[^0-9.]/g, '')) || null,
          unit: item.unit || '',
          reference_range: item.reference_range,
          status: item.status,
          verified: item.verified === 1,
          lab_name: item.lab_name
        }))
      });
    }
    return trends;
  }

  static search(q: string): SearchResults {
    const query = q.toLowerCase();
    const matchedPatients = this.patients.filter(p => 
      p.patient_identifier.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query)
    );
    const matchedReports = this.reports.filter(r => 
      r.report_title.toLowerCase().includes(query) ||
      r.lab_name?.toLowerCase().includes(query)
    );
    const matchedTests = this.results.filter(t => 
      t.test_name.toLowerCase().includes(query) ||
      t.value.toLowerCase().includes(query)
    );

    return {
      query: q,
      results: {
        patients: matchedPatients,
        reports: matchedReports,
        tests: matchedTests
      },
      total_matches: matchedPatients.length + matchedReports.length + matchedTests.length
    };
  }
}
