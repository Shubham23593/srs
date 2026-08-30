/**
 * Phase 3 — Language Detection.
 * Detects English, Hindi (Devanagari), Marathi (Devanagari + markers),
 * Hinglish (romanized Hindi), and Mixed-language input.
 *
 * Output language for all requirements/SRS is always English; detection only
 * informs understanding and the final language guard.
 */

const {
  DEVANAGARI, LATIN,
  MARATHI_DEV_MARKERS, MARATHI_ROMAN_MARKERS,
  HINGLISH_MARKERS
} = require('./lexicon');

function countMatches(text, markers) {
  let hits = 0;
  const lower = text.toLowerCase();
  for (const m of markers) {
    if (m.length <= 4) {
      // short tokens must match on word boundaries AND not be preceded/followed
      // by letters that would make them part of an English word.
      const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(lower)) hits++;
    } else if (lower.includes(m.toLowerCase())) {
      hits++;
    }
  }
  return hits;
}

// Distinctive, non-ambiguous Hinglish function words (never plain English).
const STRONG_HINGLISH = [
  'chahiye', 'chahie', 'karna', 'karega', 'hoga', 'banana', 'hona', 'kaise',
  'jisme', 'apne', 'apna', 'apni', 'sakta', 'sakti', 'sakte', 'wala', 'wali',
  'karo', 'hota', 'hoti', 'rahega', 'nahi', 'nahin', 'mujhe', 'muje', 'ko ',
  'dekhna', 'karni', 'karte', 'karti', 'karta', 'honi', 'dikhana', 'lagana',
  'rakhna', 'dena', 'lena', 'bhej', 'chahida', 'karein', 'hai', 'hain', 'hun'
];

function strongHinglishHits(text) {
  return countMatches(text, STRONG_HINGLISH);
}

function detectLanguage(text = '') {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { language: 'Unknown', confidence: 0, scripts: {} };
  }

  const hasDevanagari = DEVANAGARI.test(text);
  const hasLatin = LATIN.test(text);

  const devChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinWords = (text.match(/[A-Za-z]+/g) || []).length;

  const marathiDevHits = countMatches(text, MARATHI_DEV_MARKERS);
  const marathiRomHits = countMatches(text, MARATHI_ROMAN_MARKERS);
  const hinglishHits = countMatches(text, HINGLISH_MARKERS);

  const scripts = { devanagari: devChars, latinWords };

  // Mixed script: Devanagari + substantial Latin words in the same utterance
  const mixedScript = hasDevanagari && hasLatin && latinWords >= 1;
  // Two romanized Indic languages at once
  const mixedRoman = marathiRomHits > 0 && hinglishHits > 0 && marathiRomHits >= 1;

  if (hasDevanagari) {
    if (marathiDevHits >= 2 && marathiDevHits > 0) {
      return { language: mixedScript ? 'Mixed' : 'Marathi', confidence: 0.8, scripts, markers: { marathiDevHits, hinglishHits } };
    }
    // Devanagari defaults to Hindi unless strong Marathi markers
    if (marathiDevHits >= 1 && /पाहिजे|शकतो|शकते|नाही|वापरकर्ता|प्रणाली/.test(text)) {
      return { language: mixedScript ? 'Mixed' : 'Marathi', confidence: 0.75, scripts, markers: { marathiDevHits, hinglishHits } };
    }
    return { language: mixedScript ? 'Mixed' : 'Hindi', confidence: 0.85, scripts, markers: { marathiDevHits, hinglishHits } };
  }

  // Latin script — rely on DISTINCTIVE Indic function words, not generic
  // English verbs, to avoid false positives.
  const strongHinglish = strongHinglishHits(text);

  // Mixed romanized languages: both Marathi-specific markers AND Hindi/Hinglish
  // function words appear in the same utterance (plus English words).
  if (marathiRomHits >= 1 && strongHinglish >= 2 && latinWords >= 2) {
    return { language: 'Mixed', confidence: 0.7, scripts, markers: { marathiRomHits, hinglishHits: strongHinglish } };
  }

  if (marathiRomHits >= 2 && marathiRomHits >= strongHinglish) {
    return { language: 'Marathi', confidence: 0.72, scripts, markers: { marathiRomHits, hinglishHits: strongHinglish } };
  }
  if (strongHinglish >= 2) {
    return { language: 'Hinglish', confidence: 0.82, scripts, markers: { marathiRomHits, hinglishHits: strongHinglish } };
  }
  // A single strong Marathi marker like "pahije/shakto" is a reliable signal
  if (marathiRomHits >= 1 && /pahije|pahijet|shakto|shakte|karu shakto|karta ale/i.test(text)) {
    return { language: 'Marathi', confidence: 0.66, scripts, markers: { marathiRomHits, hinglishHits: strongHinglish } };
  }
  if (strongHinglish === 1) {
    return { language: 'Hinglish', confidence: 0.6, scripts, markers: { marathiRomHits, hinglishHits: strongHinglish } };
  }

  return { language: 'English', confidence: 0.92, scripts, markers: { marathiRomHits, hinglishHits: strongHinglish } };
}

/**
 * Final language guard (Phase 18).
 * Returns true if text contains Indic-script or romanized Indic conversational
 * markers that must never appear in English SRS/requirement output.
 */
function containsNonEnglishContent(text = '') {
  if (!text || typeof text !== 'string') return false;
  if (DEVANAGARI.test(text)) return true;

  const lower = text.toLowerCase();
  // Strong Hinglish/Marathi romanized markers that would not appear in formal English
  const strongMarkers = [
    'chahiye', 'chahie', 'karna hai', 'karna chahiye', 'hona chahiye', 'sakta hai',
    'sakti hai', 'sakte hain', 'mujhe', 'pahije', 'pahijet', 'shakto', 'shakte',
    'karu shakto', 'karta ale', 'baghta ali', 'nahi hai', 'nahin hai', 'karo',
    'dekhna hai', 'karni hai', 'wala hai', 'wali hai', 'mein chahiye', 'ko chahiye'
  ];
  return strongMarkers.some((m) => lower.includes(m));
}

module.exports = { detectLanguage, containsNonEnglishContent };
