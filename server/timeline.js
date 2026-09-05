const db = require('./db');

/**
 * Records an immutable clinical event in the patient's timeline.
 * Event types:
 * - 'PATIENT_CREATED'
 * - 'INFO_ADDED'
 * - 'INFO_EDITED'
 * - 'INFO_DELETED'
 * - 'REPORT_UPLOADED'
 * - 'REPORT_PROCESSED'
 * - 'REPORT_VERIFIED'
 * - 'SUMMARY_GENERATED'
 */
function recordTimelineEvent({ patient_id, event_type, title, description, metadata, created_by }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO timeline_events (patient_id, event_type, title, description, metadata_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    stmt.run(patient_id, event_type, title, description || '', metadataStr, created_by || null);
  } catch (err) {
    console.error('Failed to record timeline event:', err);
  }
}

module.exports = {
  recordTimelineEvent
};
