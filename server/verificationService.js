const db = require('./db');
const { recordTimelineEvent } = require('./timeline');

/**
 * Human Verification Service
 * 
 * Enforces:
 * - Accept: verified = true, verified_value = extracted value, action = 'accepted'
 * - Edit: verified = true, verified_value = corrected value, action = 'edited'
 * - Reject: verified = false, action = 'rejected'
 * - Mark Uncertain: verified = false, action = 'marked_uncertain' ("Uncertain — requires review")
 * - Does NOT silently change extracted values.
 * - Every verification action creates an immutable history record in verification_records.
 */

function recordVerificationAction({ extractedResultId, action, correctedValue, reviewerId }) {
  const result = db.prepare(`
    SELECT r.*, m.patient_id, m.report_title 
    FROM extracted_results r
    JOIN medical_reports m ON r.report_id = m.id
    WHERE r.id = ?
  `).get(extractedResultId);

  if (!result) {
    throw new Error('Extracted result not found.');
  }

  const validActions = ['accepted', 'edited', 'rejected', 'marked_uncertain'];
  if (!validActions.includes(action)) {
    throw new Error(`Invalid verification action: ${action}. Must be one of: ${validActions.join(', ')}`);
  }

  let isVerified = 0;
  let finalVerifiedValue = null;
  const previousVal = result.verified_value || result.value;

  if (action === 'accepted') {
    isVerified = 1;
    finalVerifiedValue = result.value;
  } else if (action === 'edited') {
    if (!correctedValue || String(correctedValue).trim() === '') {
      throw new Error('Corrected value is required when editing a result.');
    }
    isVerified = 1;
    finalVerifiedValue = String(correctedValue).trim();
  } else if (action === 'rejected') {
    isVerified = 0;
    finalVerifiedValue = null;
  } else if (action === 'marked_uncertain') {
    isVerified = 0;
    finalVerifiedValue = null;
  }

  // 1. Update extracted_results record
  db.prepare(`
    UPDATE extracted_results
    SET verified = ?,
        verified_value = ?,
        verification_action = ?,
        reviewed_by = ?,
        reviewed_at = datetime('now')
    WHERE id = ?
  `).run(isVerified, finalVerifiedValue, action, reviewerId, extractedResultId);

  // 2. Insert immutable verification audit record
  db.prepare(`
    INSERT INTO verification_records (
      extracted_result_id, action, previous_value, new_value, reviewed_by, created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(extractedResultId, action, previousVal, finalVerifiedValue || previousVal, reviewerId);

  // 3. Update report verification status if appropriate
  const reportResults = db.prepare(`
    SELECT id, verified, verification_action 
    FROM extracted_results 
    WHERE report_id = ?
  `).all(result.report_id);

  const allReviewed = reportResults.every(r => r.verification_action && r.verification_action !== 'pending');
  const hasVerified = reportResults.some(r => r.verified === 1);

  if (allReviewed) {
    const newStatus = hasVerified ? 'verified' : 'in_review';
    db.prepare(`
      UPDATE medical_reports 
      SET verification_status = ?, 
          status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, hasVerified ? 'VERIFIED' : 'IN_REVIEW', result.report_id);
  } else {
    db.prepare(`
      UPDATE medical_reports 
      SET verification_status = 'in_review',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(result.report_id);
  }

  // 4. Record authentic timeline event
  const actionLabels = {
    accepted: 'Result Verified (Accepted)',
    edited: 'Result Verified with Clinical Correction',
    rejected: 'Result Rejected by Reviewer',
    marked_uncertain: 'Result Marked Uncertain (Requires Clinical Review)'
  };

  const reviewer = reviewerId ? db.prepare('SELECT full_name FROM users WHERE id = ?').get(reviewerId) : null;
  const reviewerName = reviewer ? reviewer.full_name : 'Reviewer';

  recordTimelineEvent({
    patient_id: result.patient_id,
    event_type: action === 'accepted' ? 'RESULT_VERIFIED' :
                action === 'edited' ? 'RESULT_EDITED' :
                action === 'rejected' ? 'RESULT_REJECTED' : 'RESULT_UNCERTAIN',
    title: actionLabels[action] || 'Result Verification Action',
    description: `${reviewerName} ${action === 'accepted' ? 'accepted' : action === 'edited' ? `corrected to "${finalVerifiedValue}"` : action === 'rejected' ? 'rejected' : 'marked uncertain'} "${result.test_name}" for report "${result.report_title}".`,
    metadata: {
      result_id: extractedResultId,
      report_id: result.report_id,
      test_name: result.test_name,
      action,
      extracted_value: result.value,
      verified_value: finalVerifiedValue
    },
    created_by: reviewerId
  });

  return db.prepare('SELECT * FROM extracted_results WHERE id = ?').get(extractedResultId);
}

function getVerificationHistory(extractedResultId) {
  return db.prepare(`
    SELECT v.*, u.full_name as reviewer_name, u.role as reviewer_role
    FROM verification_records v
    LEFT JOIN users u ON v.reviewed_by = u.id
    WHERE v.extracted_result_id = ?
    ORDER BY v.created_at DESC
  `).all(extractedResultId);
}

function getPendingVerificationQueue() {
  // Returns reports with pending status and their extracted results
  const reports = db.prepare(`
    SELECT r.*, p.patient_identifier, p.age, p.sex
    FROM medical_reports r
    JOIN patients p ON r.patient_id = p.id
    WHERE r.verification_status IN ('pending', 'in_review')
       OR EXISTS (SELECT 1 FROM extracted_results WHERE report_id = r.id AND (verification_action IS NULL OR verification_action = 'pending'))
    ORDER BY r.report_date DESC, r.created_at DESC
  `).all();

  return reports.map(rep => {
    const items = db.prepare(`
      SELECT * FROM extracted_results 
      WHERE report_id = ? 
      ORDER BY id ASC
    `).all(rep.id);
    return {
      ...rep,
      results: items
    };
  });
}

module.exports = {
  recordVerificationAction,
  getVerificationHistory,
  getPendingVerificationQueue
};
