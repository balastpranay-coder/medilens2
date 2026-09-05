const db = require('./db');
const { recordTimelineEvent } = require('./timeline');

/**
 * Report Comparison Service
 * 
 * Safety Rules:
 * - Compares matching tests across two selected reports strictly numerically.
 * - Displays Test Name, Previous Value/Unit, Current Value/Unit, and Reference Ranges.
 * - NEVER states "Patient is improving" or "Condition is worsening".
 * - Makes ZERO clinical significance claims or interpretations.
 */

function compareReports({ reportAId, reportBId, patientId, userId }) {
  const reportA = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportAId);
  const reportB = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportBId);

  if (!reportA || !reportB) {
    throw new Error('Both reports must exist to perform comparison.');
  }

  // Order chronologically: previous vs current based on report_date or upload_date
  let prevReport = reportA;
  let currReport = reportB;

  const dateA = reportA.report_date || reportA.upload_date || reportA.created_at;
  const dateB = reportB.report_date || reportB.upload_date || reportB.created_at;

  if (dateA > dateB) {
    prevReport = reportB;
    currReport = reportA;
  }

  // Fetch results for both reports
  const prevResults = db.prepare(`
    SELECT * FROM extracted_results WHERE report_id = ? ORDER BY test_name ASC
  `).all(prevReport.id);

  const currResults = db.prepare(`
    SELECT * FROM extracted_results WHERE report_id = ? ORDER BY test_name ASC
  `).all(currReport.id);

  // Map by normalized test name
  const prevMap = new Map();
  prevResults.forEach(r => {
    prevMap.set(r.test_name.toLowerCase().trim(), r);
  });

  const currMap = new Map();
  currResults.forEach(r => {
    currMap.set(r.test_name.toLowerCase().trim(), r);
  });

  // Collect all unique test names
  const allTestKeys = Array.from(new Set([...prevMap.keys(), ...currMap.keys()])).sort();

  const comparisonRows = allTestKeys.map(key => {
    const prevItem = prevMap.get(key);
    const currItem = currMap.get(key);

    const testName = (currItem && currItem.test_name) || (prevItem && prevItem.test_name) || key;
    
    // Previous details
    const prevValue = prevItem ? (prevItem.verified_value || prevItem.value) : 'Not tested';
    const prevUnit = prevItem ? (prevItem.unit || '') : '';
    const prevRange = prevItem ? (prevItem.reference_range || 'Not provided') : '—';
    const prevStatus = prevItem ? prevItem.status : '—';

    // Current details
    const currValue = currItem ? (currItem.verified_value || currItem.value) : 'Not tested';
    const currUnit = currItem ? (currItem.unit || '') : '';
    const currRange = currItem ? (currItem.reference_range || 'Not provided') : '—';
    const currStatus = currItem ? currItem.status : '—';

    // Pure numerical delta if both are numeric (factual only, no diagnostic interpretation)
    let delta = null;
    if (prevItem && currItem) {
      const numPrev = parseFloat(String(prevValue).replace(/[^0-9.-]+/g, ''));
      const numCurr = parseFloat(String(currValue).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(numPrev) && !isNaN(numCurr)) {
        delta = Number((numCurr - numPrev).toFixed(2));
      }
    }

    return {
      test_name: testName,
      previous_value: prevValue,
      previous_unit: prevUnit,
      previous_range: prevRange,
      previous_status: prevStatus,
      current_value: currValue,
      current_unit: currUnit,
      current_range: currRange,
      current_status: currStatus,
      numerical_delta: delta,
      matching: Boolean(prevItem && currItem)
    };
  });

  // Record timeline event
  if (userId) {
    recordTimelineEvent({
      patient_id: patientId || prevReport.patient_id,
      event_type: 'COMPARISON_PERFORMED',
      title: 'Report Comparison Performed',
      description: `Compared "${prevReport.report_title}" (${prevReport.report_date || 'N/A'}) against "${currReport.report_title}" (${currReport.report_date || 'N/A'}). ${comparisonRows.filter(r => r.matching).length} matching tests aligned.`,
      metadata: {
        report_a_id: prevReport.id,
        report_b_id: currReport.id,
        matching_count: comparisonRows.filter(r => r.matching).length
      },
      created_by: userId
    });
  }

  return {
    previous_report: {
      id: prevReport.id,
      title: prevReport.report_title,
      date: prevReport.report_date,
      lab_name: prevReport.lab_name
    },
    current_report: {
      id: currReport.id,
      title: currReport.report_title,
      date: currReport.report_date,
      lab_name: currReport.lab_name
    },
    matching_count: comparisonRows.filter(r => r.matching).length,
    total_tests: comparisonRows.length,
    comparison: comparisonRows,
    notice: 'Factual numerical comparison only. Does not indicate clinical improvement or deterioration.'
  };
}

module.exports = {
  compareReports
};
