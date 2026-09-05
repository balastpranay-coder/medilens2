// Comprehensive automated test script validating all requirements of the MedLens foundation stage
const assert = require('node:assert');

async function runTests() {
  console.log('---------------------------------------------------------');
  console.log('MedLens Foundation Stage: Automated End-to-End Test Suite');
  console.log('---------------------------------------------------------');

  const BASE_URL = 'http://localhost:5000';

  // 1. Health check
  console.log('\n[1/12] Testing Health Check endpoint...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
  const healthJson = await healthRes.json();
  console.log('✓ Health OK:', healthJson.service);

  // 2. Test Signup
  console.log('\n[2/12] Testing Clinician Signup...');
  const testEmail = `doctor.alex.${Date.now()}@medlens.org`;
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'SecurePassword2025!',
      full_name: 'Dr. Alex Vance, MD',
      role: 'Attending Physician'
    })
  });
  assert.strictEqual(signupRes.status, 201, 'Signup should return 201 Created');
  const signupJson = await signupRes.json();
  assert(signupJson.token, 'Signup must return a valid JWT token');
  console.log('✓ Signup successful for:', signupJson.user.email);

  // 3. Test Login
  console.log('\n[3/12] Testing Clinician Login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'SecurePassword2025!'
    })
  });
  assert.strictEqual(loginRes.status, 200, 'Login should return 200');
  const loginJson = await loginRes.json();
  const token = loginJson.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('✓ Login successful. JWT token acquired.');

  // 4. Test Dashboard Stats
  console.log('\n[4/12] Testing Dashboard Statistics...');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
  assert.strictEqual(dashRes.status, 200, 'Dashboard stats should return 200');
  const dashJson = await dashRes.json();
  assert(dashJson.metrics.total_patients >= 3, 'Should have at least 3 demo patients');
  console.log('✓ Dashboard metrics retrieved: Total Patients =', dashJson.metrics.total_patients, 
              '| Processed =', dashJson.metrics.reports_processed, 
              '| Pending =', dashJson.metrics.reports_pending_verification);

  // 5. Test Patient Creation
  console.log('\n[5/12] Testing Patient Creation (PT-E2E-901)...');
  const createPatientRes = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      patient_identifier: `PT-E2E-${Date.now().toString().slice(-5)}`,
      age: 45,
      date_of_birth: '1980-06-15',
      sex: 'Male',
      status: 'Active',
      initial_notes: 'Initial clinical evaluation for recurrent respiratory symptoms.'
    })
  });
  assert.strictEqual(createPatientRes.status, 201, 'Patient creation should return 201');
  const patientData = await createPatientRes.json();
  const patientId = patientData.patient.id;
  console.log('✓ Patient created with ID:', patientId, 'Identifier:', patientData.patient.patient_identifier);

  // 6. Test Adding Information Items (Symptoms, Allergies, Medications)
  console.log('\n[6/12] Testing Adding Clinical Information Items...');
  const addSymptomRes = await fetch(`${BASE_URL}/api/patients/${patientId}/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      category: 'symptom',
      title: 'Wheezing on cold air exposure',
      description: 'Occurs after 10 minutes outdoors in cold weather',
      details: { severity: 'Moderate', onset: '2 months' }
    })
  });
  assert.strictEqual(addSymptomRes.status, 201, 'Add symptom should return 201');
  const symptomData = await addSymptomRes.json();
  assert.strictEqual(symptomData.item.source, 'USER_PROVIDED', 'Source MUST strictly equal USER_PROVIDED');
  console.log('✓ Symptom added with verified source:', symptomData.item.source);

  const addAllergyRes = await fetch(`${BASE_URL}/api/patients/${patientId}/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      category: 'allergy',
      title: 'Latex',
      description: 'Contact dermatitis on contact with latex gloves',
      details: { reaction: 'Contact dermatitis', severity: 'Mild' }
    })
  });
  assert.strictEqual(addAllergyRes.status, 201);
  const allergyData = await addAllergyRes.json();
  assert.strictEqual(allergyData.item.source, 'USER_PROVIDED');
  console.log('✓ Allergy added with verified source:', allergyData.item.source);

  const addMedRes = await fetch(`${BASE_URL}/api/patients/${patientId}/items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      category: 'medication',
      title: 'Albuterol Sulfate Inhaler',
      description: '90mcg/actuation, 2 puffs PRN wheezing',
      details: { dosage: '90mcg', frequency: 'PRN' }
    })
  });
  assert.strictEqual(addMedRes.status, 201);
  const medData = await addMedRes.json();
  const medId = medData.item.id;
  console.log('✓ Medication added with verified source:', medData.item.source);

  // 7. Test Editing Patient Information
  console.log('\n[7/12] Testing Editing Clinical Information Item...');
  const editRes = await fetch(`${BASE_URL}/api/patients/${patientId}/items/${symptomData.item.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Bilateral expiratory wheezing',
      description: 'Audible wheezing exacerbated by cold exposure and moderate exertion',
      details: { severity: 'Moderate-Severe', onset: '2 months' }
    })
  });
  assert.strictEqual(editRes.status, 200, 'Edit item should return 200');
  const updatedItem = await editRes.json();
  assert.strictEqual(updatedItem.item.title, 'Bilateral expiratory wheezing');
  console.log('✓ Symptom updated successfully:', updatedItem.item.title);

  // 8. Test Removing Patient Information Item
  console.log('\n[8/12] Testing Removing Clinical Information Item...');
  const deleteItemRes = await fetch(`${BASE_URL}/api/patients/${patientId}/items/${medId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert.strictEqual(deleteItemRes.status, 200, 'Delete item should return 200');
  console.log('✓ Medication item removed successfully.');

  // 9. Test Patient Search by Identifier
  console.log('\n[9/12] Testing Patient Search by Identifier...');
  const searchRes = await fetch(`${BASE_URL}/api/patients?search=PT-E2E`, { headers: authHeaders });
  assert.strictEqual(searchRes.status, 200);
  const searchJson = await searchRes.json();
  const found = searchJson.patients.find(p => p.patient_identifier === patientData.patient.patient_identifier);
  assert(found, 'Search must return the created patient');
  console.log('✓ Patient search by identifier returned:', found.patient_identifier);

  // 10. Test Medical Report Upload & Verification
  console.log('\n[10/12] Testing Medical Report Upload & Human Verification...');
  const reportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      patient_id: patientId,
      report_title: 'Spirometry Pulmonary Function Test',
      report_type: 'Lab Test',
      report_date: '2025-02-20',
      raw_text: 'FVC: 4.2L (94% predicted). FEV1: 2.8L (75% predicted). FEV1/FVC: 67%. Post-bronchodilator FEV1 improves by 14%.',
      summary: 'Mild reversible obstructive airway pattern, consistent with clinical reactivity.',
      conflict_notes: 'None. Aligns with user-reported wheezing symptoms.'
    })
  });
  assert.strictEqual(reportRes.status, 201, 'Upload report should return 201');
  const reportData = await reportRes.json();
  const reportId = reportData.report.id;
  assert(['PENDING_VERIFICATION', 'PROCESSED'].includes(reportData.report.status), 'Report status should be PENDING_VERIFICATION or PROCESSED');
  console.log('✓ Report uploaded with status:', reportData.report.status);

  // Verify the report
  const verifyRes = await fetch(`${BASE_URL}/api/reports/${reportId}/verify`, {
    method: 'PATCH',
    headers: authHeaders
  });
  assert.strictEqual(verifyRes.status, 200, 'Verify report should return 200');
  const verifiedJson = await verifyRes.json();
  assert.strictEqual(verifiedJson.report.status, 'VERIFIED');
  console.log('✓ Report verified successfully. New status:', verifiedJson.report.status);

  // 11. Test Full Patient Profile & Authentic Timeline
  console.log('\n[11/12] Testing Patient Profile & Authentic Timeline Events...');
  const profileRes = await fetch(`${BASE_URL}/api/patients/${patientId}`, { headers: authHeaders });
  assert.strictEqual(profileRes.status, 200);
  const profileData = await profileRes.json();
  
  // Validate structure
  assert.strictEqual(profileData.patient.patient_identifier, patientData.patient.patient_identifier);
  assert.strictEqual(profileData.items.symptoms.length, 1);
  assert.strictEqual(profileData.items.allergies.length, 1);
  assert.strictEqual(profileData.items.medications.length, 0, 'Deleted medication must not be in items');
  assert.strictEqual(profileData.reports.length, 1);

  // Validate authentic timeline events (NO fake events)
  const eventTypes = profileData.timeline.map(e => e.event_type);
  console.log('✓ Authentic recorded timeline events for patient:', eventTypes);
  assert(eventTypes.includes('PATIENT_CREATED'), 'Timeline must include PATIENT_CREATED');
  assert(eventTypes.includes('INFO_ADDED'), 'Timeline must include INFO_ADDED');
  assert(eventTypes.includes('INFO_EDITED'), 'Timeline must include INFO_EDITED');
  assert(eventTypes.includes('INFO_DELETED'), 'Timeline must include INFO_DELETED');
  assert(eventTypes.includes('REPORT_UPLOADED'), 'Timeline must include REPORT_UPLOADED');
  assert(eventTypes.includes('REPORT_VERIFIED'), 'Timeline must include REPORT_VERIFIED');
  console.log('✓ All 6 authentic lifecycle timeline events recorded accurately without simulation.');

  // 12. Test Direct Database Persistence (Survives Browser Refresh)
  console.log('\n[12/12] Testing Persistence in SQLite Database (medlens.db)...');
  const db = require('./db');
  const persistedPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  assert(persistedPatient, 'Patient record must exist directly in SQLite');
  assert.strictEqual(persistedPatient.patient_identifier, patientData.patient.patient_identifier);
  
  const persistedEvents = db.prepare('SELECT COUNT(*) as count FROM timeline_events WHERE patient_id = ?').get(patientId);
  assert(persistedEvents.count >= 6, 'Timeline events must be persisted in SQLite table');
  console.log('✓ Direct SQLite query confirmed: Patient &', persistedEvents.count, 'timeline events firmly persisted on disk.');

  console.log('\n=========================================================');
  console.log('🎉 ALL 12 FOUNDATION SUITE TESTS PASSED WITH 100% SUCCESS');
  console.log('=========================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
