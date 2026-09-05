/**
 * Deterministic Reference-Range Evaluator
 * 
 * Logic specified:
 * - IF reference_range is NULL or empty or 'not provided': status = "unknown", reference_range = null
 * - Parse numeric lower_limit and upper_limit from report's reference_range string
 * - IF value < lower_limit: status = "low"
 * - ELSE IF value > upper_limit: status = "high"
 * - ELSE: status = "normal"
 * - If reference_range is textual/non-numeric and cannot be safely evaluated: status = "unknown"
 * - Do NOT use medical knowledge DB to invent ranges.
 * - Keep original reference range text verbatim.
 */

function evaluateReferenceRange(rawValue, rawRange) {
  // 1. Check if range is null or unprovided
  if (!rawRange || typeof rawRange !== 'string') {
    return {
      status: 'unknown',
      reference_range: null
    };
  }

  const cleanRange = rawRange.trim();
  const lowerRange = cleanRange.toLowerCase();

  if (
    lowerRange === '' ||
    lowerRange === 'null' ||
    lowerRange === 'none' ||
    lowerRange === 'not provided' ||
    lowerRange === 'n/a' ||
    lowerRange === 'unknown'
  ) {
    return {
      status: 'unknown',
      reference_range: null
    };
  }

  // 2. Parse numeric value
  if (rawValue === null || rawValue === undefined) {
    return {
      status: 'unknown',
      reference_range: cleanRange
    };
  }

  const valStr = String(rawValue).trim().replace(/,/g, '');
  // Extract first numeric floating point value (supports decimals, e.g. "13.2", "118", ">60" -> 60)
  const numMatch = valStr.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numMatch) {
    // Non-numeric value cannot be safely evaluated numerically
    return {
      status: 'unknown',
      reference_range: cleanRange
    };
  }
  const numericVal = parseFloat(numMatch[0]);

  // 3. Attempt to match range patterns

  // Pattern A: "12.0 - 16.0", "12.0–16.0" (en-dash), "12.0 to 16.0", "70 - 100", "0.70-1.30"
  const rangeMatch = cleanRange.match(/([0-9]*\.?[0-9]+)\s*(?:-|–|—|to)\s*([0-9]*\.?[0-9]+)/i);
  if (rangeMatch) {
    const lowerLimit = parseFloat(rangeMatch[1]);
    const upperLimit = parseFloat(rangeMatch[2]);

    if (!isNaN(lowerLimit) && !isNaN(upperLimit)) {
      if (numericVal < lowerLimit) {
        return { status: 'low', reference_range: cleanRange };
      } else if (numericVal > upperLimit) {
        return { status: 'high', reference_range: cleanRange };
      } else {
        return { status: 'normal', reference_range: cleanRange };
      }
    }
  }

  // Pattern B: "< 100", "<= 5.7", "<5.7%", "less than 100"
  const upperOnlyMatch = cleanRange.match(/(?:<|<=|less\s+than)\s*([0-9]*\.?[0-9]+)/i);
  if (upperOnlyMatch) {
    const upperLimit = parseFloat(upperOnlyMatch[1]);
    if (!isNaN(upperLimit)) {
      if (numericVal > upperLimit) {
        return { status: 'high', reference_range: cleanRange };
      } else {
        return { status: 'normal', reference_range: cleanRange };
      }
    }
  }

  // Pattern C: "> 60", ">= 40", "greater than 60"
  const lowerOnlyMatch = cleanRange.match(/(?:>|>=|greater\s+than)\s*([0-9]*\.?[0-9]+)/i);
  if (lowerOnlyMatch) {
    const lowerLimit = parseFloat(lowerOnlyMatch[1]);
    if (!isNaN(lowerLimit)) {
      if (numericVal < lowerLimit) {
        return { status: 'low', reference_range: cleanRange };
      } else {
        return { status: 'normal', reference_range: cleanRange };
      }
    }
  }

  // If textual / non-numeric reference range that cannot be safely evaluated:
  // status = "unknown"
  return {
    status: 'unknown',
    reference_range: cleanRange
  };
}

module.exports = {
  evaluateReferenceRange
};
