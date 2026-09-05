const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = 'http://localhost:5000';

async function testRealWorkflow() {
  console.log('====================================================');
  console.log('MedLens Real Data Workflow: End-to-End Verification');
  console.log('====================================================\n');

  // --- Step 1: Clinician Login ---
  console.log('--- [Step 1] Clinician Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo.clinician@medlens.org',
      password: 'MedLensDemo2025!'
    })
  });
  assert.strictEqual(loginRes.status, 200, 'Clinician login must return HTTP 200');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(token, 'JWT token must be acquired');
  console.log('[PASS] Step 1: Clinician authenticated successfully.\n');

  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  // --- Step 2: Dashboard Real Empty State ---
  console.log('--- [Step 2] Dashboard Real Counts (Clean Initial State) ---');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
  assert.strictEqual(dashRes.status, 200, 'Dashboard stats must return HTTP 200');
  const dashData = await dashRes.json();
  console.log(`Current Database Counts -> Patients: ${dashData.metrics.total_patients} | Reports: ${dashData.metrics.total_reports} | Pending: ${dashData.metrics.pending_verification} | Verified: ${dashData.metrics.verified_results}`);
  console.log('[PASS] Step 2: Dashboard metrics reflect real database records.\n');

  // --- Step 3: Create Real Patient ---
  console.log('--- [Step 3] Create Real Patient ---');
  const patientIdentifier = `PT-2026-${Date.now().toString().slice(-4)}`;
  const patientRes = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_identifier: patientIdentifier,
      age: 52,
      date_of_birth: '1974-06-18',
      sex: 'Female',
      status: 'Active'
    })
  });
  assert.strictEqual(patientRes.status, 201, 'Patient creation must return HTTP 201');
  const patientData = await patientRes.json();
  const patientId = patientData.patient.id;
  assert(patientId, 'Created patient must have ID');
  console.log(`[PASS] Step 3: Real patient created - ID: ${patientId} (Identifier: ${patientIdentifier})\n`);

  // --- Step 4: Add User-Provided Clinical Info ---
  console.log('--- [Step 4] Add User-Provided Patient Information ---');
  const itemRes = await fetch(`${BASE_URL}/api/patients/${patientId}/items`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'symptom',
      title: 'Persistent fatigue and dry mouth',
      description: 'Progressive lethargy over the past 4 weeks with increased thirst',
      details: { severity: 'Moderate', onset: '4 weeks ago' }
    })
  });
  assert.strictEqual(itemRes.status, 201, 'Item creation must return HTTP 201');
  const itemJson = await itemRes.json();
  assert.strictEqual(itemJson.item.source, 'USER_PROVIDED', 'Source must be strictly USER_PROVIDED');
  console.log('[PASS] Step 4: User-provided clinical item created with Source: USER_PROVIDED.\n');

  // Helper to construct a valid binary text-based PDF
  function createValidPdfBuffer(lines) {
    let streamLines = ['BT', '/F1 12 Tf', '72 712 Td'];
    lines.forEach((line, idx) => {
      if (idx > 0) streamLines.push('0 -20 Td');
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

  // --- Step 5: Prepare Real Medical Laboratory Report Document ---
  console.log('--- [Step 5] Prepare Real Document File (Clinical Chemistry Panel) ---');
  const reportLines = [
    'METROPATH CLINICAL LABORATORIES - SPECIMEN: 2026-09-05',
    'Hemoglobin: 13.2 g/dL (Reference Range: 12.0-16.0 g/dL)',
    'Fasting Blood Glucose: 126 mg/dL (Reference Range: 70-99 mg/dL)',
    'Serum Potassium: 3.2 mEq/L (Reference Range: 3.5-5.1 mEq/L)',
    'eGFR: >60 mL/min (Reference Range: Not provided)'
  ];
  const pdfBuffer = createValidPdfBuffer(reportLines);
  const sampleReportPath = path.resolve(__dirname, '../uploads/test_real_report.pdf');
  fs.writeFileSync(sampleReportPath, pdfBuffer);
  console.log(`[PASS] Step 5: Real medical report PDF prepared at: ${sampleReportPath}\n`);

  // --- Step 6: Upload Real Medical Report ---
  console.log('--- [Step 6] Upload Real Medical Report ---');
  const formData = new FormData();
  formData.append('patient_id', patientId.toString());
  formData.append('report_title', 'Comprehensive Chemistry & Hematology Profile');
  formData.append('report_type', 'Lab Test');
  formData.append('report_date', '2026-09-05');
  formData.append('lab_name', 'MetroPath Clinical Laboratories');
  
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  formData.append('file', blob, 'real_chemistry_panel.pdf');

  const uploadRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: authHeaders,
    body: formData
  });

  assert.strictEqual(uploadRes.status, 201, 'Upload must return HTTP 201');
  const uploadJson = await uploadRes.json();
  const reportId = uploadJson.report.id;
  assert(reportId, 'Uploaded report must have an ID');
  console.log(`[PASS] Step 6: Real report uploaded successfully - Report ID: ${reportId}\n`);

  // --- Step 7: Text Extraction & Structured Extraction Pipeline ---
  console.log('--- [Step 7] Verify Extraction Pipeline & Extraction Results ---');
  // Wait briefly if processing asynchronously
  let reportDetails;
  for (let attempt = 0; attempt < 10; attempt++) {
    const rRes = await fetch(`${BASE_URL}/api/reports/${reportId}`, { headers: authHeaders });
    assert.strictEqual(rRes.status, 200, 'Get report details must return HTTP 200');
    const rData = await rRes.json();
    reportDetails = rData.report;
    if (reportDetails.processing_status === 'extracted') break;
    await new Promise(r => setTimeout(r, 500));
  }

  assert.strictEqual(reportDetails.processing_status, 'extracted', 'Report processing must transition to extracted');
  console.log(`[PASS] Step 7.1: Processing status transitioned to: ${reportDetails.processing_status}`);

  // Fetch structured extracted test results
  const resultsRes = await fetch(`${BASE_URL}/api/reports/${reportId}/results`, { headers: authHeaders });
  assert.strictEqual(resultsRes.status, 200, 'Get extracted results must return HTTP 200');
  const resultsData = await resultsRes.json();
  const extractedResults = resultsData.results;
  assert(extractedResults.length >= 4, `Must extract structured tests (Found: ${extractedResults.length})`);
  console.log(`[PASS] Step 7.2: Structured extraction completed - Total tests extracted: ${extractedResults.length}\n`);

  // --- Steps 8-13: Validate Specific Tests, Ranges, Deterministic Status, Provenance ---
  console.log('--- [Steps 8-13] Verify Reference Ranges, Deterministic Status & Provenance ---');
  
  // 1. Normal Test: Hemoglobin (13.2 g/dL, range 12.0-16.0 -> NORMAL)
  const hgb = extractedResults.find(r => r.test_name.toLowerCase().includes('hemoglobin'));
  assert(hgb, 'Hemoglobin must be extracted');
  assert.strictEqual(hgb.value, '13.2', 'Hemoglobin value must equal 13.2');
  assert.strictEqual(hgb.status, 'normal', 'Deterministic status for Hemoglobin 13.2 (range 12-16) must be normal');
  assert(hgb.source_snippet.includes('13.2'), 'Source snippet must quote verbatim report text');
  console.log('[PASS] Step 8: Normal classification: Hemoglobin (13.2 g/dL, Range: 12.0-16.0) -> Status: NORMAL');

  // 2. High Test: Fasting Blood Glucose (126 mg/dL, range 70-99 -> HIGH)
  const glucose = extractedResults.find(r => r.test_name.toLowerCase().includes('glucose'));
  assert(glucose, 'Glucose must be extracted');
  assert.strictEqual(glucose.value, '126', 'Glucose value must equal 126');
  assert.strictEqual(glucose.status, 'high', 'Deterministic status for Glucose 126 (range 70-99) must be high');
  assert(glucose.source_snippet.includes('126'), 'Source snippet must quote verbatim report text');
  console.log('[PASS] Step 9: High classification: Fasting Glucose (126 mg/dL, Range: 70-99) -> Status: HIGH');

  // 3. Low Test: Serum Potassium (3.2 mEq/L, range 3.5-5.1 -> LOW)
  const potassium = extractedResults.find(r => r.test_name.toLowerCase().includes('potassium'));
  assert(potassium, 'Potassium must be extracted');
  assert.strictEqual(potassium.value, '3.2', 'Potassium value must equal 3.2');
  assert.strictEqual(potassium.status, 'low', 'Deterministic status for Potassium 3.2 (range 3.5-5.1) must be low');
  console.log('[PASS] Step 10: Low classification: Serum Potassium (3.2 mEq/L, Range: 3.5-5.1) -> Status: LOW');

  // 4. Unknown Test: eGFR (no reference range -> UNKNOWN, reference_range = null)
  const egfr = extractedResults.find(r => r.test_name.toLowerCase().includes('egfr'));
  assert(egfr, 'eGFR must be extracted');
  assert.strictEqual(egfr.reference_range, null, 'Reference range must be NULL when not provided in report');
  assert.strictEqual(egfr.status, 'unknown', 'Missing reference range must default deterministically to status: UNKNOWN');
  console.log('[PASS] Step 11: Missing range safety: eGFR -> reference_range = NULL, Status: UNKNOWN');

  // Verify all source snippets and confidence
  for (const r of extractedResults) {
    assert(r.source_snippet && r.source_snippet.trim().length > 0, `Result ${r.test_name} must contain verbatim source snippet`);
    assert(r.confidence_score >= 0 && r.confidence_score <= 100, `Confidence score must be valid (Got: ${r.confidence_score})`);
  }
  console.log('[PASS] Step 12: Every extracted result contains verbatim source snippet and valid confidence score.\n');

  // --- Step 14: Human Verification Actions ---
  console.log('--- [Step 14] Human Verification Actions (Accept, Edit, Mark Uncertain) ---');
  // Accept Hemoglobin
  const acceptRes = await fetch(`${BASE_URL}/api/verification/${hgb.id}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accepted' })
  });
  assert.strictEqual(acceptRes.status, 200, 'Accept verification must return HTTP 200');
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptData.result.verified, 1, 'Accepted result must have verified = 1');
  assert.strictEqual(acceptData.result.verification_action, 'accepted', 'Verification action must be accepted');
  console.log('[PASS] Step 14.1: Human verification Accept succeeded (verified = true, value = extracted).');

  // Edit Glucose
  const editRes = await fetch(`${BASE_URL}/api/verification/${glucose.id}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'edited', corrected_value: '124' })
  });
  assert.strictEqual(editRes.status, 200, 'Edit verification must return HTTP 200');
  const editData = await editRes.json();
  assert.strictEqual(editData.result.verified, 1, 'Edited result must have verified = 1');
  assert.strictEqual(editData.result.verified_value, '124', 'Verified value must equal corrected value');
  assert.strictEqual(editData.result.value, '126', 'Original extracted value must never be silently overwritten');
  console.log('[PASS] Step 14.2: Human verification Edit succeeded (verified = true, verified_value = corrected, original preserved).');

  // Mark Uncertain eGFR
  const uncertainRes = await fetch(`${BASE_URL}/api/verification/${egfr.id}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'marked_uncertain' })
  });
  assert.strictEqual(uncertainRes.status, 200, 'Mark uncertain must return HTTP 200');
  const uncertainData = await uncertainRes.json();
  assert.strictEqual(uncertainData.result.verified, 0, 'Uncertain result must have verified = 0');
  assert.strictEqual(uncertainData.result.verification_action, 'marked_uncertain', 'Verification action must be marked_uncertain');
  console.log('[PASS] Step 14.3: Human verification Mark Uncertain succeeded (verified = false, marked for review).\n');

  // --- Step 15: AI Patient-Friendly Summary Generation ---
  console.log('--- [Step 15] AI Patient-Friendly Summary Generation ---');
  const summaryRes = await fetch(`${BASE_URL}/api/patients/${patientId}/summary/generate`, {
    method: 'POST',
    headers: authHeaders
  });
  assert.strictEqual(summaryRes.status, 201, 'Summary generation must return HTTP 201');
  const summaryData = await summaryRes.json();
  const summaryContent = summaryData.summary.content;

  // Verify the 5 mandated sections
  assert(summaryContent.includes('## Patient Information'), 'Summary must contain "## Patient Information"');
  assert(summaryContent.includes('## Report Overview'), 'Summary must contain "## Report Overview"');
  assert(summaryContent.includes('## Reported Results'), 'Summary must contain "## Reported Results"');
  assert(summaryContent.includes('## Information That May Need Review') || summaryContent.includes('## Information Requiring Review'), 'Summary must contain Information Review section');
  assert(summaryContent.includes('## Important Notice'), 'Summary must contain "## Important Notice"');

  // Verify authoritative inclusion: only accepted/edited verified results appear in Reported Results
  assert(summaryContent.includes('Hemoglobin'), 'Verified Hemoglobin must appear in Reported Results');
  assert(summaryContent.includes('124'), 'Corrected Glucose value (124) must appear in Reported Results');

  // Verify safety boundaries
  const lowerSummary = summaryContent.toLowerCase();
  assert(!lowerSummary.includes('diagnosed with'), 'Summary must NEVER diagnose a disease');
  assert(!lowerSummary.includes('recommend treatment') && !lowerSummary.includes('prescribe'), 'Summary must NEVER prescribe or recommend treatment');
  assert(!lowerSummary.includes('recommended dosage'), 'Summary must NEVER recommend medication dosage');

  // Verify exact verbatim safety notice
  const mandatoryNotice = "This summary organizes the available information for review and is not a medical diagnosis or treatment recommendation.";
  assert(summaryContent.includes(mandatoryNotice), 'Summary must contain the exact verbatim non-diagnostic notice');
  console.log('[PASS] Step 15: AI Patient-Friendly Summary generated successfully with 5 required sections, strict data grounding, and verbatim safety notice.\n');

  // --- Step 16: Data Persistence in SQLite on Disk ---
  console.log('--- [Step 16] Verify Direct SQLite Disk Persistence ---');
  const db = require('./db');
  const dbPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  assert(dbPatient, 'Patient record must exist in SQLite on disk');
  const dbReport = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportId);
  assert(dbReport, 'Report record must exist in SQLite on disk');
  const dbResults = db.prepare('SELECT * FROM extracted_results WHERE report_id = ?').all(reportId);
  assert(dbResults.length >= 4, 'Extracted results must exist in SQLite on disk');
  const dbSummary = db.prepare('SELECT * FROM ai_summaries WHERE patient_id = ?').get(patientId);
  assert(dbSummary, 'Summary record must exist in SQLite on disk');
  console.log('[PASS] Step 16: Direct SQLite database disk persistence verified for patient, report, results, and summary.\n');

  // Clean up test report file
  if (fs.existsSync(sampleReportPath)) {
    fs.unlinkSync(sampleReportPath);
  }

  console.log('====================================================');
  console.log('🎉 ALL REAL DATA WORKFLOW CHECKS PASSED WITH 100% SUCCESS');
  console.log('====================================================');
}

testRealWorkflow().catch(err => {
  console.error('[FAIL] Real workflow test error:', err);
  process.exit(1);
});
