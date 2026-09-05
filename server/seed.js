const db = require('./db');
const { hashPassword } = require('./auth');
const { evaluateReferenceRange } = require('./rangeEvaluator');

function seedDemoData() {
  console.log('[MedLens] Seeding synthetic hackathon demo data (NOT REAL PATIENT DATA)...');

  // 1. Create or get demo user
  const userCheck = db.prepare(`SELECT * FROM users WHERE email = ?`).get('demo.clinician@medlens.org');
  let userId;

  if (!userCheck) {
    const passwordHash = hashPassword('MedLensDemo2025!');
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);
    const res = insertUser.run('demo.clinician@medlens.org', passwordHash, 'Dr. Sarah Chen, MD', 'Clinical Reviewer');
    userId = res.lastInsertRowid;
  } else {
    userId = userCheck.id;
  }

  // Check if patients already exist
  const count = db.prepare(`SELECT COUNT(*) as count FROM patients`).get().count;
  if (count >= 3) {
    console.log(`[MedLens] Database already has ${count} patients. Skipping automatic seeding.`);
    return;
  }

  // Clean wipe demo patients if resetting
  resetAndSeed(userId);
}

function resetAndSeed(userId) {
  // Clear existing tables in clean order
  db.exec(`
    DELETE FROM verification_records;
    DELETE FROM conflicts;
    DELETE FROM ai_summaries;
    DELETE FROM timeline_events;
    DELETE FROM extracted_results;
    DELETE FROM medical_reports;
    DELETE FROM patient_info_items;
    DELETE FROM patients;
  `);

  // =========================================================================
  // Patient 1: PT-DEMO-101 (Hypertension, T2D, Penicillin Allergy)
  // =========================================================================
  const p1Res = db.prepare(`
    INSERT INTO patients (patient_identifier, age, date_of_birth, sex, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-14 days'), datetime('now', '-1 days'))
  `).run('PT-DEMO-101', 58, '1968-04-12', 'Male', 'Active', userId);
  const p1Id = Number(p1Res.lastInsertRowid);

  // Patient 1 Info items (all source: 'USER_PROVIDED')
  const insertItem = db.prepare(`
    INSERT INTO patient_info_items (patient_id, category, title, description, details_json, source, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'USER_PROVIDED', ?, datetime('now', '-14 days'), datetime('now', '-1 days'))
  `);

  insertItem.run(p1Id, 'symptom', 'Exertional dyspnea', 'Shortness of breath walking up stairs for the past 3 weeks', JSON.stringify({ severity: 'Moderate', onset: '3 weeks ago' }), userId);
  insertItem.run(p1Id, 'symptom', 'Bilateral lower extremity edema', 'Mild 1+ pitting pedal edema in evenings', JSON.stringify({ severity: 'Mild (1+)', location: 'Bilateral ankles' }), userId);
  insertItem.run(p1Id, 'symptom', 'Nocturnal dry cough', 'Intermittent dry cough when recumbent', JSON.stringify({ frequency: 'Nightly' }), userId);

  insertItem.run(p1Id, 'condition', 'Essential Hypertension', 'Diagnosed in 2018, managed on oral antihypertensives', JSON.stringify({ diagnosed_year: 2018, icd_ref: 'I10' }), userId);
  insertItem.run(p1Id, 'condition', 'Type 2 Diabetes Mellitus', 'Diet and oral agent controlled, no documented neuropathy', JSON.stringify({ diagnosed_year: 2020, icd_ref: 'E11.9' }), userId);

  insertItem.run(p1Id, 'allergy', 'Penicillin', 'Causes generalized urticaria and hives. Avoid beta-lactams.', JSON.stringify({ reaction: 'Urticaria / Hives', severity: 'High' }), userId);
  insertItem.run(p1Id, 'allergy', 'Sulfa Antibiotics', 'Mild erythematous macular rash without mucosal involvement.', JSON.stringify({ reaction: 'Macular rash', severity: 'Moderate' }), userId);

  insertItem.run(p1Id, 'medication', 'Lisinopril', '20 mg Oral Tablet, once daily in the morning', JSON.stringify({ dosage: '20mg', route: 'Oral', frequency: 'Daily' }), userId);
  insertItem.run(p1Id, 'medication', 'Metformin HCl', '1000 mg Oral Tablet, twice daily with meals', JSON.stringify({ dosage: '1000mg', route: 'Oral', frequency: 'BID' }), userId);
  insertItem.run(p1Id, 'medication', 'Atorvastatin Calcium', '40 mg Oral Tablet, once daily at bedtime', JSON.stringify({ dosage: '40mg', route: 'Oral', frequency: 'QHS' }), userId);
  // Deliberate conflict seed: Amoxicillin prescribed despite penicillin allergy
  insertItem.run(p1Id, 'medication', 'Amoxicillin Trihydrate', '500 mg Oral Capsule, TID (Dental prophylaxis record)', JSON.stringify({ dosage: '500mg', route: 'Oral', frequency: 'TID' }), userId);

  insertItem.run(p1Id, 'medical_history', 'Appendectomy', 'Uncomplicated laparoscopic surgery in 1995', JSON.stringify({ year: 1995 }), userId);
  insertItem.run(p1Id, 'medical_history', 'Right Knee Meniscal Debridement', 'Outpatient arthroscopic repair in 2014', JSON.stringify({ year: 2014 }), userId);

  insertItem.run(p1Id, 'note', 'Clinical Intake Note', 'Patient presents for routine quarterly review. Adherent to medications. Denies chest pain or fever. Comprehensive lab panels ordered.', JSON.stringify({ author: 'Dr. Sarah Chen, MD' }), userId);

  // Patient 1 Report A: Baseline Lab Panel (2025-01-15)
  const insertReport = db.prepare(`
    INSERT INTO medical_reports (
      patient_id, report_title, report_type, report_date, upload_date, status, processing_status, verification_status,
      file_name, file_type, lab_name, raw_text, summary, conflict_notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, datetime('now', '-20 days'), ?, ?, ?, ?, 'application/pdf', ?, ?, ?, ?, ?, datetime('now', '-20 days'), datetime('now', '-10 days'))
  `);

  const repAres = insertReport.run(
    p1Id,
    'Baseline Complete Blood Count & Metabolic Panel',
    'Lab Test',
    '2025-01-15',
    'VERIFIED',
    'extracted',
    'verified',
    'pt101_baseline_panel.pdf',
    'MetroPath Central Lab (Synthetic Demo)',
    `METROPATH CLINICAL REPORT\nPatient: PT-DEMO-101 | Specimen: 2025-01-15\nHemoglobin: 12.8 g/dL (Reference Range: 12.0-16.0 g/dL)\nFasting Glucose: 102 mg/dL (Reference Range: 70-100 mg/dL)\nSerum Creatinine: 0.90 mg/dL (Reference Range: 0.70-1.30 mg/dL)\neGFR: >60 mL/min (Reference Range: Not provided)\nPlatelet Count: 230 K/uL (Reference Range: 150-450 K/uL)\nTotal Cholesterol: 195 mg/dL (Reference Range: < 200 mg/dL)`,
    'Baseline laboratory testing showing normal hemoglobin and slight elevated fasting glucose.',
    'DEMO DATA — NOT REAL PATIENT INFORMATION',
    userId
  );
  const repAId = Number(repAres.lastInsertRowid);

  // Patient 1 Report B: Follow-up Lab Panel (2025-02-22) - Perfect for Report Comparison!
  const repBres = insertReport.run(
    p1Id,
    'Follow-up Complete Blood Count & Metabolic Panel',
    'Lab Test',
    '2025-02-22',
    'VERIFIED',
    'extracted',
    'verified',
    'pt101_followup_panel.pdf',
    'MetroPath Central Lab (Synthetic Demo)',
    `METROPATH CLINICAL REPORT\nPatient: PT-DEMO-101 | Specimen: 2025-02-22\nHemoglobin: 13.2 g/dL (Reference Range: 12.0-16.0 g/dL)\nFasting Glucose: 118 mg/dL (Reference Range: 70-100 mg/dL)\nSerum Creatinine: 0.95 mg/dL (Reference Range: 0.70-1.30 mg/dL)\neGFR: >60 mL/min (Reference Range: Not provided)\nPlatelet Count: 245 K/uL (Reference Range: 150-450 K/uL)\nTotal Cholesterol: 215 mg/dL (Reference Range: < 200 mg/dL)`,
    'Follow-up testing showing normal hemoglobin and elevated fasting glucose and total cholesterol.',
    'DEMO DATA — NOT REAL PATIENT INFORMATION',
    userId
  );
  const repBId = Number(repBres.lastInsertRowid);

  // Insert extracted results for Report A
  const insertExt = db.prepare(`
    INSERT INTO extracted_results (
      report_id, test_name, value, unit, reference_range, status, observation, confidence_score,
      source_snippet, verified, verified_value, verification_action, reviewed_by, reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-18 days'), datetime('now', '-20 days'))
  `);

  const rA1 = insertExt.run(repAId, 'Hemoglobin', '12.8', 'g/dL', '12.0-16.0 g/dL', 'normal', null, 96, 'Hemoglobin: 12.8 g/dL (Reference Range: 12.0-16.0 g/dL)', 1, '12.8', 'accepted', userId);
  const rA2 = insertExt.run(repAId, 'Fasting Glucose', '102', 'mg/dL', '70-100 mg/dL', 'high', null, 94, 'Fasting Glucose: 102 mg/dL (Reference Range: 70-100 mg/dL)', 1, '102', 'accepted', userId);
  const rA3 = insertExt.run(repAId, 'Serum Creatinine', '0.90', 'mg/dL', '0.70-1.30 mg/dL', 'normal', null, 95, 'Serum Creatinine: 0.90 mg/dL (Reference Range: 0.70-1.30 mg/dL)', 1, '0.90', 'accepted', userId);
  const rA4 = insertExt.run(repAId, 'eGFR', '>60', 'mL/min', null, 'unknown', null, 92, 'eGFR: >60 mL/min (Reference Range: Not provided)', 1, '>60', 'accepted', userId);
  const rA5 = insertExt.run(repAId, 'Platelet Count', '230', 'K/uL', '150-450 K/uL', 'normal', null, 95, 'Platelet Count: 230 K/uL (Reference Range: 150-450 K/uL)', 1, '230', 'accepted', userId);
  const rA6 = insertExt.run(repAId, 'Total Cholesterol', '195', 'mg/dL', '< 200 mg/dL', 'normal', null, 93, 'Total Cholesterol: 195 mg/dL (Reference Range: < 200 mg/dL)', 1, '195', 'accepted', userId);

  // Insert extracted results for Report B (Normal, High, Unknown)
  const rB1 = insertExt.run(repBId, 'Hemoglobin', '13.2', 'g/dL', '12.0-16.0 g/dL', 'normal', null, 96, 'Hemoglobin: 13.2 g/dL (Reference Range: 12.0-16.0 g/dL)', 1, '13.2', 'accepted', userId);
  const rB2 = insertExt.run(repBId, 'Fasting Glucose', '118', 'mg/dL', '70-100 mg/dL', 'high', null, 95, 'Fasting Glucose: 118 mg/dL (Reference Range: 70-100 mg/dL)', 1, '118', 'accepted', userId);
  const rB3 = insertExt.run(repBId, 'Serum Creatinine', '0.95', 'mg/dL', '0.70-1.30 mg/dL', 'normal', null, 95, 'Serum Creatinine: 0.95 mg/dL (Reference Range: 0.70-1.30 mg/dL)', 1, '0.95', 'accepted', userId);
  const rB4 = insertExt.run(repBId, 'eGFR', '>60', 'mL/min', null, 'unknown', null, 91, 'eGFR: >60 mL/min (Reference Range: Not provided)', 1, '>60', 'accepted', userId);
  const rB5 = insertExt.run(repBId, 'Platelet Count', '245', 'K/uL', '150-450 K/uL', 'normal', null, 94, 'Platelet Count: 245 K/uL (Reference Range: 150-450 K/uL)', 1, '245', 'accepted', userId);
  const rB6 = insertExt.run(repBId, 'Total Cholesterol', '215', 'mg/dL', '< 200 mg/dL', 'high', null, 93, 'Total Cholesterol: 215 mg/dL (Reference Range: < 200 mg/dL)', 1, '215', 'accepted', userId);

  // Verification history records for Report B
  const insertVerHist = db.prepare(`
    INSERT INTO verification_records (extracted_result_id, action, previous_value, new_value, reviewed_by, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'))
  `);
  insertVerHist.run(rB1.lastInsertRowid, 'accepted', '13.2', '13.2', userId);
  insertVerHist.run(rB2.lastInsertRowid, 'accepted', '118', '118', userId);
  insertVerHist.run(rB3.lastInsertRowid, 'accepted', '0.95', '0.95', userId);
  insertVerHist.run(rB4.lastInsertRowid, 'accepted', '>60', '>60', userId);
  insertVerHist.run(rB5.lastInsertRowid, 'accepted', '245', '245', userId);
  insertVerHist.run(rB6.lastInsertRowid, 'accepted', '215', '215', userId);

  // Patient 1 Report C: Pending Verification Report (with normal, high, low, unknown)
  const repCres = db.prepare(`
    INSERT INTO medical_reports (
      patient_id, report_title, report_type, report_date, upload_date, status, processing_status, verification_status,
      file_name, file_type, lab_name, raw_text, summary, conflict_notes, created_by, created_at, updated_at
    ) VALUES (?, ?, 'Lab Test', '2025-02-28', datetime('now', '-1 days'), 'PENDING_VERIFICATION', 'extracted', 'pending',
      'pt101_acute_labs.pdf', 'application/pdf', 'MetroPath Express Lab (Synthetic Demo)',
      'METROPATH EXPRESS PANEL\nPatient: PT-DEMO-101\nWhite Blood Cell Count: 14.5 K/uL (Reference Range: 4.5-11.0 K/uL)\nSerum Potassium: 3.1 mEq/L (Reference Range: 3.5-5.1 mEq/L)\nSerum Sodium: 138 mEq/L (Reference Range: 135-145 mEq/L)\nTroponin I: <0.01 ng/mL (Reference Range: Not provided)',
      'Acute panel pending clinician verification.',
      'DEMO DATA — NOT REAL PATIENT INFORMATION',
      ?, datetime('now', '-1 days'), datetime('now', '-1 days')
    )
  `).run(p1Id, 'Acute Chemistry & Electrolyte Panel', userId);
  const repCId = Number(repCres.lastInsertRowid);

  const insertPendingExt = db.prepare(`
    INSERT INTO extracted_results (
      report_id, test_name, value, unit, reference_range, status, observation, confidence_score,
      source_snippet, verified, verified_value, verification_action, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 'pending', datetime('now', '-1 days'))
  `);
  // High value: WBC 14.5
  insertPendingExt.run(repCId, 'White Blood Cell Count', '14.5', 'K/uL', '4.5-11.0 K/uL', 'high', null, 97, 'White Blood Cell Count: 14.5 K/uL (Reference Range: 4.5-11.0 K/uL)');
  // Low value: Potassium 3.1
  insertPendingExt.run(repCId, 'Serum Potassium', '3.1', 'mEq/L', '3.5-5.1 mEq/L', 'low', null, 95, 'Serum Potassium: 3.1 mEq/L (Reference Range: 3.5-5.1 mEq/L)');
  // Normal value: Sodium 138
  insertPendingExt.run(repCId, 'Serum Sodium', '138', 'mEq/L', '135-145 mEq/L', 'normal', null, 96, 'Serum Sodium: 138 mEq/L (Reference Range: 135-145 mEq/L)');
  // Unknown value: Troponin with no range
  insertPendingExt.run(repCId, 'Troponin I', '<0.01', 'ng/mL', null, 'unknown', null, 91, 'Troponin I: <0.01 ng/mL (Reference Range: Not provided)');

  // Patient 1 Pre-seeded Conflict: Penicillin Allergy vs Amoxicillin prescription
  db.prepare(`
    INSERT INTO conflicts (patient_id, type, title, description, source_a_ref, source_b_ref, status, created_at)
    VALUES (?, 'medication_conflict', 'Allergy & Active Medication Inconsistency: Penicillin vs Amoxicillin Trihydrate',
            'Patient has documented allergy to "Penicillin" while concurrently prescribed "Amoxicillin Trihydrate". Immediate clinical reconciliation advised.',
            'Allergy: Penicillin (High Severity)', 'Medication: Amoxicillin Trihydrate 500mg', 'pending', datetime('now', '-3 days'))
  `).run(p1Id);

  // Pre-seed an initial AI Summary version for Patient 1
  const summaryNotice = 'This summary organizes information provided in the patient\'s records. It is not a medical diagnosis or treatment recommendation. Please consult a qualified healthcare professional for medical interpretation.';
  const p1SummaryMarkdown = `# Clinical Record Summary for PT-DEMO-101
Generated on **2025-02-23, 10:15 AM** | Source: Structured & Human-Verified Data Only

## Patient Information
### Demographics
- **Patient Identifier:** PT-DEMO-101
- **Age:** 58 years
- **Sex:** Male

### User-Reported Clinical Profile
- **Reported Symptoms:** Exertional dyspnea, Bilateral lower extremity edema, Nocturnal dry cough
- **Documented Conditions:** Essential Hypertension, Type 2 Diabetes Mellitus
- **Known Allergies:** Penicillin, Sulfa Antibiotics
- **Current Medications:** Lisinopril (20mg), Metformin HCl (1000mg), Atorvastatin Calcium (40mg), Amoxicillin Trihydrate (500mg)

## Report Overview
The record contains **2 human-verified reports**:
- **Baseline Complete Blood Count & Metabolic Panel** (Lab Test) — Specimen Date: 2025-01-15 [Status: verified]
- **Follow-up Complete Blood Count & Metabolic Panel** (Lab Test) — Specimen Date: 2025-02-22 [Status: verified]

## Reported Results
The following **6 test results** have been reviewed and human-verified:

| Test | Verified Value | Unit | Reference Range | Status |
| :--- | :--- | :--- | :--- | :--- |
| Fasting Glucose | 118 | mg/dL | 70-100 mg/dL | High |
| Hemoglobin | 13.2 | g/dL | 12.0-16.0 g/dL | Normal |
| Platelet Count | 245 | K/uL | 150-450 K/uL | Normal |
| Serum Creatinine | 0.95 | mg/dL | 0.70-1.30 mg/dL | Normal |
| Total Cholesterol | 215 | mg/dL | < 200 mg/dL | High |
| eGFR | >60 | mL/min | Reference range not provided | Unknown |

## Information That May Need Review
- **4 test result(s) pending human verification:** In Acute Chemistry & Electrolyte Panel (White Blood Cell Count, Serum Potassium, Serum Sodium, Troponin I). Not yet verified for authoritative inclusion.
- **Detected Inconsistency (medication conflict):** Allergy & Active Medication Inconsistency: Penicillin vs Amoxicillin Trihydrate.

## Important Notice
> [!IMPORTANT]
> ${summaryNotice}`;

  db.prepare(`
    INSERT INTO ai_summaries (patient_id, content, summary_content, disclaimer, based_on_report_ids, generated_by, generated_at, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), ?, datetime('now', '-2 days'))
  `).run(p1Id, p1SummaryMarkdown, p1SummaryMarkdown, summaryNotice, JSON.stringify([repAId, repBId]), userId, userId);

  // =========================================================================
  // Patient 2: PT-DEMO-102 (Asthma, Contrast Allergy)
  // =========================================================================
  const p2Res = db.prepare(`
    INSERT INTO patients (patient_identifier, age, date_of_birth, sex, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-10 days'), datetime('now', '-2 days'))
  `).run('PT-DEMO-102', 34, '1991-08-25', 'Female', 'Review Required', userId);
  const p2Id = Number(p2Res.lastInsertRowid);

  insertItem.run(p2Id, 'symptom', 'Episodic wheezing', 'Nighttime bronchospasm triggered by cold air', JSON.stringify({ trigger: 'Cold air' }), userId);
  insertItem.run(p2Id, 'symptom', 'Chest tightness', 'Occurs post-exertion during aerobic exercise', JSON.stringify({ onset: 'Exercise-induced' }), userId);
  insertItem.run(p2Id, 'condition', 'Moderate Persistent Asthma', 'Diagnosed in 2012, recurrent seasonal exacerbations', JSON.stringify({ icd_ref: 'J45.40' }), userId);
  insertItem.run(p2Id, 'allergy', 'Iodinated Radiocontrast Media', 'Facial angioedema and pruritus during previous CT scan', JSON.stringify({ severity: 'High' }), userId);
  insertItem.run(p2Id, 'medication', 'Fluticasone / Salmeterol', '250/50 mcg DPI, 1 inhalation twice daily', JSON.stringify({ route: 'Inhaled', frequency: 'BID' }), userId);
  insertItem.run(p2Id, 'medication', 'Albuterol Sulfate HFA', '90 mcg/actuation, 2 puffs PRN wheezing or dyspnea', JSON.stringify({ route: 'Inhaled', frequency: 'PRN' }), userId);

  const repP2 = db.prepare(`
    INSERT INTO medical_reports (
      patient_id, report_title, report_type, report_date, upload_date, status, processing_status, verification_status,
      file_name, file_type, lab_name, raw_text, summary, conflict_notes, created_by, created_at, updated_at
    ) VALUES (?, 'Pulmonary Function & Spirometry Test', 'Lab Test', '2025-02-18', datetime('now', '-5 days'),
      'PROCESSED', 'extracted', 'in_review', 'pt102_pft_report.pdf', 'application/pdf', 'Apex Pulmonary Diagnostic Clinic (Synthetic Demo)',
      'PULMONARY FUNCTION TEST\nFEV1: 2.1 L (Reference Range: 2.8-3.6 L)\nFVC: 3.4 L (Reference Range: 3.2-4.2 L)\nFEV1/FVC Ratio: 61 % (Reference Range: 75-85 %)\nTotal Lung Capacity (TLC): 4.8 L (Reference Range: 4.2-5.8 L)\nDiffusing Capacity (DLCO): 88 % (Reference Range: Not provided)',
      'Obstructive ventilatory defect with reduced FEV1/FVC ratio.',
      'DEMO DATA — NOT REAL PATIENT INFORMATION',
      ?, datetime('now', '-5 days'), datetime('now', '-3 days')
    )
  `).run(p2Id, userId);
  const repP2Id = Number(repP2.lastInsertRowid);

  // Insert extracted results for Patient 2 (including Low values)
  insertExt.run(repP2Id, 'FEV1', '2.1', 'L', '2.8-3.6 L', 'low', null, 95, 'FEV1: 2.1 L (Reference Range: 2.8-3.6 L)', 1, '2.1', 'accepted', userId);
  insertExt.run(repP2Id, 'FVC', '3.4', 'L', '3.2-4.2 L', 'normal', null, 94, 'FVC: 3.4 L (Reference Range: 3.2-4.2 L)', 1, '3.4', 'accepted', userId);
  // Mark one result as uncertain
  insertExt.run(repP2Id, 'FEV1/FVC Ratio', '61', '%', '75-85 %', 'low', null, 88, 'FEV1/FVC Ratio: 61 % (Reference Range: 75-85 %)', 0, null, 'marked_uncertain', userId);
  insertExt.run(repP2Id, 'Diffusing Capacity (DLCO)', '88', '%', null, 'unknown', null, 90, 'Diffusing Capacity (DLCO): 88 % (Reference Range: Not provided)', 0, null, 'pending', userId);

  // =========================================================================
  // Patient 3: PT-DEMO-103 (CKD, Anemia)
  // =========================================================================
  const p3Res = db.prepare(`
    INSERT INTO patients (patient_identifier, age, date_of_birth, sex, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-8 days'), datetime('now', '-1 days'))
  `).run('PT-DEMO-103', 71, '1954-11-03', 'Female', 'Active', userId);
  const p3Id = Number(p3Res.lastInsertRowid);

  insertItem.run(p3Id, 'symptom', 'Generalized chronic fatigue', 'Fatigue worsening over 2 months, denies chest pain', JSON.stringify({ severity: 'Moderate' }), userId);
  insertItem.run(p3Id, 'condition', 'Chronic Kidney Disease Stage 3b', 'Documented eGFR 30-44 mL/min for >1 year', JSON.stringify({ icd_ref: 'N18.3' }), userId);
  insertItem.run(p3Id, 'condition', 'Normocytic Normochromic Anemia', 'Secondary to reduced erythropoietin production in CKD', JSON.stringify({ icd_ref: 'D63.1' }), userId);
  insertItem.run(p3Id, 'medication', 'Ferrous Sulfate', '325 mg Oral Tablet, once daily with vitamin C', JSON.stringify({ dosage: '325mg', frequency: 'Daily' }), userId);
  insertItem.run(p3Id, 'medication', 'Calcitriol', '0.25 mcg Oral Capsule, once daily', JSON.stringify({ dosage: '0.25mcg', frequency: 'Daily' }), userId);

  const repP3 = db.prepare(`
    INSERT INTO medical_reports (
      patient_id, report_title, report_type, report_date, upload_date, status, processing_status, verification_status,
      file_name, file_type, lab_name, raw_text, summary, conflict_notes, created_by, created_at, updated_at
    ) VALUES (?, 'Renal & Iron Metabolism Panel', 'Lab Test', '2025-02-25', datetime('now', '-2 days'),
      'PROCESSED', 'extracted', 'in_review', 'pt103_renal_panel.pdf', 'application/pdf', 'NephroRef Reference Lab (Synthetic Demo)',
      'NEPHROLOGY TESTING REPORT\nHemoglobin: 9.8 g/dL (Reference Range: 12.0-16.0 g/dL)\nSerum Ferritin: 140 ng/mL (Reference Range: 12-150 ng/mL)\nSerum Creatinine: 1.85 mg/dL (Reference Range: 0.70-1.30 mg/dL)\nBlood Urea Nitrogen (BUN): 32 mg/dL (Reference Range: 7-20 mg/dL)\neGFR: 36 mL/min (Reference Range: Not provided)',
      'Laboratory findings consistent with chronic renal insufficiency and normocytic anemia.',
      'DEMO DATA — NOT REAL PATIENT INFORMATION',
      ?, datetime('now', '-2 days'), datetime('now', '-1 days')
    )
  `).run(p3Id, userId);
  const repP3Id = Number(repP3.lastInsertRowid);

  // Extracted results for Patient 3 (Low Hemoglobin, High Creatinine & BUN, Unknown eGFR)
  insertExt.run(repP3Id, 'Hemoglobin', '9.8', 'g/dL', '12.0-16.0 g/dL', 'low', null, 97, 'Hemoglobin: 9.8 g/dL (Reference Range: 12.0-16.0 g/dL)', 1, '9.8', 'accepted', userId);
  insertExt.run(repP3Id, 'Serum Creatinine', '1.85', 'mg/dL', '0.70-1.30 mg/dL', 'high', null, 96, 'Serum Creatinine: 1.85 mg/dL (Reference Range: 0.70-1.30 mg/dL)', 1, '1.85', 'accepted', userId);
  insertExt.run(repP3Id, 'Blood Urea Nitrogen (BUN)', '32', 'mg/dL', '7-20 mg/dL', 'high', null, 94, 'Blood Urea Nitrogen (BUN): 32 mg/dL (Reference Range: 7-20 mg/dL)', 1, '32', 'accepted', userId);
  insertExt.run(repP3Id, 'eGFR', '36', 'mL/min', null, 'unknown', null, 90, 'eGFR: 36 mL/min (Reference Range: Not provided)', 0, null, 'pending', userId);

  // Seed authentic timeline events for all 3 demo patients
  const insertTimeline = db.prepare(`
    INSERT INTO timeline_events (patient_id, event_type, title, description, metadata_json, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTimeline.run(p1Id, 'PATIENT_CREATED', 'Patient Profile Created', 'Registered synthetic demonstration patient PT-DEMO-101.', JSON.stringify({ is_demo: true }), userId, '2025-01-10 09:00:00');
  insertTimeline.run(p1Id, 'REPORT_UPLOADED', 'Baseline Lab Report Uploaded', 'Uploaded pt101_baseline_panel.pdf.', JSON.stringify({ report_id: repAId }), userId, '2025-01-15 11:30:00');
  insertTimeline.run(p1Id, 'REPORT_PROCESSED', 'Baseline Extraction Completed', 'Extracted 6 structured tests with source provenance.', JSON.stringify({ count: 6 }), userId, '2025-01-15 11:32:00');
  insertTimeline.run(p1Id, 'REPORT_VERIFIED', 'Baseline Results Verified', 'All 6 baseline tests reviewed and verified.', JSON.stringify({ report_id: repAId }), userId, '2025-01-16 14:00:00');
  insertTimeline.run(p1Id, 'REPORT_UPLOADED', 'Follow-up Lab Report Uploaded', 'Uploaded pt101_followup_panel.pdf.', JSON.stringify({ report_id: repBId }), userId, '2025-02-22 10:00:00');
  insertTimeline.run(p1Id, 'REPORT_PROCESSED', 'Follow-up Extraction Completed', 'Extracted 6 structured tests with source provenance.', JSON.stringify({ count: 6 }), userId, '2025-02-22 10:02:00');
  insertTimeline.run(p1Id, 'REPORT_VERIFIED', 'Follow-up Results Verified', 'All 6 follow-up tests reviewed and verified.', JSON.stringify({ report_id: repBId }), userId, '2025-02-22 15:30:00');
  insertTimeline.run(p1Id, 'COMPARISON_PERFORMED', 'Report Comparison Executed', 'Compared baseline vs follow-up panels across 6 matching tests.', JSON.stringify({ report_a: repAId, report_b: repBId }), userId, '2025-02-23 09:45:00');
  insertTimeline.run(p1Id, 'CONFLICT_DETECTED', 'Medication Conflict Flagged', 'Allergy & active medication clash identified: Penicillin vs Amoxicillin.', JSON.stringify({ type: 'medication_conflict' }), null, '2025-02-23 10:00:00');
  insertTimeline.run(p1Id, 'SUMMARY_GENERATED', 'Patient Summary Generated', 'Structured non-diagnostic clinical summary generated from verified data.', JSON.stringify({ based_on: [repAId, repBId] }), userId, '2025-02-23 10:15:00');

  console.log('[MedLens] Synthetic hackathon demo dataset loaded successfully with 3 rich patients.');
}

module.exports = {
  seedDemoData,
  resetAndSeed
};
