/**
 * MedLens Critical Logic & Security Automated Test Suite
 * 
 * Tests the 5 core architectural areas:
 * 1. Real Report Processing & Structured Extraction
 * 2. Source Evidence & Verbatim Provenance
 * 3. Human Verification Workflow & Immutable Audit Trail
 * 4. Security, Authentication & IDOR Authorization Checks
 * 5. Deterministic Reference Range Evaluation (Mandatory Safety Unit Tests)
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { evaluateReferenceRange } = require('./rangeEvaluator');
const db = require('./db');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runTests() {
  console.log('===========================================================');
  console.log('  MEDLENS AUTOMATED CRITICAL LOGIC & SECURITY TEST SUITE   ');
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       ${err.message}`);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       ${err.message}`);
      throw err;
    }
  }

  // =========================================================
  // 1. DETERMINISTIC REFERENCE RANGE UNIT TESTS (MANDATORY)
  // =========================================================
  console.log('--- 1. Deterministic Reference Range Evaluation Unit Tests ---');

  test('1.1 Normal Value within Interval (13.4 in 12.0–16.0 -> NORMAL)', () => {
    const res = evaluateReferenceRange('13.4', '12.0–16.0');
    assert.strictEqual(res.status, 'normal');
    assert.strictEqual(res.reference_range, '12.0–16.0');
  });

  test('1.2 Low Value below Interval (11.5 in 12.0–16.0 -> LOW)', () => {
    const res = evaluateReferenceRange('11.5', '12.0–16.0');
    assert.strictEqual(res.status, 'low');
    assert.strictEqual(res.reference_range, '12.0–16.0');
  });

  test('1.3 High Value above Interval (17.0 in 12.0–16.0 -> HIGH)', () => {
    const res = evaluateReferenceRange('17.0', '12.0–16.0');
    assert.strictEqual(res.status, 'high');
    assert.strictEqual(res.reference_range, '12.0–16.0');
  });

  test('1.4 Missing Reference Range (null -> UNKNOWN, range = null)', () => {
    const res = evaluateReferenceRange('13.4', null);
    assert.strictEqual(res.status, 'unknown');
    assert.strictEqual(res.reference_range, null);
  });

  test('1.5 Unprovided Reference Range ("Not provided" -> UNKNOWN, range = null)', () => {
    const res = evaluateReferenceRange('13.4', 'Not provided');
    assert.strictEqual(res.status, 'unknown');
    assert.strictEqual(res.reference_range, null);
  });

  test('1.6 Textual Unparseable Range ("Negative" -> UNKNOWN, range preserved verbatim)', () => {
    const res = evaluateReferenceRange('Positive', 'Negative');
    assert.strictEqual(res.status, 'unknown');
    assert.strictEqual(res.reference_range, 'Negative');
  });

  test('1.7 Upper Bound Only "< 100" with value 118 -> HIGH', () => {
    const res = evaluateReferenceRange('118', '< 100');
    assert.strictEqual(res.status, 'high');
    assert.strictEqual(res.reference_range, '< 100');
  });

  test('1.8 Upper Bound Only "<= 5.7" with value 5.4 -> NORMAL', () => {
    const res = evaluateReferenceRange('5.4', '<= 5.7');
    assert.strictEqual(res.status, 'normal');
    assert.strictEqual(res.reference_range, '<= 5.7');
  });

  test('1.9 Lower Bound Only "> 60" with value 45 -> LOW', () => {
    const res = evaluateReferenceRange('45', '> 60');
    assert.strictEqual(res.status, 'low');
    assert.strictEqual(res.reference_range, '> 60');
  });

  test('1.10 Comma Separated Number "1,250" in "1000 - 1500" -> NORMAL', () => {
    const res = evaluateReferenceRange('1,250', '1000 - 1500');
    assert.strictEqual(res.status, 'normal');
  });

  // =========================================================
  // 2. AUTHENTICATION & SECURITY TESTS
  // =========================================================
  console.log('\n--- 2. Authentication & Security Tests ---');

  await asyncTest('2.1 Unauthenticated Request Rejected with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/patients`);
    assert.strictEqual(res.status, 401, 'Must reject unauthenticated access with 401');
  });

  await asyncTest('2.2 Invalid JWT Token Rejected with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/patients`, {
      headers: { Authorization: 'Bearer invalid_tampered_token_xyz' }
    });
    assert.strictEqual(res.status, 401, 'Must reject invalid token with 401');
  });

  // Setup Two Isolated Clinician Accounts to test IDOR
  const userAEmail = `clinician.a.${Date.now()}@medlens.org`;
  const userBEmail = `clinician.b.${Date.now()}@medlens.org`;
  let tokenA, userA, tokenB, userB;

  await asyncTest('2.3 Register Clinician User A', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'SecurePassword123!', full_name: 'Dr. Alice Morgan', role: 'Clinical Reviewer' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    tokenA = data.token;
    userA = data.user;
    assert(tokenA);
    assert.strictEqual(userA.email, userAEmail);
  });

  await asyncTest('2.4 Register Clinician User B', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: 'SecurePassword123!', full_name: 'Dr. Bob Vance', role: 'Clinical Reviewer' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    tokenB = data.token;
    userB = data.user;
    assert(tokenB);
    assert.strictEqual(userB.email, userBEmail);
  });

  // =========================================================
  // 3. IDOR & AUTHORIZATION PROTECTION TESTS
  // =========================================================
  console.log('\n--- 3. IDOR & Authorization Protection Tests ---');

  let patientAId, reportAId, resultAId;

  await asyncTest('3.1 User A Creates Patient Record', async () => {
    const pIdentifier = `PT-AUTHTEST-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ patient_identifier: pIdentifier, age: 48, sex: 'Female', status: 'Active' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    patientAId = data.patient.id;
    assert(patientAId);
  });

  await asyncTest('3.2 User B CANNOT Access User A Patient (IDOR Prevention -> 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/patients/${patientAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden for unauthorized patient access');
  });

  await asyncTest('3.3 User B CANNOT Update User A Patient (IDOR Prevention -> 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/patients/${patientAId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ age: 99 })
    });
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden on unauthorized patient update');
  });

  await asyncTest('3.4 User B CANNOT Add Info Items to User A Patient (IDOR Prevention -> 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/patients/${patientAId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ category: 'symptom', title: 'Unauthorized Fatigue' })
    });
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden on unauthorized item addition');
  });

  // =========================================================
  // 4. REPORT UPLOAD & EXTRACTION PIPELINE TESTS
  // =========================================================
  console.log('\n--- 4. Real Report Upload & Extraction Pipeline Tests ---');

  const rawLabTextFixture = `
LABORATORY REPORT - METROPOLITAN DIAGNOSTIC CLINIC
Collection Date: 2025-05-10
Patient: PT-AUTHTEST

TEST NAME            VALUE    UNIT     REFERENCE RANGE
Hemoglobin           13.4     g/dL     12.0–16.0 g/dL
WBC Count            6.8      x10^3/uL 4.5–11.0 x10^3/uL
Platelets            245      x10^3/uL 150–450 x10^3/uL
Fasting Glucose      118      mg/dL    70–100 mg/dL
Serum Creatinine     0.9      mg/dL    0.6–1.2 mg/dL
ALT (SGPT)           68       U/L      < 45 U/L
Troponin I           <0.01    ng/mL    < 0.04 ng/mL
`;

  await asyncTest('4.1 User A Uploads Real Authorized Report Fixture', async () => {
    const res = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        patient_id: patientAId,
        report_title: 'Comprehensive Metabolic & CBC Panel',
        report_type: 'Lab Test',
        report_date: '2025-05-10',
        lab_name: 'Metropolitan Diagnostic Clinic',
        raw_text: rawLabTextFixture
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    reportAId = data.report.id;
    assert(reportAId);
  });

  await asyncTest('4.2 User B CANNOT Access User A Report Details (IDOR Prevention -> 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/${reportAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden on unauthorized report access');
  });

  await asyncTest('4.3 User B CANNOT Download User A Private Document (IDOR Prevention -> 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/${reportAId}/file`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden on unauthorized document file download');
  });

  await asyncTest('4.4 Execute Extraction Pipeline for User A Report', async () => {
    const res = await fetch(`${BASE_URL}/api/extraction/${reportAId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.message && data.message.includes('Extracted'), 'Must extract structured items');
  });

  await asyncTest('4.5 Validate Structured Results with Verbatim Evidence & Deterministic Ranges', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/${reportAId}/results`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const results = data.results;
    assert(results.length >= 5, `Expected at least 5 extracted results, got ${results.length}`);

    // Check Hemoglobin (13.4 in 12.0-16.0 -> NORMAL)
    const hb = results.find(r => r.test_name.toLowerCase().includes('hemoglobin'));
    assert(hb, 'Hemoglobin must be extracted');
    assert.strictEqual(hb.status, 'normal', 'Hemoglobin 13.4 must evaluate to NORMAL');
    assert(hb.source_snippet.includes('13.4'), 'Source snippet must contain verbatim value');
    assert.strictEqual(hb.verified, 0, 'Newly extracted result must be unverified (pending review)');

    // Check Fasting Glucose (118 in 70-100 -> HIGH)
    const glucose = results.find(r => r.test_name.toLowerCase().includes('glucose'));
    assert(glucose, 'Glucose must be extracted');
    assert.strictEqual(glucose.status, 'high', 'Glucose 118 must evaluate to HIGH');

    // Check ALT (68 in < 45 -> HIGH)
    const alt = results.find(r => r.test_name.toLowerCase().includes('alt'));
    assert(alt, 'ALT must be extracted');
    assert.strictEqual(alt.status, 'high', 'ALT 68 with range < 45 must evaluate to HIGH');

    resultAId = hb.id;
  });

  // =========================================================
  // 5. HUMAN VERIFICATION & IMMUTABLE AUDIT TRAIL TESTS
  // =========================================================
  console.log('\n--- 5. Human Verification & Immutable Audit Trail Tests ---');

  await asyncTest('5.1 User B CANNOT Verify User A Extracted Result (IDOR Prevention -> 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/verification/${resultAId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ action: 'accepted' })
    });
    assert.strictEqual(res.status, 403, 'Must return 403 on unauthorized result verification');
  });

  await asyncTest('5.2 User A Verifies Result with Clinical Edit (13.4 -> 13.2)', async () => {
    const res = await fetch(`${BASE_URL}/api/verification/${resultAId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ action: 'edited', corrected_value: '13.2' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.result.verified, 1);
    assert.strictEqual(data.result.verified_value, '13.2');
    assert.strictEqual(data.result.verification_action, 'edited');
  });

  await asyncTest('5.3 Verify Immutable Audit Record Created in Database', async () => {
    const res = await fetch(`${BASE_URL}/api/verification/history/${resultAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const history = data.history;
    assert(history.length >= 1, 'Audit history must contain verification record');
    const record = history[0];
    assert.strictEqual(record.action, 'edited');
    assert.strictEqual(record.previous_value, '13.4');
    assert.strictEqual(record.new_value, '13.2');
    assert.strictEqual(record.reviewed_by, userA.id);
  });

  await asyncTest('5.4 Verify Evidence & Provenance Viewer Endpoint Returns Full Trace', async () => {
    const res = await fetch(`${BASE_URL}/api/extracted-results/${resultAId}/evidence`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.result.id, resultAId);
    assert(data.result.source_snippet);
    assert(Array.isArray(data.pipeline) && data.pipeline.length >= 4, 'Pipeline progression must have at least 4 steps');
  });

  console.log('\n===========================================================');
  console.log(`  ALL CRITICAL LOGIC & SECURITY TESTS PASSED (${passedTests}/${totalTests}) `);
  console.log('===========================================================\n');
}

runTests().catch(err => {
  console.error('\nTest execution aborted due to failure:', err);
  process.exit(1);
});
