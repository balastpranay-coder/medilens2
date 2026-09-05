require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');
const db = require('./db');
const { hashPassword, comparePassword, generateToken, requireAuth } = require('./auth');
const { recordTimelineEvent } = require('./timeline');
const { seedDemoData, resetAndSeed } = require('./seed');
const { processReport, createSyntheticDemoReport } = require('./extractionService');
const { recordVerificationAction, getVerificationHistory, getPendingVerificationQueue } = require('./verificationService');
const { generatePatientSummary, getPatientSummaries } = require('./summaryService');
const { detectPatientConflicts, getPatientConflicts, resolveConflict } = require('./conflictService');
const { compareReports } = require('./comparisonService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Clinical Safety Header & Logging Middleware
app.use((req, res, next) => {
  res.setHeader('X-MedLens-System', 'Clinical-Information-Intelligence');
  res.setHeader('X-MedLens-Safety-Boundaries', 'Non-Diagnostic-Organization-Only');
  next();
});

// Ensure private uploads directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer secure file storage configuration (max 10MB, PDF/JPG/PNG only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedExts.includes(ext) && (allowedMimes.includes(file.mimetype) || file.mimetype === 'application/octet-stream')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, JPG, JPEG, and PNG files are accepted.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const clientDist = path.resolve(__dirname, '../client/dist');

// Middleware to serve React SPA index.html for direct browser navigation to shared pathnames
function allowBrowserNavOrAuth(req, res, next) {
  if (!req.headers.authorization && req.accepts('html') && fs.existsSync(path.join(clientDist, 'index.html'))) {
    return res.sendFile(path.join(clientDist, 'index.html'));
  }
  requireAuth(req, res, next);
}

// Ensure clinician user exists for authentication (real data mode - no fake patients)
try {
  const clinician = db.prepare('SELECT id FROM users WHERE email = ?').get('demo.clinician@medlens.org');
  if (!clinician) {
    const passwordHash = hashPassword('MedLensDemo2025!');
    db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run('demo.clinician@medlens.org', passwordHash, 'Clinical Reviewer', 'Clinical Reviewer');
    console.log('[MedLens] Clinician account initialized: demo.clinician@medlens.org');
  }
  // Ensure no fictional identity in users table
  db.prepare(`UPDATE users SET full_name = 'Clinical Reviewer' WHERE full_name = 'Dr. Sarah Chen, MD'`).run();
} catch (err) {
  console.error('[MedLens] User initialization error:', err);
}

// Authorization check helpers
function verifyReportAccess(req, res, reportId) {
  const report = db.prepare(`
    SELECT r.*, p.created_by as patient_created_by, p.patient_identifier
    FROM medical_reports r
    JOIN patients p ON r.patient_id = p.id
    WHERE r.id = ?
  `).get(reportId);

  if (!report) {
    res.status(404).json({ error: 'Report not found.' });
    return null;
  }

  // Check authorization: creator of patient or admin
  if (report.patient_created_by && report.patient_created_by !== req.user.id && req.user.role !== 'Admin') {
    res.status(403).json({ error: 'Unauthorized access to this patient medical record.' });
    return null;
  }

  return report;
}

function verifyPatientAccess(req, res, patientId) {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);

  if (!patient) {
    res.status(404).json({ error: 'Patient not found.' });
    return null;
  }

  // Check authorization: creator of patient or admin
  if (patient.created_by && patient.created_by !== req.user.id && req.user.role !== 'Admin') {
    res.status(403).json({ error: 'Unauthorized access to this patient record.' });
    return null;
  }

  return patient;
}

function verifyResultAccess(req, res, resultId) {
  const result = db.prepare(`
    SELECT er.*, r.patient_id, p.created_by as patient_created_by
    FROM extracted_results er
    JOIN medical_reports r ON er.report_id = r.id
    JOIN patients p ON r.patient_id = p.id
    WHERE er.id = ?
  `).get(resultId);

  if (!result) {
    res.status(404).json({ error: 'Extracted result not found.' });
    return null;
  }

  if (result.patient_created_by && result.patient_created_by !== req.user.id && req.user.role !== 'Admin') {
    res.status(403).json({ error: 'Unauthorized access to this patient medical result.' });
    return null;
  }

  return result;
}

// ----------------------------------------------------
// Health Check
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MedLens API',
    stage: 'Stage 2 - Medical Report Upload & Structured Extraction',
    timestamp: new Date().toISOString(),
    clinical_notice: 'MedLens is an information organization and summarization system. Does not diagnose or prescribe.'
  });
});

// ----------------------------------------------------
// Authentication Routes
// ----------------------------------------------------
app.post('/api/auth/signup', (req, res) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = hashPassword(password);
    const userRole = role || 'Clinical Reviewer';
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run(email.toLowerCase().trim(), passwordHash, full_name.trim(), userRole);

    const user = {
      id: Number(result.lastInsertRowid),
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      role: userRole
    };

    const token = generateToken(user);
    res.status(201).json({ token, user, message: 'Account created successfully.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error while creating account.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    const token = generateToken(userPayload);
    res.json({ token, user: userPayload, message: 'Login successful.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user profile.' });
  }
});

// ----------------------------------------------------
// Dashboard Stats & Recent Data
// ----------------------------------------------------
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  try {
    const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
    const totalReports = db.prepare('SELECT COUNT(*) as count FROM medical_reports').get().count;
    const reportsProcessed = db.prepare("SELECT COUNT(*) as count FROM medical_reports WHERE processing_status = 'extracted' OR status IN ('PROCESSED', 'VERIFIED')").get().count;
    const reportsPending = db.prepare("SELECT COUNT(*) as count FROM medical_reports WHERE verification_status = 'pending' OR status = 'PENDING_VERIFICATION'").get().count;
    
    // Extracted results verification counts
    const verifiedResults = db.prepare("SELECT COUNT(*) as count FROM extracted_results WHERE verified = 1").get().count;
    const pendingResults = db.prepare("SELECT COUNT(*) as count FROM extracted_results WHERE verification_action = 'pending' OR (verified = 0 AND verification_action IS NULL)").get().count;

    // Conflicts requiring review
    const conflictsRequiringReview = db.prepare("SELECT COUNT(*) as count FROM conflicts WHERE status = 'pending'").get().count;

    const recentPatients = db.prepare(`
      SELECT id, patient_identifier, age, sex, status, updated_at, created_at
      FROM patients
      ORDER BY updated_at DESC
      LIMIT 5
    `).all();

    const recentReports = db.prepare(`
      SELECT r.id, r.report_title, r.report_type, r.report_date, r.status, r.processing_status, r.verification_status, r.updated_at,
             p.id as patient_id, p.patient_identifier
      FROM medical_reports r
      JOIN patients p ON r.patient_id = p.id
      ORDER BY r.updated_at DESC
      LIMIT 5
    `).all();

    const recentActivity = db.prepare(`
      SELECT t.*, u.full_name as author_name, p.patient_identifier
      FROM timeline_events t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN patients p ON t.patient_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 8
    `).all();

    res.json({
      metrics: {
        total_patients: totalPatients,
        total_reports: totalReports,
        reports_processed: reportsProcessed,
        reports_pending_verification: reportsPending,
        pending_verification: pendingResults,
        verified_results: verifiedResults,
        conflicts_detected: conflictsRequiringReview,
        conflicts_requiring_review: conflictsRequiringReview
      },
      recent_patients: recentPatients,
      recent_reports: recentReports,
      recent_activity: recentActivity
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Error loading dashboard statistics.' });
  }
});

// ----------------------------------------------------
// Patients Routes
// ----------------------------------------------------
app.get('/api/patients', requireAuth, (req, res) => {
  const { search, status, sex } = req.query;

  try {
    let query = `
      SELECT p.*,
        (SELECT COUNT(*) FROM patient_info_items WHERE patient_id = p.id) as info_count,
        (SELECT COUNT(*) FROM medical_reports WHERE patient_id = p.id) as report_count
      FROM patients p
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` AND p.patient_identifier LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (sex && sex !== 'all') {
      query += ` AND p.sex = ?`;
      params.push(sex);
    }

    query += ` ORDER BY p.updated_at DESC`;

    const patients = db.prepare(query).all(...params);
    res.json({ patients });
  } catch (err) {
    console.error('List patients error:', err);
    res.status(500).json({ error: 'Error retrieving patients.' });
  }
});

app.post('/api/patients', requireAuth, (req, res) => {
  const { patient_identifier, age, date_of_birth, sex, status, initial_notes } = req.body;

  if (!patient_identifier || !sex) {
    return res.status(400).json({ error: 'Patient Identifier and Sex are required.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM patients WHERE patient_identifier = ?').get(patient_identifier.trim());
    if (existing) {
      return res.status(409).json({ error: `Patient Identifier "${patient_identifier.trim()}" is already in use.` });
    }

    const insertStmt = db.prepare(`
      INSERT INTO patients (patient_identifier, age, date_of_birth, sex, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const result = insertStmt.run(
      patient_identifier.trim(),
      age ? parseInt(age, 10) : null,
      date_of_birth || null,
      sex,
      status || 'Active',
      req.user.id
    );

    const patientId = Number(result.lastInsertRowid);

    recordTimelineEvent({
      patient_id: patientId,
      event_type: 'PATIENT_CREATED',
      title: 'Patient Profile Created',
      description: `Registered patient record with ID ${patient_identifier.trim()}.`,
      metadata: { patient_identifier: patient_identifier.trim(), sex, age },
      created_by: req.user.id
    });

    if (initial_notes && initial_notes.trim()) {
      db.prepare(`
        INSERT INTO patient_info_items (patient_id, category, title, description, source, created_by, created_at, updated_at)
        VALUES (?, 'note', 'Intake Note', ?, 'USER_PROVIDED', ?, datetime('now'), datetime('now'))
      `).run(patientId, initial_notes.trim(), req.user.id);

      recordTimelineEvent({
        patient_id: patientId,
        event_type: 'INFO_ADDED',
        title: 'Intake Note Added',
        description: 'Recorded initial user-provided clinical intake notes.',
        metadata: { category: 'note', source: 'USER_PROVIDED' },
        created_by: req.user.id
      });
    }

    const newPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    res.status(201).json({ patient: newPatient, message: 'Patient created successfully.' });
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ error: 'Server error while creating patient.' });
  }
});

app.get('/api/patients/:id', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) {
    return res.status(400).json({ error: 'Invalid patient ID.' });
  }

  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // Check authorization: creator or admin
    if (patient.created_by && patient.created_by !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized access to this patient record.' });
    }

    const rawItems = db.prepare(`
      SELECT * FROM patient_info_items 
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `).all(patientId);

    const itemsByCategory = {
      symptoms: [],
      conditions: [],
      allergies: [],
      medications: [],
      medical_history: [],
      notes: []
    };

    rawItems.forEach(item => {
      let parsedDetails = null;
      if (item.details_json) {
        try { parsedDetails = JSON.parse(item.details_json); } catch (e) { parsedDetails = null; }
      }
      const enrichedItem = { ...item, details: parsedDetails };

      if (item.category === 'symptom') itemsByCategory.symptoms.push(enrichedItem);
      else if (item.category === 'condition') itemsByCategory.conditions.push(enrichedItem);
      else if (item.category === 'allergy') itemsByCategory.allergies.push(enrichedItem);
      else if (item.category === 'medication') itemsByCategory.medications.push(enrichedItem);
      else if (item.category === 'medical_history') itemsByCategory.medical_history.push(enrichedItem);
      else if (item.category === 'note') itemsByCategory.notes.push(enrichedItem);
    });

    // Fetch reports with extracted results count
    const reports = db.prepare(`
      SELECT r.*,
        (SELECT COUNT(*) FROM extracted_results WHERE report_id = r.id) as extracted_count
      FROM medical_reports r
      WHERE r.patient_id = ?
      ORDER BY r.report_date DESC, r.created_at DESC
    `).all(patientId);

    const timeline = db.prepare(`
      SELECT t.*, u.full_name as author_name
      FROM timeline_events t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.patient_id = ?
      ORDER BY t.created_at DESC
    `).all(patientId);

    const aiSummary = db.prepare(`
      SELECT * FROM ai_summaries 
      WHERE patient_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(patientId);

    // Fetch all extracted results for this patient with provenance
    const extractedResults = db.prepare(`
      SELECT r.*, m.report_title, m.report_date, m.lab_name
      FROM extracted_results r
      JOIN medical_reports m ON r.report_id = m.id
      WHERE m.patient_id = ?
      ORDER BY r.test_name ASC, m.report_date DESC
    `).all(patientId);

    // Fetch live detected conflicts
    const conflicts = getPatientConflicts(patientId);

    // Fetch all generated summary versions
    const summaries = getPatientSummaries(patientId);

    res.json({
      patient,
      items: itemsByCategory,
      allItems: rawItems,
      reports,
      timeline,
      aiSummary: aiSummary || null,
      extractedResults,
      conflicts,
      summaries
    });
  } catch (err) {
    console.error('Get patient profile error:', err);
    res.status(500).json({ error: 'Error loading patient profile.' });
  }
});

app.put('/api/patients/:id', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const existing = verifyPatientAccess(req, res, patientId);
  if (!existing) return;

  const { patient_identifier, age, date_of_birth, sex, status } = req.body;

  try {
    if (patient_identifier && patient_identifier.trim() !== existing.patient_identifier) {
      const duplicate = db.prepare('SELECT id FROM patients WHERE patient_identifier = ? AND id != ?').get(patient_identifier.trim(), patientId);
      if (duplicate) {
        return res.status(409).json({ error: `Identifier "${patient_identifier.trim()}" is already assigned to another patient.` });
      }
    }

    db.prepare(`
      UPDATE patients
      SET patient_identifier = ?, age = ?, date_of_birth = ?, sex = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      patient_identifier ? patient_identifier.trim() : existing.patient_identifier,
      age !== undefined && age !== '' ? parseInt(age, 10) : existing.age,
      date_of_birth || existing.date_of_birth,
      sex || existing.sex,
      status || existing.status,
      patientId
    );

    recordTimelineEvent({
      patient_id: patientId,
      event_type: 'INFO_EDITED',
      title: 'Demographics Updated',
      description: `Updated demographic details for patient ${patient_identifier || existing.patient_identifier}.`,
      metadata: { updated_fields: { age, sex, status } },
      created_by: req.user.id
    });

    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    res.json({ patient: updated, message: 'Patient profile updated.' });
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ error: 'Error updating patient details.' });
  }
});

app.delete('/api/patients/:id', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  try {
    db.prepare('DELETE FROM patients WHERE id = ?').run(patientId);
    res.json({ message: `Patient ${patient.patient_identifier} deleted successfully.` });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ error: 'Error deleting patient.' });
  }
});

// ----------------------------------------------------
// Patient Information Items CRUD
// ----------------------------------------------------
app.post('/api/patients/:id/items', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  const { category, title, description, details } = req.body;

  const validCategories = ['symptom', 'condition', 'allergy', 'medication', 'medical_history', 'note'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  try {
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

    const insertStmt = db.prepare(`
      INSERT INTO patient_info_items (patient_id, category, title, description, details_json, source, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'USER_PROVIDED', ?, datetime('now'), datetime('now'))
    `);
    const result = insertStmt.run(
      patientId,
      category,
      title.trim(),
      description ? description.trim() : '',
      detailsStr,
      req.user.id
    );

    db.prepare("UPDATE patients SET updated_at = datetime('now') WHERE id = ?").run(patientId);

    const categoryLabels = {
      symptom: 'Symptom Documented',
      condition: 'Condition Added',
      allergy: 'Allergy Recorded',
      medication: 'Medication Documented',
      medical_history: 'Medical History Added',
      note: 'Clinical Note Added'
    };

    recordTimelineEvent({
      patient_id: patientId,
      event_type: 'INFO_ADDED',
      title: categoryLabels[category] || 'Information Added',
      description: `Added "${title.trim()}" (Source: User Provided).`,
      metadata: { category, title: title.trim(), source: 'USER_PROVIDED' },
      created_by: req.user.id
    });

    const newItem = db.prepare('SELECT * FROM patient_info_items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ item: newItem, message: 'Item added successfully.' });
  } catch (err) {
    console.error('Add info item error:', err);
    res.status(500).json({ error: 'Error adding patient information item.' });
  }
});

app.put('/api/patients/:id/items/:itemId', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  const itemId = parseInt(req.params.itemId, 10);
  const { title, description, details } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  try {
    const item = db.prepare('SELECT * FROM patient_info_items WHERE id = ? AND patient_id = ?').get(itemId, patientId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : item.details_json;

    db.prepare(`
      UPDATE patient_info_items
      SET title = ?, description = ?, details_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title.trim(),
      description !== undefined ? description.trim() : item.description,
      detailsStr,
      itemId
    );

    db.prepare("UPDATE patients SET updated_at = datetime('now') WHERE id = ?").run(patientId);

    recordTimelineEvent({
      patient_id: patientId,
      event_type: 'INFO_EDITED',
      title: 'Information Item Updated',
      description: `Updated ${item.category}: "${title.trim()}".`,
      metadata: { category: item.category, previous_title: item.title, new_title: title.trim() },
      created_by: req.user.id
    });

    const updated = db.prepare('SELECT * FROM patient_info_items WHERE id = ?').get(itemId);
    res.json({ item: updated, message: 'Item updated successfully.' });
  } catch (err) {
    console.error('Edit info item error:', err);
    res.status(500).json({ error: 'Error updating information item.' });
  }
});

app.delete('/api/patients/:id/items/:itemId', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  const itemId = parseInt(req.params.itemId, 10);

  try {
    const item = db.prepare('SELECT * FROM patient_info_items WHERE id = ? AND patient_id = ?').get(itemId, patientId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    db.prepare('DELETE FROM patient_info_items WHERE id = ?').run(itemId);
    db.prepare("UPDATE patients SET updated_at = datetime('now') WHERE id = ?").run(patientId);

    recordTimelineEvent({
      patient_id: patientId,
      event_type: 'INFO_DELETED',
      title: 'Information Item Removed',
      description: `Removed ${item.category}: "${item.title}".`,
      metadata: { category: item.category, title: item.title },
      created_by: req.user.id
    });

    res.json({ message: 'Item deleted successfully.' });
  } catch (err) {
    console.error('Delete info item error:', err);
    res.status(500).json({ error: 'Error deleting information item.' });
  }
});

// ----------------------------------------------------
// Medical Reports Routes & Stage 2 Extraction
// ----------------------------------------------------

// List reports
app.get(['/api/reports', '/reports'], allowBrowserNavOrAuth, (req, res) => {
  const { status, type, patient_id } = req.query;

  try {
    let query = `
      SELECT r.*, p.patient_identifier, p.age, p.sex,
        (SELECT COUNT(*) FROM extracted_results WHERE report_id = r.id) as extracted_count
      FROM medical_reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user && req.user.role !== 'Admin') {
      query += ` AND (p.created_by = ? OR p.created_by IS NULL)`;
      params.push(req.user.id);
    }

    if (status && status !== 'all') {
      query += ` AND (r.status = ? OR r.processing_status = ? OR r.verification_status = ?)`;
      params.push(status, status, status);
    }

    if (type && type !== 'all') {
      query += ` AND r.report_type = ?`;
      params.push(type);
    }

    if (patient_id) {
      query += ` AND r.patient_id = ?`;
      params.push(parseInt(patient_id, 10));
    }

    query += ` ORDER BY r.report_date DESC, r.created_at DESC`;

    const reports = db.prepare(query).all(...params);
    res.json({ reports });
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Error retrieving medical reports.' });
  }
});

// Upload Report (supports multipart file upload & JSON)
app.post(['/api/reports', '/reports'], requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 15MB limit. Please upload a smaller document.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'Invalid upload request.' });
    }

    const { patient_id, report_title, report_type, report_date, lab_name, raw_text, summary, conflict_notes } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required.' });
    }

    const patient = verifyPatientAccess(req, res, parseInt(patient_id, 10));
    if (!patient) return;


    const file = req.file;
    const resolvedTitle = (report_title && report_title.trim()) || (file ? file.originalname : 'Clinical Report');
    const resolvedType = report_type || (file ? 'Lab Test' : 'Clinical Note');
    const resolvedDate = report_date || new Date().toISOString().split('T')[0];
    const resolvedLabName = lab_name ? lab_name.trim() : null;

    try {
      const insertStmt = db.prepare(`
        INSERT INTO medical_reports (
          patient_id, report_title, report_type, report_date, upload_date, file_path, file_name, file_type,
          lab_name, processing_status, verification_status, status, raw_text, summary, conflict_notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, 'uploaded', 'pending', 'PENDING_VERIFICATION', ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const result = insertStmt.run(
        patient.id,
        resolvedTitle,
        resolvedType,
        resolvedDate,
        file ? file.path : null,
        file ? file.originalname : `${resolvedTitle.toLowerCase().replace(/\s+/g, '_')}.txt`,
        file ? file.mimetype : 'text/plain',
        resolvedLabName,
        raw_text || '',
        summary || '',
        conflict_notes || '',
        req.user.id
      );

      const reportId = Number(result.lastInsertRowid);
      db.prepare("UPDATE patients SET updated_at = datetime('now') WHERE id = ?").run(patient.id);

      recordTimelineEvent({
        patient_id: patient.id,
        event_type: 'REPORT_UPLOADED',
        title: 'Medical Report Uploaded',
        description: `Uploaded "${resolvedTitle}" (${resolvedType}). Processing pipeline initiated.`,
        metadata: { report_id: reportId, file_name: file ? file.originalname : null },
        created_by: req.user.id
      });

      // Automatically trigger processing pipeline asynchronously
      processReport(reportId, req.user.id).catch(procErr => {
        console.error('Async report processing error:', procErr);
      });

      const newReport = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportId);
      res.status(201).json({
        report: newReport,
        message: 'Report uploaded successfully. Processing pipeline started.'
      });
    } catch (dbErr) {
      console.error('Upload DB error:', dbErr);
      res.status(500).json({ error: 'Server error saving report record.' });
    }
  });
});

// Compare Reports Endpoint
app.get(['/api/reports/compare', '/api/patients/:id/comparison', '/api/patients/:id/compare'], requireAuth, (req, res) => {
  const patientId = req.params.id ? parseInt(req.params.id, 10) : null;
  const reportA = req.query.report_a || req.query.report_a_id || req.query.baseReportId;
  const reportB = req.query.report_b || req.query.report_b_id || req.query.targetReportId;

  if (!reportA || !reportB) {
    return res.status(400).json({ error: 'report_a and report_b parameters are required for comparison.' });
  }

  try {
    const comparison = compareReports({
      reportAId: parseInt(reportA, 10),
      reportBId: parseInt(reportB, 10),
      patientId,
      userId: req.user.id
    });
    res.json({ ...comparison, comparisons: comparison.comparison });
  } catch (err) {
    console.error('Report comparison error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Report Details
app.get(['/api/reports/:id', '/reports/:id'], allowBrowserNavOrAuth, (req, res, next) => {
  if (req.params.id === 'compare') return next();
  const reportId = parseInt(req.params.id, 10);
  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  try {
    const extractedCount = db.prepare('SELECT COUNT(*) as count FROM extracted_results WHERE report_id = ?').get(reportId).count;
    res.json({
      report: { ...report, extracted_count: extractedCount }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching report details.' });
  }
});

// Get Report Status
app.get(['/api/reports/:id/status', '/reports/:id/status'], requireAuth, (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  res.json({
    id: report.id,
    processing_status: report.processing_status,
    verification_status: report.verification_status,
    error_message: report.error_message,
    updated_at: report.updated_at
  });
});

// Get Extracted Results for Report
app.get(['/api/reports/:id/results', '/reports/:id/results'], requireAuth, (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  try {
    const results = db.prepare(`
      SELECT * FROM extracted_results 
      WHERE report_id = ? 
      ORDER BY id ASC
    `).all(reportId);

    res.json({
      report_id: reportId,
      results,
      count: results.length
    });
  } catch (err) {
    console.error('Fetch extracted results error:', err);
    res.status(500).json({ error: 'Error retrieving extracted results.' });
  }
});

// Trigger or Retry Extraction
app.post(['/api/extraction/:reportId/run', '/extraction/:reportId/run'], requireAuth, async (req, res) => {
  const reportId = parseInt(req.params.reportId, 10);
  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  try {
    const result = await processReport(reportId, req.user.id);
    const updated = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportId);
    res.json({
      success: result.success,
      report: updated,
      message: result.success ? `Extracted ${result.count} test results.` : result.error
    });
  } catch (err) {
    console.error('Run extraction error:', err);
    res.status(500).json({ error: 'Error during report extraction processing: ' + err.message });
  }
});

// Secure Document Streaming Endpoint (Authorization Protected - No Public URLs)
app.get('/api/reports/:id/file', requireAuth, (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  if (!report.file_path || !fs.existsSync(report.file_path)) {
    return res.status(404).json({ error: 'Document file not found on disk.' });
  }

  // Set secure headers
  res.setHeader('Content-Type', report.file_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(report.file_name || 'report')}"`);
  res.sendFile(path.resolve(report.file_path));
});

// Generate Synthetic Demo Report Endpoint (Hackathon Evaluation)
app.post('/api/reports/synthetic-demo', requireAuth, (req, res) => {
  return res.status(400).json({
    error: 'Synthetic demo data generation is disabled. Please upload a real medical report (PDF, PNG, JPG, or JPEG) to begin clinical analysis.'
  });
});

// Verify Report
app.patch('/api/reports/:id/verify', requireAuth, (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  try {
    db.prepare(`
      UPDATE medical_reports
      SET verification_status = 'verified', status = 'VERIFIED', updated_at = datetime('now')
      WHERE id = ?
    `).run(reportId);

    db.prepare(`
      UPDATE extracted_results
      SET verified = 1
      WHERE report_id = ?
    `).run(reportId);

    recordTimelineEvent({
      patient_id: report.patient_id,
      event_type: 'REPORT_VERIFIED',
      title: 'Report Verified by Reviewer',
      description: `Clinical verification completed for "${report.report_title}". All extracted test items verified.`,
      metadata: { report_id: reportId, verified_by: req.user.full_name },
      created_by: req.user.id
    });

    const updated = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportId);
    res.json({ report: updated, message: 'Report and extracted results verified successfully.' });
  } catch (err) {
    console.error('Verify report error:', err);
    res.status(500).json({ error: 'Error verifying report.' });
  }
});

// ----------------------------------------------------
// Stage 3: Human Verification Routes
// ----------------------------------------------------
app.get('/api/verification/queue', requireAuth, (req, res) => {
  try {
    const queue = getPendingVerificationQueue();
    res.json({ queue });
  } catch (err) {
    console.error('Verification queue error:', err);
    res.status(500).json({ error: 'Error loading verification queue.' });
  }
});

app.post('/api/verification/:resultId', requireAuth, (req, res) => {
  const resultId = parseInt(req.params.resultId, 10);
  const resultAccess = verifyResultAccess(req, res, resultId);
  if (!resultAccess) return;

  const { action, corrected_value } = req.body;

  try {
    const updated = recordVerificationAction({
      extractedResultId: resultId,
      action,
      correctedValue: corrected_value,
      reviewerId: req.user.id
    });

    res.json({
      success: true,
      result: updated,
      message: `Result marked as ${action}.`
    });
  } catch (err) {
    console.error('Verification action error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/verification/history/:resultId', requireAuth, (req, res) => {
  const resultId = parseInt(req.params.resultId, 10);
  const resultAccess = verifyResultAccess(req, res, resultId);
  if (!resultAccess) return;

  try {
    const history = getVerificationHistory(resultId);
    res.json({ history });
  } catch (err) {
    console.error('Verification history error:', err);
    res.status(500).json({ error: 'Error loading verification history.' });
  }
});

// ----------------------------------------------------
// Stage 3: Clinical Conflict Detection Routes
// ----------------------------------------------------
app.get('/api/patients/:id/conflicts', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  try {
    detectPatientConflicts(patientId);
    const conflicts = getPatientConflicts(patientId);
    res.json({ conflicts });
  } catch (err) {
    console.error('Fetch conflicts error:', err);
    res.status(500).json({ error: 'Error fetching patient conflicts.' });
  }
});

app.post(['/api/patients/:id/conflicts/detect', '/api/patients/:id/conflicts'], requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  try {
    const newConflicts = detectPatientConflicts(patientId);
    const conflicts = getPatientConflicts(patientId);
    res.json({ conflicts, new_conflicts: newConflicts });
  } catch (err) {
    console.error('Detect conflicts error:', err);
    res.status(500).json({ error: 'Error detecting patient conflicts.' });
  }
});

app.post('/api/conflicts/:id/resolve', requireAuth, (req, res) => {
  const conflictId = parseInt(req.params.id, 10);
  const { resolution_note } = req.body;

  try {
    const conflict = db.prepare(`
      SELECT c.*, p.created_by as patient_created_by
      FROM conflicts c
      JOIN patients p ON c.patient_id = p.id
      WHERE c.id = ?
    `).get(conflictId);

    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found.' });
    }

    if (conflict.patient_created_by && conflict.patient_created_by !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized access to this patient conflict record.' });
    }

    const resolved = resolveConflict({
      conflictId,
      userId: req.user.id,
      resolutionNote: resolution_note
    });
    res.json({ conflict: resolved, message: 'Conflict marked as resolved.' });
  } catch (err) {
    console.error('Resolve conflict error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Stage 3: Patient-Friendly Structured AI Summary Routes
// ----------------------------------------------------
app.post('/api/patients/:id/summary/generate', requireAuth, async (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  try {
    const summary = await generatePatientSummary({
      patientId,
      userId: req.user.id
    });
    res.status(201).json({
      summary,
      message: 'Patient-friendly structured clinical summary generated based on verified records.'
    });
  } catch (err) {
    console.error('Summary generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/patients/:id/summaries', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  try {
    const summaries = getPatientSummaries(patientId);
    res.json({ summaries });
  } catch (err) {
    console.error('Get summaries error:', err);
    res.status(500).json({ error: 'Error retrieving patient summaries.' });
  }
});


app.patch('/api/reports/:id/status', requireAuth, (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  const { status, processing_status, verification_status, conflict_notes } = req.body;

  try {
    db.prepare(`
      UPDATE medical_reports
      SET 
        status = COALESCE(?, status),
        processing_status = COALESCE(?, processing_status),
        verification_status = COALESCE(?, verification_status),
        conflict_notes = COALESCE(?, conflict_notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(status, processing_status, verification_status, conflict_notes, reportId);

    const updated = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportId);
    res.json({ report: updated, message: 'Report status updated.' });
  } catch (err) {
    console.error('Update report status error:', err);
    res.status(500).json({ error: 'Error updating report status.' });
  }
});

// ----------------------------------------------------
// Global & Patient Timeline Route
// ----------------------------------------------------
app.get(['/api/timeline', '/api/patients/:id/timeline'], requireAuth, (req, res) => {
  const patient_id = req.params.id || req.query.patient_id;
  const { event_type, limit } = req.query;

  try {
    let query = `
      SELECT t.*, p.patient_identifier, u.full_name as author_name
      FROM timeline_events t
      JOIN patients p ON t.patient_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (patient_id) {
      query += ` AND t.patient_id = ?`;
      params.push(parseInt(patient_id, 10));
    }

    if (event_type && event_type !== 'all') {
      query += ` AND t.event_type = ?`;
      params.push(event_type);
    }

    const fetchLimit = limit ? parseInt(limit, 10) : 50;
    query += ` ORDER BY t.created_at DESC LIMIT ?`;
    params.push(fetchLimit);

    const events = db.prepare(query).all(...params);
    res.json({ events });
  } catch (err) {
    console.error('List timeline error:', err);
    res.status(500).json({ error: 'Error retrieving timeline events.' });
  }
});

// ----------------------------------------------------
// FEATURE 2 — Needs Review Center Route
// ----------------------------------------------------
app.get('/api/review-center/items', requireAuth, (req, res) => {
  try {
    // 1. Reports Awaiting Verification
    const pendingReports = db.prepare(`
      SELECT r.id, r.patient_id, r.report_title, r.report_type, r.report_date, r.lab_name,
             p.patient_identifier,
             (SELECT COUNT(*) FROM extracted_results er WHERE er.report_id = r.id) as extracted_count
      FROM medical_reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.verification_status = 'pending' AND r.processing_status = 'extracted'
      ORDER BY r.created_at DESC
    `).all();

    // 2. Low-Confidence Extractions (<80% and unverified)
    const lowConfidence = db.prepare(`
      SELECT er.id, er.report_id, er.test_name, er.value, er.unit, er.confidence_score, er.source_snippet, er.status,
             r.report_title, r.report_date, p.patient_identifier, p.id as patient_id
      FROM extracted_results er
      JOIN medical_reports r ON er.report_id = r.id
      JOIN patients p ON r.patient_id = p.id
      WHERE er.confidence_score < 80 AND er.verified = 0
      ORDER BY er.confidence_score ASC
    `).all();

    // 3. Uncertain Results (status unknown or marked uncertain)
    const uncertainResults = db.prepare(`
      SELECT er.id, er.report_id, er.test_name, er.value, er.unit, er.reference_range, er.status, er.verification_action,
             r.report_title, r.report_date, p.patient_identifier, p.id as patient_id
      FROM extracted_results er
      JOIN medical_reports r ON er.report_id = r.id
      JOIN patients p ON r.patient_id = p.id
      WHERE er.status = 'unknown' OR er.verification_action = 'marked_uncertain'
      ORDER BY er.created_at DESC
    `).all();

    // 4. Open Conflicts
    const openConflicts = db.prepare(`
      SELECT c.id, c.patient_id, c.type, c.title, c.description, c.created_at, p.patient_identifier
      FROM conflicts c
      JOIN patients p ON c.patient_id = p.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at DESC
    `).all();

    // 5. Reports With Processing Issues
    const processingIssues = db.prepare(`
      SELECT r.id, r.patient_id, r.report_title, r.report_type, r.error_message, r.created_at, p.patient_identifier
      FROM medical_reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.processing_status = 'failed'
      ORDER BY r.created_at DESC
    `).all();

    const totalItems = pendingReports.length + lowConfidence.length + uncertainResults.length + openConflicts.length + processingIssues.length;

    res.json({
      total_items: totalItems,
      categories: {
        pending_reports: {
          title: 'Reports Awaiting Verification',
          count: pendingReports.length,
          items: pendingReports
        },
        low_confidence: {
          title: 'Low-Confidence Extractions (<80%)',
          count: lowConfidence.length,
          items: lowConfidence
        },
        uncertain_results: {
          title: 'Uncertain Results',
          count: uncertainResults.length,
          items: uncertainResults
        },
        open_conflicts: {
          title: 'Open Conflicts',
          count: openConflicts.length,
          items: openConflicts
        },
        processing_issues: {
          title: 'Reports With Processing Issues',
          count: processingIssues.length,
          items: processingIssues
        }
      }
    });
  } catch (err) {
    console.error('Review Center error:', err);
    res.status(500).json({ error: 'Failed to retrieve review center items.' });
  }
});

// ----------------------------------------------------
// FEATURE 4 — Patient Trend Visualization Route
// ----------------------------------------------------
app.get('/api/patients/:id/trends', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (!patientId) return res.status(400).json({ error: 'Valid patient ID required' });

  const patient = verifyPatientAccess(req, res, patientId);
  if (!patient) return;

  try {
    // Get all results across reports for this patient
    const results = db.prepare(`
      SELECT er.id, er.test_name, er.value, er.unit, er.reference_range, er.status, er.confidence_score, er.verified,
             r.id as report_id, r.report_title, r.report_date, r.lab_name
      FROM extracted_results er
      JOIN medical_reports r ON er.report_id = r.id
      WHERE r.patient_id = ?
      ORDER BY r.report_date ASC, er.created_at ASC
    `).all(patientId);

    // Group by normalized test name
    const testMap = new Map();

    for (const row of results) {
      const normName = row.test_name.trim();
      const lowerKey = normName.toLowerCase();

      if (!testMap.has(lowerKey)) {
        testMap.set(lowerKey, {
          test_name: normName,
          unit: row.unit || '',
          data_points: []
        });
      }

      const entry = testMap.get(lowerKey);
      if (!entry.unit && row.unit) entry.unit = row.unit;

      // Extract numeric value if parsable
      const numMatch = row.value.match(/[-+]?[0-9]*\.?[0-9]+/);
      const numVal = numMatch ? parseFloat(numMatch[0]) : null;

      entry.data_points.push({
        result_id: row.id,
        report_id: row.report_id,
        report_title: row.report_title,
        date: row.report_date,
        raw_value: row.value,
        numeric_value: numVal,
        unit: row.unit || entry.unit || '',
        reference_range: row.reference_range,
        status: row.status,
        verified: Boolean(row.verified),
        lab_name: row.lab_name
      });
    }

    const tests = Array.from(testMap.values());
    res.json({ patient_id: patientId, tests, trends: tests, total_tests: tests.length });
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ error: 'Failed to retrieve patient trends.' });
  }
});

// ----------------------------------------------------
// FEATURE 6 — Document Quality Check Route
// ----------------------------------------------------
app.get('/api/reports/:id/quality', requireAuth, (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (!reportId) return res.status(400).json({ error: 'Valid report ID required' });

  const report = verifyReportAccess(req, res, reportId);
  if (!report) return;

  try {
    const results = db.prepare('SELECT * FROM extracted_results WHERE report_id = ?').all(reportId);

    let actualFileSize = report.file_size || 0;
    if (!actualFileSize && report.file_path && fs.existsSync(report.file_path)) {
      try {
        actualFileSize = fs.statSync(report.file_path).size;
      } catch (e) {}
    }

    const hasText = Boolean(report.raw_text && report.raw_text.trim().length > 0);
    const rangesDetectedCount = results.filter(r => r.reference_range !== null).length;
    const lowConfidenceCount = results.filter(r => r.confidence_score < 75).length;

    const warnings = [];
    if (results.length === 0 && report.processing_status === 'failed') {
      warnings.push('Document processing encountered an error during extraction.');
    }
    if (rangesDetectedCount === 0 && results.length > 0) {
      warnings.push('Reference ranges were not detected in source text for extracted tests.');
    }
    if (lowConfidenceCount > 0) {
      warnings.push(`${lowConfidenceCount} result(s) extracted with low OCR/text confidence (<75%). Review recommended.`);
    }

    const qualityData = {
      report_id: reportId,
      file_name: report.file_name || report.report_title,
      file_type: report.file_type || 'application/pdf',
      file_size_bytes: actualFileSize,
      file_size_formatted: actualFileSize > 0 ? `${(actualFileSize / 1024).toFixed(1)} KB` : 'Not available',
      text_extraction_status: hasText ? 'Successful' : (report.processing_status === 'failed' ? 'Failed' : 'Pending'),
      ocr_required: Boolean(report.ocr_used),
      report_date_detected: Boolean(report.report_date),
      report_date: report.report_date || 'Not available',
      laboratory_detected: Boolean(report.lab_name),
      laboratory: report.lab_name || 'Not available',
      patient_identifier_detected: Boolean(report.patient_identifier),
      patient_identifier: report.patient_identifier || 'Not available',
      total_tests_extracted: results.length,
      reference_ranges_detected: rangesDetectedCount,
      warnings
    };

    res.json(qualityData);
  } catch (err) {
    console.error('Quality check error:', err);
    res.status(500).json({ error: 'Failed to retrieve document quality check.' });
  }
});

// ----------------------------------------------------
// FEATURE 1 & 7 — Evidence / Source Viewer & Provenance Flow
// ----------------------------------------------------
app.get('/api/extracted-results/:id/evidence', requireAuth, (req, res) => {
  const resultId = parseInt(req.params.id, 10);
  if (!resultId) return res.status(400).json({ error: 'Valid result ID required' });

  const resultAccess = verifyResultAccess(req, res, resultId);
  if (!resultAccess) return;

  try {
    const item = db.prepare(`
      SELECT er.*, r.report_title, r.report_type, r.report_date, r.lab_name, r.file_name, r.file_type, r.file_size, r.ocr_used,
             p.id as patient_id, p.patient_identifier,
             u.full_name as reviewer_name
      FROM extracted_results er
      JOIN medical_reports r ON er.report_id = r.id
      JOIN patients p ON r.patient_id = p.id
      LEFT JOIN users u ON er.reviewed_by = u.id
      WHERE er.id = ?
    `).get(resultId);

    if (!item) return res.status(404).json({ error: 'Extracted result not found' });


    const pipelineSteps = [
      {
        step: 1,
        title: 'Source Document Uploaded',
        status: 'completed',
        detail: `Report "${item.report_title}" (${item.file_name || 'file'}) stored securely.`
      },
      {
        step: 2,
        title: item.ocr_used ? 'OCR Image Processing' : 'Text Extraction',
        status: 'completed',
        detail: item.ocr_used ? 'Processed via optical character recognition.' : 'Digital document text extracted verbatim.'
      },
      {
        step: 3,
        title: 'Structured Extraction',
        status: 'completed',
        detail: `Structured test "${item.test_name}" identified with ${item.confidence_score}% extraction confidence.`
      },
      {
        step: 4,
        title: 'Reference Range Sourced',
        status: item.reference_range ? 'completed' : 'omitted',
        detail: item.reference_range ? `Document reference interval: ${item.reference_range}` : 'Report did not specify a reference range (preserved as null).'
      },
      {
        step: 5,
        title: 'Deterministic Evaluation',
        status: 'completed',
        detail: `Application code computed status: ${item.status.toUpperCase()} (deterministic logic, no AI clinical inferences).`
      },
      {
        step: 6,
        title: 'Human Verification',
        status: item.verified ? 'completed' : 'pending',
        detail: item.verified 
          ? `Verified by ${item.reviewer_name || 'Clinical Reviewer'} (${item.verification_action || 'accepted'}).` 
          : 'Awaiting clinical reviewer verification.'
      }
    ];

    res.json({
      result: {
        id: item.id,
        test_name: item.test_name,
        value: item.value,
        verified_value: item.verified_value,
        unit: item.unit,
        reference_range: item.reference_range,
        status: item.status,
        confidence_score: item.confidence_score,
        verified: Boolean(item.verified),
        verification_action: item.verification_action,
        provenance: item.provenance || 'AI Extracted',
        source_snippet: item.source_snippet || 'Source location unavailable.',
        page_number: item.page_number || 1
      },
      report: {
        id: item.report_id,
        title: item.report_title,
        date: item.report_date,
        laboratory: item.lab_name || 'Not specified',
        file_name: item.file_name,
        file_type: item.file_type
      },
      patient: {
        id: item.patient_id,
        patient_identifier: item.patient_identifier
      },
      pipeline: pipelineSteps
    });
  } catch (err) {
    console.error('Evidence viewer error:', err);
    res.status(500).json({ error: 'Failed to retrieve evidence record.' });
  }
});

// ----------------------------------------------------
// FEATURE 10 — Safe Result Explanation Route
// ----------------------------------------------------
app.get('/api/extracted-results/:id/explain', requireAuth, (req, res) => {
  const resultId = parseInt(req.params.id, 10);
  if (!resultId) return res.status(400).json({ error: 'Valid result ID required' });

  try {
    const item = db.prepare(`
      SELECT er.*, r.report_title, r.report_date, r.lab_name
      FROM extracted_results er
      JOIN medical_reports r ON er.report_id = r.id
      WHERE er.id = ?
    `).get(resultId);

    if (!item) return res.status(404).json({ error: 'Extracted result not found' });

    let explanationText = '';
    const valDisplay = item.verified_value ? `${item.verified_value} (corrected from ${item.value})` : item.value;
    const unitDisplay = item.unit ? ` ${item.unit}` : '';

    if (!item.reference_range) {
      explanationText = `The uploaded report from ${item.lab_name || 'the testing facility'} does not specify a reference range for ${item.test_name}. MedLens does not apply external population reference intervals or hypothesize abnormal findings without source documentation.`;
    } else {
      const s = item.status.toLowerCase();
      if (s === 'normal') {
        explanationText = `The reported measurement of ${valDisplay}${unitDisplay} falls strictly within the report's documented reference interval of ${item.reference_range}.`;
      } else if (s === 'high') {
        explanationText = `The reported measurement of ${valDisplay}${unitDisplay} is quantitatively above the upper limit of the report's documented reference interval (${item.reference_range}).`;
      } else if (s === 'low') {
        explanationText = `The reported measurement of ${valDisplay}${unitDisplay} is quantitatively below the lower limit of the report's documented reference interval (${item.reference_range}).`;
      } else {
        explanationText = `The reported measurement of ${valDisplay}${unitDisplay} was compared to the reported interval (${item.reference_range}) but could not be definitively classified numerically.`;
      }
    }

    res.json({
      test_name: item.test_name,
      reported_value: valDisplay,
      unit: item.unit,
      reference_range: item.reference_range || 'Not provided by report',
      system_status: item.status.toUpperCase(),
      source_snippet: item.source_snippet,
      source_report: item.report_title,
      explanation: explanationText,
      disclaimer: 'This explanation is strictly mathematical and descriptive based on the uploaded document. It is not a medical diagnosis or treatment recommendation.'
    });
  } catch (err) {
    console.error('Explain result error:', err);
    res.status(500).json({ error: 'Failed to generate result explanation.' });
  }
});

// ----------------------------------------------------
// FEATURE 8 — Professional Patient Record Export Route
// ----------------------------------------------------
app.get('/api/patients/:id/export', requireAuth, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (!patientId) return res.status(400).json({ error: 'Valid patient ID required' });

  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const infoItems = db.prepare('SELECT * FROM patient_info_items WHERE patient_id = ? ORDER BY category, title').all(patientId);
    const reports = db.prepare('SELECT * FROM medical_reports WHERE patient_id = ? ORDER BY report_date DESC').all(patientId);
    const results = db.prepare(`
      SELECT er.*, r.report_title, r.report_date, r.lab_name
      FROM extracted_results er
      JOIN medical_reports r ON er.report_id = r.id
      WHERE r.patient_id = ?
      ORDER BY r.report_date DESC, er.test_name ASC
    `).all(patientId);
    const conflicts = db.prepare('SELECT * FROM conflicts WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
    const timeline = db.prepare('SELECT * FROM timeline_events WHERE patient_id = ? ORDER BY created_at DESC LIMIT 20').all(patientId);
    const summaries = db.prepare('SELECT * FROM ai_summaries WHERE patient_id = ? ORDER BY generated_at DESC LIMIT 1').all(patientId);

    res.json({
      patient,
      info_items: infoItems,
      reports,
      results,
      conflicts,
      timeline,
      latest_summary: summaries[0] || null,
      generated_at: new Date().toISOString(),
      disclaimer: 'This document organizes available medical information for review. It is not a medical diagnosis or treatment recommendation.'
    });
  } catch (err) {
    console.error('Patient export error:', err);
    res.status(500).json({ error: 'Failed to compile patient export.' });
  }
});

// ----------------------------------------------------
// FEATURE 9 — Smart Search & Filtering Route
// ----------------------------------------------------
app.get('/api/search', requireAuth, (req, res) => {
  const query = (req.query.q || '').trim();
  const patient_id = req.query.patient_id;
  const status = req.query.status;
  const date_from = req.query.date_from;
  const date_to = req.query.date_to;
  const lab = req.query.lab;

  try {
    const searchTerm = `%${query}%`;

    // 1. Search Patients
    let patients = [];
    if (!patient_id) {
      patients = db.prepare(`
        SELECT id, patient_identifier, age, sex, status, created_at
        FROM patients
        WHERE patient_identifier LIKE ?
        ORDER BY patient_identifier ASC LIMIT 10
      `).all(searchTerm);
    }

    // 2. Search Reports
    let reportSql = `
      SELECT r.id, r.patient_id, r.report_title, r.report_type, r.report_date, r.lab_name, r.verification_status,
             p.patient_identifier
      FROM medical_reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE (r.report_title LIKE ? OR r.lab_name LIKE ? OR r.file_name LIKE ? OR p.patient_identifier LIKE ?)
    `;
    const reportParams = [searchTerm, searchTerm, searchTerm, searchTerm];
    if (patient_id) {
      reportSql += ' AND r.patient_id = ?';
      reportParams.push(parseInt(patient_id, 10));
    }
    if (status && status !== 'all') {
      reportSql += ' AND r.verification_status = ?';
      reportParams.push(status);
    }
    if (date_from) {
      reportSql += ' AND r.report_date >= ?';
      reportParams.push(date_from);
    }
    if (date_to) {
      reportSql += ' AND r.report_date <= ?';
      reportParams.push(date_to);
    }
    if (lab) {
      reportSql += ' AND r.lab_name LIKE ?';
      reportParams.push(`%${lab}%`);
    }
    reportSql += ' ORDER BY r.report_date DESC LIMIT 15';
    const reports = db.prepare(reportSql).all(...reportParams);

    // 3. Search Extracted Lab Tests
    let testSql = `
      SELECT er.id, er.report_id, er.test_name, er.value, er.unit, er.reference_range, er.status, er.confidence_score, er.verified,
             r.report_title, r.report_date, r.lab_name, p.patient_identifier, p.id as patient_id
      FROM extracted_results er
      JOIN medical_reports r ON er.report_id = r.id
      JOIN patients p ON r.patient_id = p.id
      WHERE (er.test_name LIKE ? OR er.value LIKE ?)
    `;
    const testParams = [searchTerm, searchTerm];
    if (patient_id) {
      testSql += ' AND p.id = ?';
      testParams.push(parseInt(patient_id, 10));
    }
    if (status && status !== 'all') {
      testSql += ' AND er.status = ?';
      testParams.push(status);
    }
    testSql += ' ORDER BY r.report_date DESC, er.test_name ASC LIMIT 20';
    const tests = db.prepare(testSql).all(...testParams);

    res.json({
      query,
      results: {
        patients,
        reports,
        tests
      },
      total_matches: patients.length + reports.length + tests.length
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search operation failed.' });
  }
});

// ----------------------------------------------------
// Reset / Seed Demo Data (Disabled: MedLens operates only on real data)
// ----------------------------------------------------
app.post('/api/demo/seed', requireAuth, (req, res) => {
  res.status(400).json({
    error: 'Synthetic demo data generation has been removed. MedLens operates exclusively on real uploaded medical reports and database data.'
  });
});

// ----------------------------------------------------
// Serve Built Frontend Assets
// ----------------------------------------------------
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/extraction')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ----------------------------------------------------
// Start Server
// ----------------------------------------------------
app.listen(PORT, () => {
  console.log(`[MedLens Server] Running on http://localhost:${PORT}`);
  console.log(`[MedLens Server] Healthcare Information Organization & Extraction Pipeline Active`);
});
