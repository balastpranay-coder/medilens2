const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.resolve(__dirname, '..', 'medlens.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'Clinical Reviewer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_identifier TEXT UNIQUE NOT NULL,
    age INTEGER,
    date_of_birth TEXT,
    sex TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS patient_info_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    category TEXT NOT NULL, -- 'symptom', 'condition', 'allergy', 'medication', 'medical_history', 'note'
    title TEXT NOT NULL,
    description TEXT,
    details_json TEXT,
    source TEXT NOT NULL DEFAULT 'USER_PROVIDED',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS medical_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    report_title TEXT NOT NULL,
    report_type TEXT NOT NULL,
    report_date TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_path TEXT,
    file_name TEXT,
    file_type TEXT,
    lab_name TEXT,
    processing_status TEXT DEFAULT 'uploaded', -- 'uploaded', 'processing', 'extracted', 'failed'
    verification_status TEXT DEFAULT 'pending', -- 'pending', 'in_review', 'verified'
    error_message TEXT,
    status TEXT DEFAULT 'PENDING_VERIFICATION', -- for backward compatibility
    raw_text TEXT,
    summary TEXT,
    conflict_notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS extracted_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT, -- nullable. If report does not provide reference range: NULL. Do NOT invent one.
    status TEXT NOT NULL DEFAULT 'unknown', -- 'normal', 'high', 'low', 'unknown'
    observation TEXT,
    confidence_score INTEGER DEFAULT 90, -- 0 to 100 (extraction confidence only, not disease severity)
    source_snippet TEXT NOT NULL, -- exact quote from uploaded report
    verified INTEGER DEFAULT 0,
    verified_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES medical_reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata_json TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS verification_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracted_result_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'accepted', 'edited', 'rejected', 'marked_uncertain'
    previous_value TEXT,
    new_value TEXT,
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extracted_result_id) REFERENCES extracted_results(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'age_mismatch', 'medication_conflict', 'duplicate_report', 'value_mismatch', 'date_inconsistency'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_a_ref TEXT,
    source_b_ref TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved'
    resolved_by INTEGER,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ai_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    content TEXT,
    summary_content TEXT,
    key_observations TEXT,
    disclaimer TEXT,
    based_on_report_ids TEXT, -- JSON array of report IDs used
    generated_by INTEGER,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

// Safe column migrations for existing tables if needed
try {
  // medical_reports
  const medRepInfo = db.prepare(`PRAGMA table_info(medical_reports)`).all();
  const medRepCols = medRepInfo.map(c => c.name);
  if (!medRepCols.includes('file_path')) db.exec(`ALTER TABLE medical_reports ADD COLUMN file_path TEXT;`);
  if (!medRepCols.includes('file_type')) db.exec(`ALTER TABLE medical_reports ADD COLUMN file_type TEXT;`);
  if (!medRepCols.includes('lab_name')) db.exec(`ALTER TABLE medical_reports ADD COLUMN lab_name TEXT;`);
  if (!medRepCols.includes('upload_date')) db.exec(`ALTER TABLE medical_reports ADD COLUMN upload_date DATETIME;`);
  if (!medRepCols.includes('processing_status')) db.exec(`ALTER TABLE medical_reports ADD COLUMN processing_status TEXT DEFAULT 'uploaded';`);
  if (!medRepCols.includes('verification_status')) db.exec(`ALTER TABLE medical_reports ADD COLUMN verification_status TEXT DEFAULT 'pending';`);
  if (!medRepCols.includes('error_message')) db.exec(`ALTER TABLE medical_reports ADD COLUMN error_message TEXT;`);
  if (!medRepCols.includes('file_size')) db.exec(`ALTER TABLE medical_reports ADD COLUMN file_size INTEGER;`);
  if (!medRepCols.includes('ocr_used')) db.exec(`ALTER TABLE medical_reports ADD COLUMN ocr_used INTEGER DEFAULT 0;`);

  // extracted_results
  const extInfo = db.prepare(`PRAGMA table_info(extracted_results)`).all();
  const extCols = extInfo.map(c => c.name);
  if (!extCols.includes('verification_action')) db.exec(`ALTER TABLE extracted_results ADD COLUMN verification_action TEXT DEFAULT 'pending';`);
  if (!extCols.includes('reviewed_by')) db.exec(`ALTER TABLE extracted_results ADD COLUMN reviewed_by INTEGER;`);
  if (!extCols.includes('reviewed_at')) db.exec(`ALTER TABLE extracted_results ADD COLUMN reviewed_at DATETIME;`);
  if (!extCols.includes('report_date')) db.exec(`ALTER TABLE extracted_results ADD COLUMN report_date TEXT;`);
  if (!extCols.includes('provenance')) db.exec(`ALTER TABLE extracted_results ADD COLUMN provenance TEXT DEFAULT 'AI Extracted';`);
  if (!extCols.includes('page_number')) db.exec(`ALTER TABLE extracted_results ADD COLUMN page_number INTEGER DEFAULT 1;`);

  // ai_summaries
  const sumInfo = db.prepare(`PRAGMA table_info(ai_summaries)`).all();
  const sumCols = sumInfo.map(c => c.name);
  if (!sumCols.includes('content')) db.exec(`ALTER TABLE ai_summaries ADD COLUMN content TEXT;`);
  if (!sumCols.includes('based_on_report_ids')) db.exec(`ALTER TABLE ai_summaries ADD COLUMN based_on_report_ids TEXT;`);
  if (!sumCols.includes('generated_by')) db.exec(`ALTER TABLE ai_summaries ADD COLUMN generated_by INTEGER;`);
  if (!sumCols.includes('generated_at')) db.exec(`ALTER TABLE ai_summaries ADD COLUMN generated_at DATETIME;`);
} catch (e) {
  console.warn('Migration note:', e.message);
}

module.exports = db;
