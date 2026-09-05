const db = require('./db');
const { hashPassword } = require('./auth');

console.log('[MedLens] Cleaning all dummy/fabricated demo data from database...');

// Clear all fake patients, reports, results, conflicts, summaries, timeline
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

// Reset autoincrement sequence for clean real IDs
db.exec(`
  DELETE FROM sqlite_sequence WHERE name IN (
    'patients', 'patient_info_items', 'medical_reports',
    'extracted_results', 'timeline_events', 'conflicts',
    'ai_summaries', 'verification_records'
  );
`);

// Ensure clinician user exists for login
const clinician = db.prepare('SELECT id FROM users WHERE email = ?').get('demo.clinician@medlens.org');
if (!clinician) {
  const passwordHash = hashPassword('MedLensDemo2025!');
  db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `).run('demo.clinician@medlens.org', passwordHash, 'Clinical Reviewer', 'Clinical Reviewer');
  console.log('[MedLens] Clinician account created: demo.clinician@medlens.org');
} else {
  db.prepare(`UPDATE users SET full_name = 'Clinical Reviewer' WHERE full_name = 'Dr. Sarah Chen, MD'`).run();
  console.log('[MedLens] Clinician account retained: demo.clinician@medlens.org');
}

// Verify database counts
const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
const reportCount = db.prepare('SELECT COUNT(*) as count FROM medical_reports').get().count;
const resultCount = db.prepare('SELECT COUNT(*) as count FROM extracted_results').get().count;

console.log(`[MedLens] Database successfully cleaned!`);
console.log(`Patients: ${patientCount} | Reports: ${reportCount} | Extracted Results: ${resultCount}`);
