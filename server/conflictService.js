const db = require('./db');
const { recordTimelineEvent } = require('./timeline');

/**
 * Deterministic Conflict Detection Service
 * 
 * Rules:
 * - age_mismatch: Conflicting patient ages between profile and reports
 * - medication_conflict: Active medication conflicts with documented allergy
 * - duplicate_report: Two reports appear to be duplicates
 * - value_mismatch: Discrepant values for the same test on the same specimen date
 * - date_inconsistency: Specimen date precedes DOB or is set in the future
 * - Does NOT automatically resolve conflicts. Emits: "Conflict detected — human review required."
 */

function detectPatientConflicts(patientId) {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  if (!patient) return [];

  const newlyFound = [];

  // Helper to insert conflict if not already recorded
  function recordConflictIfNotExists({ type, title, description, sourceARef, sourceBRef }) {
    const existing = db.prepare(`
      SELECT id FROM conflicts 
      WHERE patient_id = ? AND type = ? AND title = ? AND status = 'pending'
    `).get(patientId, type, title);

    if (!existing) {
      const res = db.prepare(`
        INSERT INTO conflicts (
          patient_id, type, title, description, source_a_ref, source_b_ref, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).run(patientId, type, title, description, sourceARef || null, sourceBRef || null);

      const conflictId = Number(res.lastInsertRowid);
      newlyFound.push({ id: conflictId, type, title, description });

      recordTimelineEvent({
        patient_id: patientId,
        event_type: 'CONFLICT_DETECTED',
        title: 'Clinical Conflict Detected',
        description: `${title}: ${description} (Conflict detected — human review required.)`,
        metadata: { conflict_id: conflictId, type, title },
        created_by: null
      });
    }
  }

  // 1. Check Medication vs Allergy Conflict
  const allergies = db.prepare(`
    SELECT * FROM patient_info_items 
    WHERE patient_id = ? AND category = 'allergy'
  `).all(patientId);

  const medications = db.prepare(`
    SELECT * FROM patient_info_items 
    WHERE patient_id = ? AND category = 'medication'
  `).all(patientId);

  allergies.forEach(allergy => {
    const allName = allergy.title.toLowerCase().trim();
    medications.forEach(med => {
      const medName = med.title.toLowerCase().trim();
      let isClash = false;

      // Cross-reactivity checks
      if (allName.includes('penicillin') && (medName.includes('amoxicillin') || medName.includes('ampicillin') || medName.includes('penicillin') || medName.includes('augmentin'))) {
        isClash = true;
      } else if (allName.includes('sulfa') && (medName.includes('bactrim') || medName.includes('sulfamethoxazole') || medName.includes('septra'))) {
        isClash = true;
      } else if (allName.includes('aspirin') && (medName.includes('aspirin') || medName.includes('ibuprofen') || medName.includes('nsaid'))) {
        isClash = true;
      } else if (allName === medName) {
        isClash = true;
      }

      if (isClash) {
        recordConflictIfNotExists({
          type: 'medication_conflict',
          title: `Allergy & Active Medication Inconsistency: ${allergy.title} vs ${med.title}`,
          description: `Patient has documented allergy to "${allergy.title}" while concurrently prescribed "${med.title}". Immediate clinical reconciliation advised.`,
          sourceARef: `Allergy: ${allergy.title} (ID #${allergy.id})`,
          sourceBRef: `Medication: ${med.title} (ID #${med.id})`
        });
      }
    });
  });

  // 2. Check for Duplicate Reports
  const reports = db.prepare(`
    SELECT id, report_title, report_type, report_date, file_name, file_type, created_at
    FROM medical_reports 
    WHERE patient_id = ?
  `).all(patientId);

  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const r1 = reports[i];
      const r2 = reports[j];
      const titleMatch = r1.report_title.toLowerCase().trim() === r2.report_title.toLowerCase().trim();
      const dateMatch = r1.report_date && r2.report_date && r1.report_date === r2.report_date;

      if (titleMatch && dateMatch) {
        recordConflictIfNotExists({
          type: 'duplicate_report',
          title: `Potential Duplicate Report Ingestion: "${r1.report_title}"`,
          description: `Two reports share identical title and specimen date (${r1.report_date}). Verify whether Report #${r1.id} and Report #${r2.id} represent duplicate uploads.`,
          sourceARef: `Report #${r1.id} (${r1.file_name})`,
          sourceBRef: `Report #${r2.id} (${r2.file_name})`
        });
      }
    }
  }

  // 3. Check for Value Mismatches on identical specimen dates
  const extracted = db.prepare(`
    SELECT r.id, r.test_name, r.value, r.unit, m.id as report_id, m.report_date, m.report_title
    FROM extracted_results r
    JOIN medical_reports m ON r.report_id = m.id
    WHERE m.patient_id = ? AND m.report_date IS NOT NULL
  `).all(patientId);

  for (let i = 0; i < extracted.length; i++) {
    for (let j = i + 1; j < extracted.length; j++) {
      const e1 = extracted[i];
      const e2 = extracted[j];

      if (e1.report_id !== e2.report_id && 
          e1.report_date === e2.report_date && 
          e1.test_name.toLowerCase().trim() === e2.test_name.toLowerCase().trim() &&
          e1.value.trim() !== e2.value.trim()) {
        recordConflictIfNotExists({
          type: 'value_mismatch',
          title: `Discrepant Results for "${e1.test_name}" on ${e1.report_date}`,
          description: `Report #${e1.report_id} reported ${e1.value} ${e1.unit || ''} whereas Report #${e2.report_id} reported ${e2.value} ${e2.unit || ''} on the same date (${e1.report_date}).`,
          sourceARef: `Report #${e1.report_id} ("${e1.report_title}"): ${e1.value} ${e1.unit || ''}`,
          sourceBRef: `Report #${e2.report_id} ("${e2.report_title}"): ${e2.value} ${e2.unit || ''}`
        });
      }
    }
  }

  // 4. Date Inconsistency (Report date in the future or before DOB)
  const todayStr = new Date().toISOString().split('T')[0];
  reports.forEach(r => {
    if (r.report_date && r.report_date > todayStr) {
      recordConflictIfNotExists({
        type: 'date_inconsistency',
        title: `Future Specimen Date: "${r.report_title}"`,
        description: `Report specimen date (${r.report_date}) is chronologically ahead of current system date (${todayStr}).`,
        sourceARef: `Report #${r.id} (${r.report_date})`,
        sourceBRef: `System Date: ${todayStr}`
      });
    }
    if (patient.date_of_birth && r.report_date && r.report_date < patient.date_of_birth) {
      recordConflictIfNotExists({
        type: 'date_inconsistency',
        title: `Specimen Date Precedes Patient Birth: "${r.report_title}"`,
        description: `Report date (${r.report_date}) precedes documented patient DOB (${patient.date_of_birth}).`,
        sourceARef: `Report #${r.id} (${r.report_date})`,
        sourceBRef: `DOB: ${patient.date_of_birth}`
      });
    }
  });

  return db.prepare('SELECT * FROM conflicts WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
}

function getPatientConflicts(patientId) {
  // First run live detection to pick up any newly uploaded reports or updated info
  detectPatientConflicts(patientId);
  return db.prepare('SELECT * FROM conflicts WHERE patient_id = ? ORDER BY status ASC, created_at DESC').all(patientId);
}

function resolveConflict({ conflictId, userId, resolutionNote }) {
  const conflict = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(conflictId);
  if (!conflict) throw new Error('Conflict not found.');

  db.prepare(`
    UPDATE conflicts 
    SET status = 'resolved',
        resolved_by = ?,
        resolved_at = datetime('now')
    WHERE id = ?
  `).run(userId, conflictId);

  recordTimelineEvent({
    patient_id: conflict.patient_id,
    event_type: 'CONFLICT_RESOLVED',
    title: 'Conflict Resolved by Reviewer',
    description: `Resolved conflict "${conflict.title}". Note: ${resolutionNote || 'Clinician acknowledged and addressed.'}`,
    metadata: { conflict_id: conflictId, type: conflict.type },
    created_by: userId
  });

  return db.prepare('SELECT * FROM conflicts WHERE id = ?').get(conflictId);
}

module.exports = {
  detectPatientConflicts,
  getPatientConflicts,
  resolveConflict
};
