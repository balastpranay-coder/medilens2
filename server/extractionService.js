const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const { evaluateReferenceRange } = require('./rangeEvaluator');
const { recordTimelineEvent } = require('./timeline');

/**
 * Text extraction for text-based PDF
 */
async function extractTextFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    let text = '';
    const pdfLib = require('pdf-parse');
    if (typeof pdfLib === 'function') {
      const pdfData = await pdfLib(dataBuffer);
      text = pdfData.text ? pdfData.text.trim() : '';
    } else if (pdfLib.PDFParse) {
      const parser = new pdfLib.PDFParse({ data: dataBuffer });
      const parsed = await parser.getText();
      text = (parsed.text || (parsed.pages && parsed.pages.map(p => p.text).join('\n')) || '').trim();
      if (parser.destroy) await parser.destroy();
    } else if (pdfLib.default && typeof pdfLib.default === 'function') {
      const pdfData = await pdfLib.default(dataBuffer);
      text = pdfData.text ? pdfData.text.trim() : '';
    }
    return { success: true, text };
  } catch (err) {
    console.error('PDF extraction error:', err);
    return { success: false, error: 'Failed to extract text from PDF: ' + err.message };
  }
}

/**
 * OCR text extraction for image files (PNG, JPG, JPEG) using local Tesseract worker
 */
async function extractTextFromImage(filePath) {
  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    const text = ret.data.text ? ret.data.text.trim() : '';
    return { success: true, text };
  } catch (err) {
    console.error('OCR extraction error:', err);
    return { success: false, error: 'OCR processing error: ' + err.message };
  }
}

/**
 * Deterministic Regex Parser for standard laboratory report line patterns.
 * Extracts ONLY tests that actually appear verbatim in the uploaded document.
 * Never invents facts, ranges, or clinical interpretations.
 */
function parseLabTextDeterministically(text) {
  if (!text) return [];
  const results = [];
  const lines = text.split(/\r?\n/);

  // Common clinical lab patterns:
  // e.g.: "Hemoglobin: 13.2 g/dL (Reference Range: 12.0–16.0 g/dL)"
  // e.g.: "Glucose: 118 mg/dL [Reference: 70-100 mg/dL]"
  // e.g.: "Platelet Count: 230 K/uL (Reference Range: 150-450 K/uL)"
  // e.g.: "eGFR: >60 mL/min (Reference Range: Not provided)"
  // e.g.: "Sodium  138  mEq/L  135-145"
  const regexPattern = /(?:^|[\r\n])\s*[-•*]?\s*([A-Za-z0-9\s/()]+?)\s*[:\t]\s*([><=]?\s*[0-9]+(?:\.[0-9]+)?)\s*([A-Za-z/%]+)?\s*(?:[([][A-Za-z\s]*:?\s*([^\])]*)[\])]|\s+([0-9]+(?:\.[0-9]+)?\s*[-–—to]\s*[0-9]+(?:\.[0-9]+)?))?/g;

  let match;
  while ((match = regexPattern.exec(text)) !== null) {
    const rawTestName = match[1]?.trim();
    const rawValue = match[2]?.trim();
    const rawUnit = match[3]?.trim() || null;
    let rawRange = match[4]?.trim() || match[5]?.trim() || null;

    if (!rawTestName || !rawValue) continue;
    // Filter out metadata and non-test headers
    const lowerName = rawTestName.toLowerCase();
    if ([
      'patient id', 'patient identifier', 'date', 'report date', 'collection date', 
      'technique', 'findings', 'conclusion', 'age', 'sex', 'dob', 'status',
      'specimen', 'physician', 'doctor', 'lab name', 'phone', 'address'
    ].some(header => lowerName.includes(header))) {
      continue;
    }

    const snippet = match[0].trim().replace(/^[-•*]\s*/, '');
    const evalResult = evaluateReferenceRange(rawValue, rawRange);

    results.push({
      test_name: rawTestName,
      value: rawValue,
      unit: rawUnit,
      reference_range: evalResult.reference_range,
      status: evalResult.status,
      observation: null,
      confidence_score: 92,
      source_snippet: snippet
    });
  }

  return results;
}

/**
 * Structured AI extraction using external AI model (Gemini or OpenAI)
 * Requires strict JSON format and strictly forbids hallucinations.
 */
async function extractWithAI({ text, filePath, mimeType }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      error: 'AI Extraction API is not configured (GEMINI_API_KEY missing in .env).'
    };
  }

  // System prompt enforcing strict clinical safety rules
  const systemPrompt = `You are an automated clinical laboratory report parser for MedLens.
Your task is to extract only the laboratory and medical test results actually present in the provided document into a structured JSON array.

MANDATORY SAFETY & ACCURACY RULES:
1. Extract ONLY tests and values that explicitly appear in the document.
2. NEVER invent test names, values, units, or reference ranges.
3. If a reference range is present for a test, extract it verbatim as "reference_range".
4. If a test does NOT have a reference range in the report, you MUST set "reference_range": null.
5. NEVER diagnose disease, prescribe medicine, recommend dosage, or determine if a value is high/normal/low.
6. Provide the exact excerpt from the document as "source_snippet".
7. Assign an extraction confidence score (0-100) reflecting text/OCR clarity only.

Output JSON format (array of objects):
[
  {
    "test_name": "Test Name",
    "value": "Numeric or qualitative value",
    "unit": "Unit string or null",
    "reference_range": "Exact reference range or null if not provided",
    "report_date": "YYYY-MM-DD or date string if present, else null",
    "observation": null,
    "confidence": 95,
    "source_snippet": "Exact text line from document"
  }
]`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const aiModel = process.env.AI_MODEL || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const parts = [{ text: systemPrompt }];

      // If document text is available, include it
      if (text && text.trim().length > 0) {
        parts.push({ text: `DOCUMENT TEXT:\n${text}` });
      }

      // If file exists on disk, attach multimodal payload (for scanned PDFs or images)
      if (filePath && fs.existsSync(filePath) && mimeType) {
        const fileBuffer = fs.readFileSync(filePath);
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileBuffer.toString('base64')
          }
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API returned error:', response.status, errText);
        return { configured: true, error: `Gemini API error (HTTP ${response.status}): ${errText}` };
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        return { configured: true, error: 'AI model returned empty response.' };
      }

      const parsed = JSON.parse(content);
      return { configured: true, results: parsed };
    }

    if (process.env.OPENAI_API_KEY) {
      const url = 'https://api.openai.com/v1/chat/completions';
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `DOCUMENT TEXT:\n${text || 'No text extracted; check document.'}` }
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return { configured: true, error: `OpenAI API error: ${errText}` };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);
      const results = Array.isArray(parsed) ? parsed : (parsed.results || parsed.tests || []);
      return { configured: true, results };
    }
  } catch (err) {
    console.error('AI Extraction error:', err);
    return { configured: true, error: 'AI Processing Error: ' + err.message };
  }

  return { configured: false, error: 'AI provider not configured.' };
}

/**
 * Main Report Processing Pipeline
 * Flow: UPLOAD -> TEXT EXTRACTION / OCR -> STRUCTURED EXTRACTION -> RANGE EVALUATION -> SAVE -> READY FOR HUMAN VERIFICATION
 * Strictly NO fake data fallback.
 */
async function processReport(reportId, userId) {
  const report = db.prepare('SELECT * FROM medical_reports WHERE id = ?').get(reportId);
  if (!report) {
    throw new Error('Report not found');
  }

  // Update status to 'processing'
  db.prepare(`
    UPDATE medical_reports 
    SET processing_status = 'processing', error_message = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(reportId);

  let rawText = report.raw_text || '';
  const filePath = report.file_path;
  const fileType = report.file_type || 'application/pdf';
  let fileSize = 0;
  let ocrUsed = 0;

  // 1. Text extraction step
  if (filePath && fs.existsSync(filePath)) {
    try {
      fileSize = fs.statSync(filePath).size;
    } catch (e) {}

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      const pdfRes = await extractTextFromPdf(filePath);
      if (pdfRes.success && pdfRes.text && pdfRes.text.trim().length > 15) {
        rawText = pdfRes.text;
        ocrUsed = 0;
      } else {
        // Scanned PDF requiring OCR / Multimodal AI
        ocrUsed = 1;
        console.log('[MedLens] PDF has no selectable text. Scanned document requires vision / OCR.');
      }
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      ocrUsed = 1;
      const ocrRes = await extractTextFromImage(filePath);
      if (ocrRes.success && ocrRes.text) {
        rawText = ocrRes.text;
      }
    }
  }

  // Save extracted raw_text if present
  if (rawText) {
    db.prepare('UPDATE medical_reports SET raw_text = ?, file_size = ?, ocr_used = ? WHERE id = ?').run(rawText, fileSize, ocrUsed, reportId);
  }

  // 2. Structured Extraction step
  let extractedItems = [];
  const hasAiKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

  if (hasAiKey) {
    try {
      const aiRes = await extractWithAI({ text: rawText, filePath, mimeType: fileType });
      if (aiRes.configured && Array.isArray(aiRes.results) && aiRes.results.length > 0) {
        extractedItems = aiRes.results;
      } else {
        console.log('[MedLens] AI extraction yielded no results or network error. Using deterministic parser on source document text.');
      }
    } catch (e) {
      console.log('[MedLens] AI extraction exception:', e.message);
    }
  }

  // If AI key was not set, failed, or returned empty, attempt deterministic regex parser on real document text
  if (extractedItems.length === 0 && rawText) {
    const deterministicItems = parseLabTextDeterministically(rawText);
    if (deterministicItems.length > 0) {
      extractedItems = deterministicItems;
    }
  }

  // If still no items extracted:
  if (extractedItems.length === 0) {
    const errorMsg = 'Report processing failed. Please check your OCR/AI configuration.';

    db.prepare(`
      UPDATE medical_reports 
      SET processing_status = 'failed', error_message = ?, file_size = ?, ocr_used = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(errorMsg, fileSize, ocrUsed, reportId);

    return { success: false, error: errorMsg };
  }

  // 3. Deterministic Validation & Range Classification (rangeEvaluator)
  // Delete previous extracted items if retrying
  db.prepare('DELETE FROM extracted_results WHERE report_id = ?').run(reportId);

  const insertItemStmt = db.prepare(`
    INSERT INTO extracted_results (
      report_id, test_name, value, unit, reference_range, status, observation, confidence_score, source_snippet, verified, report_date, provenance, page_number, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'AI Extracted', ?, datetime('now'))
  `);

  for (const item of extractedItems) {
    const testName = item.test_name || 'Laboratory Test';
    const val = String(item.value || '').trim();
    const unit = item.unit ? String(item.unit).trim() : null;
    const rawRange = item.reference_range ? String(item.reference_range).trim() : null;
    const observation = item.observation ? String(item.observation).trim() : null;
    const confidence = item.confidence !== undefined ? parseInt(item.confidence, 10) : (item.confidence_score !== undefined ? parseInt(item.confidence_score, 10) : 90);
    const snippet = item.source_snippet ? String(item.source_snippet).trim() : `${testName}: ${val} ${unit || ''}`;
    const reportDate = item.report_date || report.report_date || null;
    const pageNumber = item.page_number ? parseInt(item.page_number, 10) : 1;

    // Run deterministic rangeEvaluator (never lets AI decide Low/Normal/High)
    const evalResult = evaluateReferenceRange(val, rawRange);

    insertItemStmt.run(
      reportId,
      testName,
      val,
      unit,
      evalResult.reference_range, // NULL if not provided in report
      evalResult.status,          // 'normal', 'high', 'low', 'unknown'
      observation,
      Math.min(100, Math.max(0, confidence)),
      snippet,
      reportDate,
      pageNumber
    );
  }

  // 4. Update report status to 'extracted' and 'pending' verification
  db.prepare(`
    UPDATE medical_reports 
    SET processing_status = 'extracted', verification_status = 'pending', status = 'PROCESSED',
        file_size = ?, ocr_used = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(fileSize, ocrUsed, reportId);

  // 5. Record authentic timeline event
  recordTimelineEvent({
    patient_id: report.patient_id,
    event_type: 'REPORT_PROCESSED',
    title: 'Report Structured Extraction Complete',
    description: `Extracted ${extractedItems.length} laboratory test items with source citations and deterministic range evaluations.`,
    metadata: { report_id: reportId, extracted_count: extractedItems.length },
    created_by: userId
  });

  return { success: true, count: extractedItems.length };
}

module.exports = {
  extractTextFromPdf,
  extractTextFromImage,
  extractWithAI,
  parseLabTextDeterministically,
  processReport
};
