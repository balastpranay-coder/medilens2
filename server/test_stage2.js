/**
 * MedLens Stage 2 Automated Test Suite
 * 
 * Verifies all 8 acceptance tests required for STAGE 2: Medical Report Upload + Structured Extraction:
 * Test 1: Text-based PDF upload -> record created, processing pipeline extracts structured data.
 * Test 2: Image/scanned upload -> OCR attempted, if unreadable sets clear failed state, no fake data.
 * Test 3: Hemoglobin: 13.2 g/dL (Range: 12-16 g/dL) -> Value=13.2, Unit=g/dL, Range=12-16 g/dL, Status=Normal.
 * Test 4: Value above provided range (Glucose: 118 mg/dL [70-100]) -> Status=High.
 * Test 5: Value with no reference range (eGFR: >60 mL/min) -> Reference Range=NULL, Status=Unknown.
 * Test 6: Verify EVERY extracted result contains a verbatim source snippet.
 * Test 7: Verify unauthorized users receive 403 when accessing another user's private report.
 * Test 8: Data persistence verification (query database to ensure records persist on disk).
 */

const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

const BASE_URL = 'http://localhost:5000';

function createMinimalPdfBuffer(textLines) {
  let streamLines = ['BT', '/F1 12 Tf', '72 712 Td'];
  textLines.forEach((line, idx) => {
    if (idx > 0) {
      streamLines.push('0 -20 Td');
    }
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamLines.push(`(${escaped}) Tj`);
  });
  streamLines.push('ET');
  const streamContent = streamLines.join('\n');

  const pdf = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    'endobj',
    '4 0 obj',
    '<< /Length ' + streamContent.length + ' >>',
    'stream',
    streamContent,
    'endstream',
    'endobj',
    '5 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    'endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000234 00000 n ',
    '0000000406 00000 n ',
    'trailer',
    '<< /Size 6 /Root 1 0 R >>',
    'startxref',
    '485',
    '%%EOF'
  ].join('\n');

  return Buffer.from(pdf);
}

// 1x1 transparent PNG buffer for testing image uploads
function createMinimalPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
}

async function runStage2Tests() {
  console.log('====================================================');
  console.log('MedLens Stage 2: Medical Report Upload & Extraction');
  console.log('Automated Verification Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}${detail ? ' - ' + detail : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  // Helper: Login as doctor
  async function login(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }

  const authDoctor = await login('demo.clinician@medlens.org', 'MedLensDemo2025!');
  const doctorToken = authDoctor.token;
  assert(Boolean(doctorToken), 'Setup: Doctor authenticated', `User ID: ${authDoctor.user?.id}`);

  // Create a dedicated patient for this test
  const testPatientRes = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`
    },
    body: JSON.stringify({
      patient_identifier: `STAGE2-TEST-${Date.now().toString().slice(-4)}`,
      age: 52,
      sex: 'Male',
      allergies: ['Penicillin']
    })
  });
  const testPatientData = await testPatientRes.json();
  const patientId = testPatientData.patient.id;
  assert(Boolean(patientId), 'Setup: Test Patient Created', `Patient ID: ${patientId}`);

  // ----------------------------------------------------
  // TEST 1: Upload a text-based PDF
  // ----------------------------------------------------
  console.log('\n--- Running Test 1: Upload text-based PDF ---');
  const pdfLines = [
    'Hemoglobin: 13.2 g/dL (Reference Range: 12-16 g/dL)',
    'Glucose: 118 mg/dL (Reference Range: 70-100 mg/dL)',
    'eGFR: >60 mL/min'
  ];
  const pdfBuffer = createMinimalPdfBuffer(pdfLines);

  const formData1 = new FormData();
  formData1.append('patient_id', String(patientId));
  formData1.append('report_title', 'CBC and Metabolic Lab Report');
  formData1.append('report_type', 'Lab Test');
  formData1.append('report_date', '2025-02-20');
  formData1.append('lab_name', 'BioRef Central Lab');
  formData1.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'cbc_metabolic.pdf');

  const uploadRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${doctorToken}`
    },
    body: formData1
  });
  const uploadData = await uploadRes.json();
  assert(uploadRes.status === 201, 'Test 1.1: File uploaded and HTTP 201 created', `Report ID: ${uploadData.report?.id}`);
  assert(['uploaded', 'processing', 'extracted'].includes(uploadData.report?.processing_status), 'Test 1.2: Initial processing status valid', `Status: ${uploadData.report?.processing_status}`);

  const reportId = uploadData.report.id;

  // Poll status until extracted (pipeline is fast for local PDF)
  let statusData;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 600));
    const sRes = await fetch(`${BASE_URL}/api/reports/${reportId}/status`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    statusData = await sRes.json();
    if (statusData.processing_status === 'extracted' || statusData.processing_status === 'failed') break;
  }
  assert(statusData.processing_status === 'extracted', 'Test 1.3: Report processing transitioned to extracted', `Status: ${statusData.processing_status}`);

  // Fetch results
  const resultsRes = await fetch(`${BASE_URL}/api/reports/${reportId}/results`, {
    headers: { 'Authorization': `Bearer ${doctorToken}` }
  });
  const resultsData = await resultsRes.json();
  assert(Array.isArray(resultsData.results) && resultsData.results.length === 3, 'Test 1.4: Exactly 3 test results extracted', `Extracted count: ${resultsData.results?.length}`);

  // ----------------------------------------------------
  // TEST 2: Upload an image/scanned report
  // ----------------------------------------------------
  console.log('\n--- Running Test 2: Upload image / scanned report ---');
  const pngBuffer = createMinimalPngBuffer();
  const formData2 = new FormData();
  formData2.append('patient_id', String(patientId));
  formData2.append('report_title', 'Scanned Document');
  formData2.append('report_type', 'Radiology');
  formData2.append('report_date', '2025-02-21');
  formData2.append('file', new Blob([pngBuffer], { type: 'image/png' }), 'scan.png');

  const imgUploadRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${doctorToken}` },
    body: formData2
  });
  const imgUploadData = await imgUploadRes.json();
  const imgReportId = imgUploadData.report.id;
  assert(Boolean(imgReportId), 'Test 2.1: Image uploaded and record created', `Image Report ID: ${imgReportId}`);

  // Wait for processing
  let imgStatusData;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 600));
    const sRes = await fetch(`${BASE_URL}/api/reports/${imgReportId}/status`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    imgStatusData = await sRes.json();
    if (imgStatusData.processing_status === 'extracted' || imgStatusData.processing_status === 'failed') break;
  }
  // The minimal 1x1 image contains no text, so it MUST fail cleanly with clear error message, NOT pretend success
  assert(imgStatusData.processing_status === 'failed', 'Test 2.2: Image with no readable text fails cleanly (no fake results)', `Status: ${imgStatusData.processing_status}`);
  assert(Boolean(imgStatusData.error_message), 'Test 2.3: User-friendly error message provided on OCR failure', `Error: "${imgStatusData.error_message}"`);

  // ----------------------------------------------------
  // TEST 3: Report contains Hemoglobin 13.2 g/dL, Range 12-16 g/dL -> Normal
  // ----------------------------------------------------
  console.log('\n--- Running Test 3: Value within reference range (Hemoglobin) ---');
  const hemoResult = resultsData.results.find(r => r.test_name.toLowerCase().includes('hemoglobin'));
  assert(Boolean(hemoResult), 'Test 3.1: Hemoglobin result exists');
  assert(hemoResult.value === '13.2', 'Test 3.2: Value = 13.2', `Actual: ${hemoResult.value}`);
  assert(hemoResult.unit === 'g/dL', 'Test 3.3: Unit = g/dL', `Actual: ${hemoResult.unit}`);
  assert(hemoResult.reference_range === '12-16 g/dL', 'Test 3.4: Reference Range = 12-16 g/dL', `Actual: ${hemoResult.reference_range}`);
  assert(hemoResult.status === 'normal', 'Test 3.5: Status = Normal', `Actual: ${hemoResult.status}`);

  // ----------------------------------------------------
  // TEST 4: Report contains a value above its provided range (Glucose 118 mg/dL, 70-100) -> High
  // ----------------------------------------------------
  console.log('\n--- Running Test 4: Value above reference range (Glucose) ---');
  const glucoseResult = resultsData.results.find(r => r.test_name.toLowerCase().includes('glucose'));
  assert(Boolean(glucoseResult), 'Test 4.1: Glucose result exists');
  assert(glucoseResult.value === '118', 'Test 4.2: Value = 118', `Actual: ${glucoseResult.value}`);
  assert(glucoseResult.status === 'high', 'Test 4.3: Status = High', `Actual: ${glucoseResult.status}`);

  // ----------------------------------------------------
  // TEST 5: Report contains no reference range (eGFR) -> Range = NULL, Status = Unknown
  // ----------------------------------------------------
  console.log('\n--- Running Test 5: Missing reference range (eGFR) ---');
  const egfrResult = resultsData.results.find(r => r.test_name.toLowerCase().includes('egfr'));
  assert(Boolean(egfrResult), 'Test 5.1: eGFR result exists');
  assert(egfrResult.reference_range === null, 'Test 5.2: Reference Range = NULL', `Actual: ${egfrResult.reference_range}`);
  assert(egfrResult.status === 'unknown', 'Test 5.3: Status = Unknown', `Actual: ${egfrResult.status}`);

  // ----------------------------------------------------
  // TEST 6: Every extracted result contains a source snippet
  // ----------------------------------------------------
  console.log('\n--- Running Test 6: Verifying source snippets for all results ---');
  const allHaveSnippets = resultsData.results.every(r => r.source_snippet && r.source_snippet.trim().length > 0);
  assert(allHaveSnippets, 'Test 6.1: Every extracted result contains a source snippet');
  resultsData.results.forEach((r, idx) => {
    assert(Boolean(r.source_snippet), `Test 6.2.${idx+1}: Snippet for "${r.test_name}"`, `Snippet: "${r.source_snippet}"`);
  });

  // Also verify extraction confidence score is between 0 and 100
  const validConfidence = resultsData.results.every(r => r.confidence_score >= 0 && r.confidence_score <= 100);
  assert(validConfidence, 'Test 6.3: All confidence scores are valid (0-100)', `Confidence: ${resultsData.results.map(r => r.confidence_score + '%').join(', ')}`);

  // ----------------------------------------------------
  // TEST 7: Unauthorized users cannot access another user's private report
  // ----------------------------------------------------
  console.log('\n--- Running Test 7: Authorization and Security ---');
  // Register or login a second non-admin user
  const userBEmail = `resident.${Date.now()}@medlens.org`;
  const registerBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userBEmail,
      password: 'UserBPassword123!',
      full_name: 'Dr. Resident B',
      role: 'Reviewer'
    })
  });
  const userBData = await registerBRes.json();
  const userBToken = userBData.token;

  // Attempt 1: User B tries to view report metadata
  const authCheck1 = await fetch(`${BASE_URL}/api/reports/${reportId}`, {
    headers: { 'Authorization': `Bearer ${userBToken}` }
  });
  assert(authCheck1.status === 403, 'Test 7.1: Unauthorized GET /api/reports/:id blocked with 403', `Status: ${authCheck1.status}`);

  // Attempt 2: User B tries to download or stream private file
  const authCheck2 = await fetch(`${BASE_URL}/api/reports/${reportId}/file`, {
    headers: { 'Authorization': `Bearer ${userBToken}` }
  });
  assert(authCheck2.status === 403, 'Test 7.2: Unauthorized GET /api/reports/:id/file blocked with 403', `Status: ${authCheck2.status}`);

  // Attempt 3: User B tries to get extracted results
  const authCheck3 = await fetch(`${BASE_URL}/api/reports/${reportId}/results`, {
    headers: { 'Authorization': `Bearer ${userBToken}` }
  });
  assert(authCheck3.status === 403, 'Test 7.3: Unauthorized GET /api/reports/:id/results blocked with 403', `Status: ${authCheck3.status}`);

  // ----------------------------------------------------
  // TEST 8: Data persistence verification across DB queries
  // ----------------------------------------------------
  console.log('\n--- Running Test 8: Data Persistence Verification ---');
  const persistedReport = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportId);
  assert(Boolean(persistedReport), 'Test 8.1: Report record persisted in SQLite database', `DB ID: ${persistedReport?.id}`);
  assert(persistedReport.processing_status === 'extracted', 'Test 8.2: processing_status persisted as extracted', `DB Status: ${persistedReport?.processing_status}`);

  const persistedResults = db.prepare('SELECT * FROM extracted_results WHERE report_id = ?').all(reportId);
  assert(persistedResults.length === 3, 'Test 8.3: All 3 extracted results persisted in SQLite database', `Count: ${persistedResults.length}`);
  assert(persistedResults[0].source_snippet.length > 0, 'Test 8.4: Source snippets persisted on disk');

  // Verify Synthetic Demo Report Generator
  console.log('\n--- Running Bonus Test: Synthetic Demo Report Generator ---');
  const demoReportRes = await fetch(`${BASE_URL}/api/reports/synthetic-demo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`
    },
    body: JSON.stringify({ patient_id: patientId })
  });
  const demoReportData = await demoReportRes.json();
  assert(demoReportRes.status === 201, 'Bonus: Synthetic demo report created', `Report ID: ${demoReportData.report?.id}`);
  assert(demoReportData.disclaimer === 'DEMO DATA — NOT REAL PATIENT INFORMATION', 'Bonus: Disclaimer clearly indicates synthetic demo');

  console.log('\n====================================================');
  console.log(`STAGE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStage2Tests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
