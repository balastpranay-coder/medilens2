const db = require('./db');
const { recordTimelineEvent } = require('./timeline');

/**
 * AI Summary Service
 * 
 * Safety Rules:
 * - Generated ONLY from:
 *   1. Verified extracted results (verified = 1)
 *   2. User-provided patient information
 * - NEVER generated directly from raw document text.
 * - NEVER diagnoses, prescribes, recommends treatment/medication/dosage, or claims diseases.
 * - Missing values are explicitly stated as "Not provided".
 * - Missing reference ranges are stated as "Reference range not provided".
 * - Unverified values are listed under "Information That May Need Review" as "Not yet verified".
 * - Verbatim safety notice required.
 */

async function generatePatientSummary({ patientId, userId }) {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  if (!patient) {
    throw new Error('Patient not found.');
  }

  // 1. Fetch user-provided information items
  const userItems = db.prepare(`
    SELECT * FROM patient_info_items 
    WHERE patient_id = ? 
    ORDER BY created_at ASC
  `).all(patientId);

  const symptoms = userItems.filter(i => i.category === 'symptom');
  const conditions = userItems.filter(i => i.category === 'condition');
  const allergies = userItems.filter(i => i.category === 'allergy');
  const medications = userItems.filter(i => i.category === 'medication');
  const history = userItems.filter(i => i.category === 'medical_history');
  const notes = userItems.filter(i => i.category === 'note');

  // 2. Fetch reports for this patient
  const reports = db.prepare(`
    SELECT * FROM medical_reports 
    WHERE patient_id = ? 
    ORDER BY report_date DESC, created_at DESC
  `).all(patientId);

  // 3. Fetch ONLY verified results for authoritative reporting
  const verifiedResults = db.prepare(`
    SELECT r.*, m.report_title, m.report_date
    FROM extracted_results r
    JOIN medical_reports m ON r.report_id = m.id
    WHERE m.patient_id = ? AND r.verified = 1 AND (r.verification_action IN ('accepted', 'edited') OR r.verification_action IS NULL)
    ORDER BY r.test_name ASC, m.report_date DESC
  `).all(patientId);

  // 4. Fetch unverified / uncertain results for review section
  const pendingOrUncertainResults = db.prepare(`
    SELECT r.*, m.report_title, m.report_date
    FROM extracted_results r
    JOIN medical_reports m ON r.report_id = m.id
    WHERE m.patient_id = ? AND (r.verified = 0 OR r.verification_action = 'marked_uncertain')
    ORDER BY r.test_name ASC
  `).all(patientId);

  // 5. Fetch detected conflicts
  const conflicts = db.prepare(`
    SELECT * FROM conflicts 
    WHERE patient_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(patientId);

  // Collect contributing report IDs
  const contributingReportIds = reports.map(r => r.id);

  // ----------------------------------------------------
  // Synthesize Patient-Friendly Structured Summary
  // ----------------------------------------------------

  // Section 1: Patient Information
  let patientInfoSection = `### Demographics\n- **Patient Identifier:** ${patient.patient_identifier}\n- **Age:** ${patient.age !== null ? `${patient.age} years` : 'Not provided'}\n- **Sex:** ${patient.sex || 'Not provided'}\n\n`;

  patientInfoSection += `### User-Reported Clinical Profile\n`;
  patientInfoSection += `- **Reported Symptoms:** ${symptoms.length > 0 ? symptoms.map(s => s.title).join(', ') : 'None reported'}\n`;
  patientInfoSection += `- **Documented Conditions:** ${conditions.length > 0 ? conditions.map(c => c.title).join(', ') : 'None documented'}\n`;
  patientInfoSection += `- **Known Allergies:** ${allergies.length > 0 ? allergies.map(a => a.title).join(', ') : 'None reported'}\n`;
  patientInfoSection += `- **Current Medications:** ${medications.length > 0 ? medications.map(m => `${m.title}${m.description ? ` (${m.description})` : ''}`).join(', ') : 'None recorded'}\n`;
  if (history.length > 0) {
    patientInfoSection += `- **Medical / Surgical History:** ${history.map(h => h.title).join(', ')}\n`;
  }
  if (notes.length > 0) {
    patientInfoSection += `- **User Notes:** ${notes.map(n => n.title).join('; ')}\n`;
  }

  // Section 2: Report Overview
  let reportOverviewSection = '';
  if (reports.length === 0) {
    reportOverviewSection = 'No medical or laboratory reports have been uploaded for this patient.\n';
  } else {
    reportOverviewSection = `The record contains **${reports.length} report${reports.length === 1 ? '' : 's'}**:\n\n`;
    reports.forEach(r => {
      reportOverviewSection += `- **${r.report_title}** (${r.report_type || 'Clinical Document'}) — Specimen Date: ${r.report_date || 'Not provided'}${r.lab_name ? ` | Facility: ${r.lab_name}` : ''} [Status: ${r.verification_status || 'pending'}]\n`;
    });
  }

  // Section 3: Reported Results (Verified extracted results only)
  let reportedResultsSection = '';
  if (verifiedResults.length === 0) {
    reportedResultsSection = 'No human-verified laboratory results are currently integrated. Extracted tests require clinical review and verification prior to inclusion.\n';
  } else {
    reportedResultsSection = `The following **${verifiedResults.length} test result${verifiedResults.length === 1 ? '' : 's'}** have been reviewed and human-verified:\n\n`;
    reportedResultsSection += `| Test | Verified Value | Unit | Reference Range | Status |\n`;
    reportedResultsSection += `| :--- | :--- | :--- | :--- | :--- |\n`;
    verifiedResults.forEach(item => {
      const displayVal = item.verified_value || item.value;
      const displayRange = item.reference_range ? item.reference_range : 'Reference range not provided';
      const displayStatus = item.status === 'normal' ? 'Normal' :
                            item.status === 'high' ? 'High' :
                            item.status === 'low' ? 'Low' : 'Unknown';
      reportedResultsSection += `| ${item.test_name} | ${displayVal} | ${item.unit || 'Not provided'} | ${displayRange} | ${displayStatus} |\n`;
    });
  }

  // Section 4: Information That May Need Review
  let reviewSection = '';
  const reviewPoints = [];

  if (pendingOrUncertainResults.length > 0) {
    const unverifiedCount = pendingOrUncertainResults.filter(r => r.verification_action !== 'marked_uncertain').length;
    const uncertainCount = pendingOrUncertainResults.filter(r => r.verification_action === 'marked_uncertain').length;
    if (unverifiedCount > 0) {
      reviewPoints.push(`**${unverifiedCount} test result(s) pending human verification:** Not yet verified for authoritative inclusion.`);
    }
    if (uncertainCount > 0) {
      reviewPoints.push(`**${uncertainCount} test result(s) marked uncertain by reviewer:** Requires further clinical clarification.`);
    }
  }

  if (conflicts.length > 0) {
    conflicts.forEach(c => {
      reviewPoints.push(`**Detected Inconsistency (${c.type.replace('_', ' ')}):** ${c.title} — ${c.description}`);
    });
  }

  // Check for missing demographic information
  if (patient.age === null) reviewPoints.push('Patient age was not provided.');
  if (!patient.date_of_birth) reviewPoints.push('Patient date of birth was not provided.');
  if (allergies.length === 0) reviewPoints.push('Allergy history is blank; confirm presence or absence of drug allergies.');

  if (reviewPoints.length === 0) {
    reviewSection = 'No outstanding unverified tests, conflicts, or critical missing information detected.\n';
  } else {
    reviewSection = reviewPoints.map(pt => `- ${pt}`).join('\n') + '\n';
  }

  // Section 5: Important Notice
  const importantNotice = `This summary organizes the available information for review and is not a medical diagnosis or treatment recommendation.`;

  // Assemble full summary markdown
  const fullContent = [
    `# Clinical Record Summary for ${patient.patient_identifier}`,
    `Generated on **${new Date().toLocaleString()}** | Source: Structured & Human-Verified Data Only\n`,
    `## Patient Information\n${patientInfoSection}`,
    `## Report Overview\n${reportOverviewSection}`,
    `## Reported Results\n${reportedResultsSection}`,
    `## Information That May Need Review\n${reviewSection}`,
    `## Important Notice\n> [!IMPORTANT]\n> ${importantNotice}`
  ].join('\n\n');

  // 6. Save new summary version in ai_summaries
  const insertStmt = db.prepare(`
    INSERT INTO ai_summaries (
      patient_id, content, summary_content, disclaimer, based_on_report_ids, generated_by, generated_at, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
  `);

  const res = insertStmt.run(
    patientId,
    fullContent,
    fullContent,
    importantNotice,
    JSON.stringify(contributingReportIds),
    userId,
    userId
  );

  const summaryId = Number(res.lastInsertRowid);

  // 7. Emit timeline event
  recordTimelineEvent({
    patient_id: patientId,
    event_type: 'SUMMARY_GENERATED',
    title: 'Patient-Friendly Summary Generated',
    description: `Generated structured summary based on ${verifiedResults.length} verified results and user-provided patient records.`,
    metadata: {
      summary_id: summaryId,
      based_on_report_ids: contributingReportIds,
      verified_results_count: verifiedResults.length
    },
    created_by: userId
  });

  return db.prepare('SELECT * FROM ai_summaries WHERE id = ?').get(summaryId);
}

function getPatientSummaries(patientId) {
  return db.prepare(`
    SELECT s.*, u.full_name as author_name
    FROM ai_summaries s
    LEFT JOIN users u ON s.generated_by = u.id
    WHERE s.patient_id = ?
    ORDER BY s.generated_at DESC, s.created_at DESC
  `).all(patientId);
}

module.exports = {
  generatePatientSummary,
  getPatientSummaries
};
