const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = 'http://localhost:5000';

async function testComparisonAndConflicts() {
  console.log('====================================================');
  console.log('MedLens Multi-Report Comparison & Conflict Test');
  console.log('====================================================\n');

  // Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo.clinician@medlens.org', password: 'MedLensDemo2025!' })
  });
  const { token } = await loginRes.json();
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Fetch the patient created in test_real_workflow
  const patientsRes = await fetch(`${BASE_URL}/api/patients`, { headers: authHeaders });
  const { patients } = await patientsRes.json();
  assert(patients.length > 0, 'Must have at least 1 real patient');
  const patient = patients[0];
  console.log(`[PASS] Using real patient: ${patient.patient_identifier} (ID: ${patient.id})`);

  // Prepare second follow-up PDF report
  const followUpReportContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 320 >> stream
BT
/F1 12 Tf
50 720 Td
(METROPOLITAN CLINICAL LABORATORIES) Tj
0 -24 Td
(PATIENT IDENTIFIER: ${patient.patient_identifier}) Tj
0 -18 Td
(REPORT DATE: 2025-03-10) Tj
0 -24 Td
(Fasting Blood Glucose: 142 mg/dL (Reference Range: 70-99 mg/dL)) Tj
0 -18 Td
(Hemoglobin: 14.1 g/dL (Reference Range: 12.0-16.0 g/dL)) Tj
0 -18 Td
(Serum Potassium: 4.2 mEq/L (Reference Range: 3.5-5.1 mEq/L)) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
590
%%EOF`;

  const reportFilePath = path.resolve(__dirname, '../uploads/test_followup_report.pdf');
  fs.writeFileSync(reportFilePath, followUpReportContent);

  // Upload second report using multipart/form-data
  const boundary = '----MedLensFormBoundary' + Math.random().toString(36).substring(2);
  const fileBuffer = fs.readFileSync(reportFilePath);

  let bodyBuffer = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="patient_id"\r\n\r\n` +
      `${patient.id}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="report_title"\r\n\r\n` +
      `Follow-up Chemistry Profile\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="report_type"\r\n\r\n` +
      `Lab Test\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="report_date"\r\n\r\n` +
      `2025-03-10\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test_followup_report.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });

  assert.strictEqual(uploadRes.status, 201, 'Upload follow-up report must return HTTP 201');
  const uploadData = await uploadRes.json();
  const followUpReportId = uploadData.report.id;
  console.log(`[PASS] Follow-up report uploaded - ID: ${followUpReportId}`);

  // Wait for extraction
  let extracted = false;
  for (let i = 0; i < 10; i++) {
    const rRes = await fetch(`${BASE_URL}/api/reports/${followUpReportId}`, { headers: authHeaders });
    const { report: rep } = await rRes.json();
    if (rep.processing_status === 'extracted') {
      extracted = true;
      break;
    }
    await new Promise(r => setTimeout(r, 400));
  }
  assert(extracted, 'Follow-up report must extract tests');
  console.log('[PASS] Follow-up report extracted structured tests');

  // Verify Comparison between baseline (Report 1) and follow-up (Report 2)
  const repListRes = await fetch(`${BASE_URL}/api/reports?patient_id=${patient.id}`, { headers: authHeaders });
  const { reports: pReports } = await repListRes.json();
  assert(pReports.length >= 2, 'Patient must have at least 2 reports');

  const reportAId = pReports[1].id;
  const reportBId = pReports[0].id;

  const compareRes = await fetch(`${BASE_URL}/api/reports/compare?report_a_id=${reportAId}&report_b_id=${reportBId}`, {
    headers: authHeaders
  });
  assert.strictEqual(compareRes.status, 200, 'Compare reports must return HTTP 200');
  const compData = await compareRes.json();
  assert(compData.comparisons && compData.comparisons.length >= 2, 'Must align matching lab tests between reports');
  console.log(`[PASS] Longitudinal Comparison verified - Aligned tests count: ${compData.comparisons.length}`);

  // Add conflicting medication to trigger conflict detection
  const addMedRes = await fetch(`${BASE_URL}/api/patients/${patient.id}/items`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'medication',
      title: 'Amoxicillin 500mg',
      description: 'Oral capsule daily'
    })
  });
  assert.strictEqual(addMedRes.status, 201, 'Medication item added');

  // Run conflict detection
  const conflictRes = await fetch(`${BASE_URL}/api/patients/${patient.id}/conflicts/detect`, {
    method: 'POST',
    headers: authHeaders
  });
  assert.strictEqual(conflictRes.status, 200, 'Conflict detection must return HTTP 200');
  const conflictData = await conflictRes.json();
  console.log(`[PASS] Conflict detection executed - Conflicts found: ${conflictData.conflicts.length}`);

  // Check timeline events
  const timelineRes = await fetch(`${BASE_URL}/api/patients/${patient.id}/timeline`, { headers: authHeaders });
  const { events } = await timelineRes.json();
  assert(events && events.length >= 3, 'Timeline must record all genuine patient events');
  console.log(`[PASS] Timeline verified - Recorded authentic events: ${events.length}`);

  // Check updated dashboard counts
  const dashRes = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
  const dashData = await dashRes.json();
  assert.strictEqual(dashData.metrics.total_patients, 1, 'Total patients must equal 1');
  assert.strictEqual(dashData.metrics.total_reports, 2, 'Total reports must equal 2');
  console.log(`[PASS] Dashboard updated from real DB queries -> Patients: ${dashData.metrics.total_patients} | Reports: ${dashData.metrics.total_reports}`);

  console.log('\n====================================================');
  console.log('🎉 COMPARISON, CONFLICTS, TIMELINE & DASHBOARD ALL VERIFIED');
  console.log('====================================================');
}

testComparisonAndConflicts().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
