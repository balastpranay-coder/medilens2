const assert = require('node:assert');

async function verifyAppHealth() {
  console.log('--- Checking MedLens Application Health ---');

  // 1. Root / Frontend Serve
  const rootRes = await fetch('http://localhost:5000/');
  assert.strictEqual(rootRes.status, 200, 'Root must return HTTP 200');
  const rootHtml = await rootRes.text();
  assert(rootHtml.includes('id="root"'), 'Root HTML must contain root div');
  console.log('[PASS] Frontend assets served properly by Express server');

  // 2. Authentication
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo.clinician@medlens.org', password: 'MedLensDemo2025!' })
  });
  assert.strictEqual(loginRes.status, 200, 'Clinician login must succeed');
  const { token, user } = await loginRes.json();
  assert(token, 'Token must exist');
  assert.strictEqual(user.email, 'demo.clinician@medlens.org');
  console.log(`[PASS] Authenticated as ${user.full_name} (${user.role})`);

  const headers = { Authorization: `Bearer ${token}` };

  // 3. Dashboard Real Empty State
  const dashRes = await fetch('http://localhost:5000/api/dashboard/stats', { headers });
  assert.strictEqual(dashRes.status, 200, 'Dashboard must return HTTP 200');
  const dash = await dashRes.json();
  assert.strictEqual(dash.metrics.total_patients, 0);
  assert.strictEqual(dash.metrics.total_reports, 0);
  assert.strictEqual(dash.recent_patients.length, 0);
  assert.strictEqual(dash.recent_reports.length, 0);
  assert.strictEqual(dash.recent_activity.length, 0);
  console.log('[PASS] Clean initial dashboard metrics verified (0 fake data)');

  // 4. Patients Directory Clean State
  const patRes = await fetch('http://localhost:5000/api/patients', { headers });
  assert.strictEqual(patRes.status, 200);
  const { patients } = await patRes.json();
  assert.strictEqual(patients.length, 0);
  console.log('[PASS] Clean initial patients directory verified (0 patients)');

  // 5. Reports Repository Clean State
  const repRes = await fetch('http://localhost:5000/api/reports', { headers });
  assert.strictEqual(repRes.status, 200);
  const { reports } = await repRes.json();
  assert.strictEqual(reports.length, 0);
  console.log('[PASS] Clean initial reports repository verified (0 reports)');

  // 6. Verification Queue Clean State
  const verRes = await fetch('http://localhost:5000/api/verification/queue', { headers });
  assert.strictEqual(verRes.status, 200);
  const { queue } = await verRes.json();
  assert.strictEqual(queue.length, 0);
  console.log('[PASS] Clean initial verification queue verified (0 pending)');

  // 7. Synthetic Demo Endpoint Rejection (Zero Fake Data Guarantee)
  const synthRes = await fetch('http://localhost:5000/api/reports/synthetic-demo', {
    method: 'POST',
    headers,
    body: JSON.stringify({ patient_id: 1 })
  });
  assert.strictEqual(synthRes.status, 400);
  const synthJson = await synthRes.json();
  assert(synthJson.error.includes('Synthetic demo data generation is disabled'));
  console.log('[PASS] Synthetic demo generator disabled & rejected cleanly');

  // 8. Demo Seeder Endpoint Rejection
  const seedRes = await fetch('http://localhost:5000/api/demo/seed', {
    method: 'POST',
    headers
  });
  assert.strictEqual(seedRes.status, 400);
  console.log('[PASS] Synthetic demo seeder disabled & rejected cleanly');

  console.log('\n====================================================');
  console.log('🎉 ALL APPLICATION HEALTH CHECKS CONFIRMED HEALTHY');
  console.log('====================================================');
}

verifyAppHealth().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
