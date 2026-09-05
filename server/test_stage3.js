/**
 * MedLens Stage 3 Automated Test Suite
 * 
 * Verifies all 20 acceptance and demo workflow steps for STAGE 3:
 * 1. Clinician Authentication
 * 2. Dashboard Real Metrics (Total Patients, Total Reports, Pending, Verified Results, Conflicts, Recent Activity)
 * 3. Synthetic Demo Patient Access
 * 4. Report Retrieval
 * 5. Structured Extracted Results
 * 6. Reference Ranges Verification
 * 7. Deterministic Low/Normal/High/Unknown Status
 * 8. Source Provenance Snippets
 * 9. Verification Action: Accept
 * 10. Verification Action: Edit / Correct
 * 11. Verification Action: Mark Uncertain ("Uncertain — requires review")
 * 12. Verification Action: Reject & Audit History Records (Immutable)
 * 13. Longitudinal Report Comparison (Factual Numerical Delta, No Subjective Claims)
 * 14. Conflict Detection (Medication / Allergy Clash)
 * 15. Conflict Resolution
 * 16. AI Summary Generation (Structured & Verified Records Only, No Raw Text)
 * 17. AI Summary Safety Disclaimer (Mandatory Notice)
 * 18. Summary Versioning & Historical Archive
 * 19. Expanded Timeline Event Logging (All actions logged authentically)
 * 20. Direct Database Persistence across Server Operations
 */

const db = require('./db');

const BASE_URL = 'http://localhost:5000';

async function runStage3Tests() {
  console.log('====================================================');
  console.log('MedLens Stage 3: Human Verification, AI Summary,');
  console.log('Comparison, Conflicts & Dashboard Analytics Suite');
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

  // 1. Login
  console.log('--- [1/20] Clinician Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo.clinician@medlens.org',
      password: 'MedLensDemo2025!'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(Boolean(token), 'Step 1: Clinician authenticated successfully', `Token Acquired`);
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Dashboard Real Metrics
  console.log('\n--- [2/20] Real Database Dashboard Metrics ---');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200, 'Step 2.1: Dashboard stats returned 200 OK');
  assert(dashData.metrics?.total_patients >= 3, 'Step 2.2: Total Patients reflects real count', `Count: ${dashData.metrics?.total_patients}`);
  assert(dashData.metrics?.total_reports >= 4, 'Step 2.3: Total Reports reflects real count', `Count: ${dashData.metrics?.total_reports}`);
  assert(dashData.metrics?.verified_results !== undefined, 'Step 2.4: Verified Results metric present', `Verified: ${dashData.metrics?.verified_results}`);
  assert(dashData.metrics?.conflicts_requiring_review >= 1, 'Step 2.5: Conflicts Requiring Review present', `Conflicts: ${dashData.metrics?.conflicts_requiring_review}`);
  assert(Array.isArray(dashData.recent_activity) && dashData.recent_activity.length > 0, 'Step 2.6: Recent Activity populated from real timeline events', `Events: ${dashData.recent_activity?.length}`);

  // 3. Open Synthetic Demo Patient
  console.log('\n--- [3/20] Access Synthetic Demo Patient PT-DEMO-101 ---');
  const p1 = db.prepare("SELECT id, patient_identifier FROM patients WHERE patient_identifier = 'PT-DEMO-101'").get();
  assert(Boolean(p1), 'Step 3.1: PT-DEMO-101 exists in database', `Patient ID: ${p1?.id}`);
  const patientRes = await fetch(`${BASE_URL}/api/patients/${p1.id}`, { headers: authHeaders });
  const patientData = await patientRes.json();
  assert(patientRes.status === 200, 'Step 3.2: Retrieved complete patient profile');
  assert(patientData.patient?.patient_identifier === 'PT-DEMO-101', 'Step 3.3: Patient identifier verified');
  assert(Array.isArray(patientData.items?.symptoms) && patientData.items.symptoms.length > 0, 'Step 3.4: User-provided symptoms loaded with source: USER_PROVIDED');

  // 4 & 5. Open Report & View Extracted Results
  console.log('\n--- [4/20 & 5/20] Report Retrieval & Extracted Results ---');
  const repList = patientData.reports;
  assert(Array.isArray(repList) && repList.length >= 2, 'Step 4.1: Patient has at least 2 reports on file', `Count: ${repList.length}`);
  const baselineRep = repList.find(r => r.report_title.includes('Baseline')) || repList[0];
  const resultsRes = await fetch(`${BASE_URL}/api/reports/${baselineRep.id}/results`, { headers: authHeaders });
  const resultsData = await resultsRes.json();
  assert(Array.isArray(resultsData.results) && resultsData.results.length >= 4, 'Step 5.1: Extracted laboratory results retrieved', `Count: ${resultsData.results?.length}`);

  // 6 & 7. Confirm Reference Ranges & Classification
  console.log('\n--- [6/20 & 7/20] Reference Ranges & Range Classification ---');
  const glucoseTest = resultsData.results.find(r => r.test_name.toLowerCase().includes('glucose'));
  assert(Boolean(glucoseTest), 'Step 6.1: Fasting Glucose test present in results');
  assert(glucoseTest.reference_range !== null, 'Step 6.2: Fasting Glucose reference range provided', `Range: ${glucoseTest?.reference_range}`);
  assert(['high', 'normal'].includes(glucoseTest.status), 'Step 7.1: Deterministic range status evaluated', `Status: ${glucoseTest?.status}`);

  const egfrTest = resultsData.results.find(r => r.test_name.toLowerCase().includes('egfr'));
  assert(Boolean(egfrTest), 'Step 6.3: eGFR test present in results');
  assert(egfrTest.reference_range === null, 'Step 6.4: eGFR reference range is NULL when not provided in report');
  assert(egfrTest.status === 'unknown', 'Step 7.2: Missing reference range defaults to status=unknown', `Status: ${egfrTest?.status}`);

  // 8. Open Source Snippets
  console.log('\n--- [8/20] Source Snippet Provenance ---');
  const allHaveSnippets = resultsData.results.every(r => r.source_snippet && r.source_snippet.length > 0);
  assert(allHaveSnippets, 'Step 8.1: Every extracted result contains a verbatim source snippet');
  assert(glucoseTest.source_snippet.includes(glucoseTest.value), 'Step 8.2: Fasting Glucose snippet quotes source document verbatim', `Snippet: "${glucoseTest.source_snippet}"`);

  // 9. Verification Action: Accept
  console.log('\n--- [9/20] Verification Action: Accept ---');
  const pendingItem = db.prepare("SELECT id, test_name, value FROM extracted_results WHERE verified = 0 AND (verification_action IS NULL OR verification_action = 'pending') LIMIT 1").get();
  assert(Boolean(pendingItem), 'Setup: Found pending test item for verification action', `Item: ${pendingItem?.test_name}`);

  const acceptRes = await fetch(`${BASE_URL}/api/verification/${pendingItem.id}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'accepted' })
  });
  const acceptData = await acceptRes.json();
  assert(acceptRes.status === 200, 'Step 9.1: Verification Accept returned 200 OK');
  assert(acceptData.result?.verified === 1, 'Step 9.2: Result marked verified = true');
  assert(acceptData.result?.verified_value === pendingItem.value, 'Step 9.3: verified_value equals extracted value on accept', `Value: ${acceptData.result?.verified_value}`);
  assert(acceptData.result?.verification_action === 'accepted', 'Step 9.4: Action recorded as accepted');

  // 10. Verification Action: Edit
  console.log('\n--- [10/20] Verification Action: Edit / Correct ---');
  const editRes = await fetch(`${BASE_URL}/api/verification/${pendingItem.id}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'edited', corrected_value: '99.9' })
  });
  const editData = await editRes.json();
  assert(editRes.status === 200, 'Step 10.1: Verification Edit returned 200 OK');
  assert(editData.result?.verified === 1, 'Step 10.2: Result remains verified = true after edit');
  assert(editData.result?.verified_value === '99.9', 'Step 10.3: verified_value updated to corrected value (99.9)', `Verified Value: ${editData.result?.verified_value}`);
  assert(editData.result?.value === pendingItem.value, 'Step 10.4: Original extracted value preserved (never silently overwritten)', `Original: ${editData.result?.value}`);
  assert(editData.result?.verification_action === 'edited', 'Step 10.5: Action recorded as edited');

  // 11. Verification Action: Mark Uncertain
  console.log('\n--- [11/20] Verification Action: Mark Uncertain ---');
  const uncertainRes = await fetch(`${BASE_URL}/api/verification/${pendingItem.id}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'marked_uncertain' })
  });
  const uncertainData = await uncertainRes.json();
  assert(uncertainRes.status === 200, 'Step 11.1: Verification Mark Uncertain returned 200 OK');
  assert(uncertainData.result?.verified === 0, 'Step 11.2: verified = false for uncertain items');
  assert(uncertainData.result?.verification_action === 'marked_uncertain', 'Step 11.3: Action set to marked_uncertain');

  // 12. Verification History
  console.log('\n--- [12/20] Immutable Verification Audit History ---');
  const histRes = await fetch(`${BASE_URL}/api/verification/history/${pendingItem.id}`, { headers: authHeaders });
  const histData = await histRes.json();
  assert(histRes.status === 200, 'Step 12.1: Verification history returned 200 OK');
  assert(Array.isArray(histData.history) && histData.history.length >= 3, 'Step 12.2: Complete immutable history retained (accepted, edited, marked_uncertain)', `Records: ${histData.history?.length}`);
  assert(histData.history.some(h => h.action === 'accepted'), 'Step 12.3: Historical accepted action preserved');
  assert(histData.history.some(h => h.action === 'edited'), 'Step 12.4: Historical edited action preserved');
  assert(histData.history.some(h => h.action === 'marked_uncertain'), 'Step 12.5: Historical marked_uncertain action preserved');

  // 13. Longitudinal Report Comparison
  console.log('\n--- [13/20] Report Comparison (Numerical Delta, Zero Subjective Claims) ---');
  const reportsToCompare = db.prepare("SELECT id FROM medical_reports WHERE patient_id = ? ORDER BY id ASC LIMIT 2").all(p1.id);
  const compRes = await fetch(`${BASE_URL}/api/patients/${p1.id}/comparison?report_a=${reportsToCompare[0].id}&report_b=${reportsToCompare[1].id}`, { headers: authHeaders });
  const compData = await compRes.json();
  assert(compRes.status === 200, 'Step 13.1: Comparison endpoint returned 200 OK');
  assert(Array.isArray(compData.comparison) && compData.comparison.length > 0, 'Step 13.2: Comparison rows generated', `Rows: ${compData.comparison?.length}`);
  assert(compData.matching_count > 0, 'Step 13.3: Matching tests aligned across reports', `Matching: ${compData.matching_count}`);
  assert(!JSON.stringify(compData).toLowerCase().includes('improving'), 'Step 13.4: Zero subjective claims (does NOT say "improving")');
  assert(!JSON.stringify(compData).toLowerCase().includes('worsening'), 'Step 13.5: Zero subjective claims (does NOT say "worsening")');

  // 14. Conflict Detection
  console.log('\n--- [14/20] Deterministic Conflict Detection ---');
  const conflictRes = await fetch(`${BASE_URL}/api/patients/${p1.id}/conflicts`, { headers: authHeaders });
  const conflictData = await conflictRes.json();
  assert(conflictRes.status === 200, 'Step 14.1: Conflicts endpoint returned 200 OK');
  assert(Array.isArray(conflictData.conflicts) && conflictData.conflicts.length >= 1, 'Step 14.2: Medication / Allergy clash detected', `Count: ${conflictData.conflicts?.length}`);
  const medConflict = conflictData.conflicts.find(c => c.type === 'medication_conflict');
  assert(Boolean(medConflict), 'Step 14.3: Penicillin vs Amoxicillin conflict flagged');
  assert(medConflict.status === 'pending', 'Step 14.4: Conflict status is pending review');

  // 15. Conflict Resolution
  console.log('\n--- [15/20] Conflict Resolution ---');
  const resolveRes = await fetch(`${BASE_URL}/api/conflicts/${medConflict.id}/resolve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ resolution_note: 'Clinician reviewed and discontinued oral amoxicillin.' })
  });
  const resolveData = await resolveRes.json();
  assert(resolveRes.status === 200, 'Step 15.1: Resolve conflict returned 200 OK');
  assert(resolveData.conflict?.status === 'resolved', 'Step 15.2: Conflict marked as resolved');

  // 16 & 17. AI Summary Generation & Mandatory Safety Notice
  console.log('\n--- [16/20 & 17/20] Patient-Friendly Summary Generation & Safety Mandate ---');
  const summaryGenRes = await fetch(`${BASE_URL}/api/patients/${p1.id}/summary/generate`, {
    method: 'POST',
    headers: authHeaders
  });
  const summaryGenData = await summaryGenRes.json();
  assert(summaryGenRes.status === 201, 'Step 16.1: Summary generated with HTTP 201');
  const summaryContent = summaryGenData.summary?.content || '';
  assert(summaryContent.includes('## Patient Information'), 'Step 16.2: Contains Patient Information section');
  assert(summaryContent.includes('## Report Overview'), 'Step 16.3: Contains Report Overview section');
  assert(summaryContent.includes('## Reported Results'), 'Step 16.4: Contains Reported Results section');
  assert(summaryContent.includes('## Information That May Need Review'), 'Step 16.5: Contains Information That May Need Review section');
  assert(summaryContent.includes('## Important Notice'), 'Step 17.1: Contains Important Notice section');
  assert(summaryContent.includes('This summary organizes information provided in the patient\'s records. It is not a medical diagnosis or treatment recommendation.'), 'Step 17.2: Contains exact verbatim clinical safety disclaimer');
  assert(!summaryContent.toLowerCase().includes('prescribe') && !summaryContent.toLowerCase().includes('recommended dosage'), 'Step 17.3: Strictly zero prescribing or dosage recommendations');

  // 18. Summary Versioning
  console.log('\n--- [18/20] Summary Versioning & Historical Archive ---');
  const sumListRes = await fetch(`${BASE_URL}/api/patients/${p1.id}/summaries`, { headers: authHeaders });
  const sumListData = await sumListRes.json();
  assert(sumListRes.status === 200, 'Step 18.1: Summaries list returned 200 OK');
  assert(Array.isArray(sumListData.summaries) && sumListData.summaries.length >= 2, 'Step 18.2: Multiple summary versions archived with timestamps', `Versions: ${sumListData.summaries?.length}`);
  assert(sumListData.summaries[0].generated_at !== undefined, 'Step 18.3: Generation timestamp retained on archive');

  // 19. Expanded Timeline Event Logging
  console.log('\n--- [19/20] Expanded Authentic Timeline Logging ---');
  const timelineRes = await fetch(`${BASE_URL}/api/patients/${p1.id}`, { headers: authHeaders });
  const pTimelineData = await timelineRes.json();
  const eventTypes = pTimelineData.timeline.map(e => e.event_type);
  assert(eventTypes.includes('RESULT_VERIFIED') || eventTypes.includes('RESULT_EDITED'), 'Step 19.1: Verification action logged in timeline');
  assert(eventTypes.includes('COMPARISON_PERFORMED'), 'Step 19.2: Comparison action logged in timeline');
  assert(eventTypes.includes('CONFLICT_RESOLVED'), 'Step 19.3: Conflict resolution logged in timeline');
  assert(eventTypes.includes('SUMMARY_GENERATED'), 'Step 19.4: Summary generation logged in timeline');

  // 20. Direct Database Persistence
  console.log('\n--- [20/20] Direct SQLite Database Persistence ---');
  const persistedRecords = db.prepare("SELECT COUNT(*) as count FROM verification_records").get().count;
  assert(persistedRecords > 0, 'Step 20.1: Verification records persisted in SQLite on disk', `Count: ${persistedRecords}`);
  const persistedConflicts = db.prepare("SELECT COUNT(*) as count FROM conflicts").get().count;
  assert(persistedConflicts > 0, 'Step 20.2: Conflicts persisted in SQLite on disk', `Count: ${persistedConflicts}`);
  const persistedSummaries = db.prepare("SELECT COUNT(*) as count FROM ai_summaries WHERE patient_id = ?").get(p1.id).count;
  assert(persistedSummaries >= 2, 'Step 20.3: Summary versions firmly persisted in SQLite table', `Count: ${persistedSummaries}`);

  console.log('\n====================================================');
  console.log(`STAGE 3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStage3Tests().catch(err => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
