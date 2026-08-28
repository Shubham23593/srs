/**
 * ISO/IEC/IEEE 29148 Requirement Statement Grammar and Quality Normalizer
 */

function cleanDuplicatedWords(text) {
  if (!text) return '';
  // Remove consecutive duplicate words like "the the", "shall shall", "system system"
  return text.replace(/\b(\w+)\s+\1\b/gi, '$1');
}

/**
 * Standardize verb-forms and fix English grammatical quirks in requirement actions
 */
function fixVerbPhrases(text) {
  if (!text) return '';
  let fixed = text;

  // Correct noun-to-verb phrase errors (e.g. "allow users to login" -> "allow users to log in")
  fixed = fixed.replace(/\b(to|shall|can|must|will)\s+login\b/gi, '$1 log in');
  fixed = fixed.replace(/\b(to|shall|can|must|will)\s+signin\b/gi, '$1 sign in');
  fixed = fixed.replace(/\b(to|shall|can|must|will)\s+logout\b/gi, '$1 log out');
  fixed = fixed.replace(/\b(to|shall|can|must|will)\s+signout\b/gi, '$1 sign out');
  fixed = fixed.replace(/\b(to|shall|can|must|will)\s+setup\b/gi, '$1 set up');
  fixed = fixed.replace(/\b(to|shall|can|must|will)\s+backup\b/gi, '$1 back up');

  // Trailing verb corrections
  fixed = fixed.replace(/\bto\s+log\s*in(?=[.\s]|$)/gi, 'to log in');
  fixed = fixed.replace(/\bto\s+login(?=[.\s]|$)/gi, 'to log in');

  return fixed;
}

function normalizeRequirementStatement(statement) {
  if (!statement || typeof statement !== 'string') {
    return 'The system shall execute baseline system transactions.';
  }

  let text = statement.trim();

  // 1. Remove malformed doubled AI prefixes at the start
  text = text.replace(/^(the\s+(system|platform|application|software)\s+shall\s+)+/gi, '');
  text = text.replace(/^(the\s+(platform|application|software)\s+shall\s+)+/gi, '');

  // 2. Remove internal nested "the platform shall", "the system shall" phrases
  text = text.replace(/\bthe\s+(platform|system|application|software)\s+shall\s+/gi, '');
  text = text.replace(/\bthe\s+(platform|system|application|software)\s+must\s+/gi, '');

  // 3. Remove chained redundant verbs like "allow support", "support allow", "enable support"
  text = text.replace(/\b(allow|support|enable)\s+(allow|support|enable|provide)\b/gi, '$1');

  // 4. If text starts with actor "Students shall...", "Users shall...", "Administrators shall..."
  const actorMatch = text.match(/^(students|users|administrators|operators|clients|members)\s+shall\s+(.*)/i);
  if (actorMatch) {
    const actor = actorMatch[1].toLowerCase();
    const action = actorMatch[2].trim();
    text = `allow ${actor} to ${action.charAt(0).toLowerCase() + action.slice(1)}`;
  } else {
    text = text.charAt(0).toLowerCase() + text.slice(1);
  }

  // 5. Correct verb phrases (e.g. "to login" -> "to log in")
  text = fixVerbPhrases(text);

  // 6. Clean duplicated consecutive words
  text = cleanDuplicatedWords(text);

  // 7. Assemble clean ISO/IEC/IEEE 29148 "The system shall [action]" statement
  let finalStatement = `The system shall ${text.trim()}`;

  // 8. Clean any residual repeated phrases
  finalStatement = finalStatement.replace(/The system shall the system shall/gi, 'The system shall');
  finalStatement = finalStatement.replace(/The system shall the platform shall/gi, 'The system shall');
  finalStatement = fixVerbPhrases(finalStatement);
  finalStatement = cleanDuplicatedWords(finalStatement);

  // 9. Ensure single trailing period
  finalStatement = finalStatement.replace(/[.\s]+$/, '') + '.';

  return finalStatement;
}

function validateRequirementStatementQuality(statement) {
  const issues = [];
  if (!statement || typeof statement !== 'string' || statement.trim().length === 0) {
    return {
      isValid: false,
      needsClarification: true,
      issues: ['Requirement statement is empty.'],
      normalizedStatement: 'The system shall execute baseline system transactions.',
      clarificationQuestion: 'What specific system capability or operation should be supported?'
    };
  }

  const normalized = normalizeRequirementStatement(statement);

  if (!/shall|must/i.test(normalized)) {
    issues.push('Requirement lacks formal normative verb ("shall").');
  }

  const words = normalized.trim().split(/\s+/);
  if (words.length < 4) {
    issues.push('Requirement statement is underspecified (fewer than 4 words).');
  }

  const vagueTerms = ['fast', 'user-friendly', 'flexible', 'robust', 'seamless', 'efficient', 'optimal', 'scalable', 'easy to use', 'as needed', 'etc'];
  const foundVague = vagueTerms.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(normalized));
  
  let needsClarification = false;
  let clarificationQuestion = null;

  if (foundVague.length > 0) {
    issues.push(`Contains non-measurable qualitative terms: ${foundVague.join(', ')}.`);
    needsClarification = true;
    clarificationQuestion = `Could you clarify the measurable target or specific benchmark for "${foundVague[0]}"?`;
  }

  return {
    isValid: issues.length === 0,
    needsClarification,
    clarificationQuestion,
    issues,
    normalizedStatement: normalized
  };
}

module.exports = {
  normalizeRequirementStatement,
  validateRequirementStatementQuality,
  cleanDuplicatedWords,
  fixVerbPhrases
};
