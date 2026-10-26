import type { GenericConfig, Parser } from './engine';

export type ValidationErrorCode =
  | 'PARSER_NOT_OBJECT'
  | 'GENERIC_NOT_OBJECT'
  | 'UNKNOWN_FIELD'
  | 'BAD_SCHEMA_VERSION'
  | 'BAD_ID'
  | 'BAD_NAME'
  | 'BAD_VERSION'
  | 'BAD_OPTIONAL_TEXT'
  | 'BAD_APP_LIST'
  | 'BAD_APP_LIST_ENTRY'
  | 'DUPLICATE_APP'
  | 'RULES_REQUIRED'
  | 'BAD_RULE'
  | 'BAD_RULE_ID'
  | 'BAD_PRIORITY'
  | 'BAD_DIRECTION'
  | 'BAD_CONFIDENCE'
  | 'MATCH_REQUIRED'
  | 'MISSING_AMOUNT'
  | 'MISSING_AMOUNT_GROUP'
  | 'MISSING_GROUP'
  | 'BAD_EXTRACTION_SOURCE'
  | 'BAD_PATTERN_LIST'
  | 'AMOUNT_PATTERNS_REQUIRED'
  | 'BAD_KEYWORD_LIST'
  | 'BAD_KEYWORD'
  | 'BAD_COUNTERPARTY_PATTERNS'
  | 'REGEX_EMPTY'
  | 'REGEX_TOO_LONG'
  | 'REGEX_LOOKBEHIND'
  | 'REGEX_UNSUPPORTED_SYNTAX'
  | 'REGEX_NESTED_QUANTIFIER'
  | 'REGEX_AMBIGUOUS_ALTERNATIVES'
  | 'REGEX_ADJACENT_QUANTIFIER'
  | 'REGEX_GROUP_BOUNDARY_QUANTIFIER'
  | 'REGEX_LEADING_GREEDY'
  | 'REGEX_INVALID'
  | 'JSON_TOO_LARGE'
  | 'JSON_DEPTH_EXCEEDED'
  | 'VALIDATION_ERROR';

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
}

export type ParserValidationResult =
  | { ok: true; parser: Parser }
  | { ok: false; errors: ValidationError[] };
export type GenericValidationResult =
  | { ok: true; generic: GenericConfig }
  | { ok: false; errors: ValidationError[] };

const parserFields = new Set([
  'schemaVersion',
  'id',
  'name',
  'version',
  'author',
  'description',
  'androidPackages',
  'iosAppNames',
  'rules',
]);
const ruleFields = new Set(['id', 'priority', 'match', 'direction', 'confidence', 'extract']);
const genericFields = new Set([
  'amountPatterns',
  'debitKeywords',
  'creditKeywords',
  'counterpartyPatterns',
  'referencePatterns',
]);
const parserIdPattern = /^[a-z][a-z0-9_-]*$/;
const ruleIdPattern = /^[a-z][a-z0-9_-]*\.[a-z0-9-]+\.v[0-9]+$/;

export function validateParser(json: unknown): ParserValidationResult {
  if (!isRecord(json)) {
    return failure(['The parser must be a JSON object containing parser details and rules.']);
  }
  const limitError = checkJsonLimits(json);
  if (limitError) return failure([limitError.message], limitError.code);

  const errors: string[] = [];
  checkUnknownFields(json, parserFields, 'The parser', errors);
  if (json.schemaVersion !== 1) errors.push('The schemaVersion must be 1.');
  validateParserId(json.id, errors);
  validateRequiredText(json.name, 'name', 'The parser name', errors);
  if (!Number.isInteger(json.version) || (json.version as number) < 1) {
    errors.push('The version must be a whole number of 1 or more.');
  }
  validateOptionalText(json.author, 'author', errors);
  validateOptionalText(json.description, 'description', errors);
  validateStringList(json.androidPackages, 'androidPackages', errors);
  validateStringList(json.iosAppNames, 'iosAppNames', errors);

  if (!Array.isArray(json.rules) || json.rules.length === 0) {
    errors.push('Add at least one rule in the rules list.');
  } else {
    json.rules.forEach((rule, index) => validateRule(rule, index, errors));
  }

  return errors.length > 0 ? failure(errors) : { ok: true, parser: json as unknown as Parser };
}

export function validateGeneric(json: unknown): GenericValidationResult {
  if (!isRecord(json)) {
    return failure(['The generic parser config must be a JSON object.']);
  }
  const limitError = checkJsonLimits(json);
  if (limitError) return failure([limitError.message], limitError.code);

  const errors: string[] = [];
  checkUnknownFields(json, genericFields, 'The generic config', errors);
  validatePatternList(json.amountPatterns, 'Amount pattern', 'amount', errors, true);
  validateKeywords(json.debitKeywords, 'Debit', errors);
  validateKeywords(json.creditKeywords, 'Credit', errors);
  validatePatternList(json.referencePatterns, 'Reference pattern', 'reference', errors);

  if (!isRecord(json.counterpartyPatterns)) {
    errors.push('Add incoming and outgoing counterparty pattern lists.');
  } else {
    checkUnknownFields(
      json.counterpartyPatterns,
      new Set(['in', 'out']),
      'Counterparty patterns',
      errors,
    );
    validatePatternList(
      json.counterpartyPatterns.in,
      'Incoming counterparty pattern',
      'counterparty',
      errors,
    );
    validatePatternList(
      json.counterpartyPatterns.out,
      'Outgoing counterparty pattern',
      'counterparty',
      errors,
    );
  }

  return errors.length > 0 ? failure(errors) : { ok: true, generic: json as unknown as GenericConfig };
}

function validateParserId(value: unknown, errors: string[]): void {
  if (typeof value !== 'string') {
    errors.push('Add an id using lowercase letters, numbers, - and _.');
  } else if (!parserIdPattern.test(value)) {
    errors.push(`The id '${value}' can only use lowercase letters, numbers, - and _`);
  }
}

function validateRule(value: unknown, index: number, errors: string[]): void {
  const number = index + 1;
  if (!isRecord(value)) {
    errors.push(`Rule ${number}: each rule must be a JSON object.`);
    return;
  }

  const id = typeof value.id === 'string' && value.id ? value.id : null;
  const label = `Rule ${number}${id ? ` (${id})` : ''}`;
  checkUnknownFields(value, ruleFields, label, errors);
  if (typeof value.id !== 'string' || !ruleIdPattern.test(value.id)) {
    errors.push(`${label}: the rule id must look like 'touchngo.received.v1'.`);
  }
  if (!Number.isInteger(value.priority)) {
    errors.push(`${label}: the priority must be a whole number.`);
  }
  if (value.direction !== 'in' && value.direction !== 'out' && value.direction !== 'info') {
    errors.push(`${label}: the direction must be in, out or info.`);
  }
  if (value.confidence !== undefined && value.confidence !== 'high' && value.confidence !== 'none') {
    errors.push(`${label}: the confidence must be high or none.`);
  }
  validateMatch(value.match, label, errors);
  validateExtract(value, label, errors);
}

function validateMatch(value: unknown, label: string, errors: string[]): void {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    errors.push(`${label}: add a title or body match pattern.`);
    return;
  }
  checkUnknownFields(value, new Set(['title', 'body']), `${label} match`, errors);
  for (const field of ['title', 'body'] as const) {
    if (value[field] !== undefined) {
      validatePattern(value[field], `${label}: the ${field} match pattern`, undefined, errors);
    }
  }
}

function validateExtract(rule: Record<string, unknown>, label: string, errors: string[]): void {
  const needsAmount = rule.direction === 'in' || rule.direction === 'out';
  if (!isRecord(rule.extract)) {
    if (needsAmount) errors.push(`${label}: add an amount extraction pattern.`);
    return;
  }
  checkUnknownFields(
    rule.extract,
    new Set(['amount', 'counterparty', 'reference']),
    `${label} extraction`,
    errors,
  );
  if (needsAmount && rule.extract.amount === undefined) {
    errors.push(`${label}: the amount pattern needs a named group (?<amount>…)`);
  }
  for (const field of ['amount', 'counterparty', 'reference'] as const) {
    if (rule.extract[field] !== undefined) {
      validateExtraction(rule.extract[field], `${label}: the ${field} pattern`, field, errors);
    }
  }
}

function validateExtraction(
  value: unknown,
  label: string,
  group: string,
  errors: string[],
): void {
  if (!isRecord(value)) {
    validatePattern(value, label, group, errors);
    return;
  }
  checkUnknownFields(value, new Set(['pattern', 'source']), `${label} extraction`, errors);
  if (
    value.source !== undefined &&
    value.source !== 'body' &&
    value.source !== 'title' &&
    value.source !== 'bodyThenTitle'
  ) {
    errors.push(`${label} source must be body, title or bodyThenTitle.`);
  }
  validatePattern(value.pattern, label, group, errors);
}

function validatePatternList(
  value: unknown,
  label: string,
  group: 'amount' | 'counterparty' | 'reference',
  errors: string[],
  requireOne = false,
): void {
  if (!Array.isArray(value)) {
    errors.push(`${label} entries must be a list.`);
    return;
  }
  if (requireOne && value.length === 0) {
    errors.push(`Add at least one ${label.toLowerCase()}.`);
    return;
  }
  value.forEach((pattern, index) => {
    validatePattern(pattern, `${label} ${index + 1}`, group, errors);
  });
}

function validatePattern(
  value: unknown,
  label: string,
  group: string | undefined,
  errors: string[],
): void {
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${label} must be non-empty text.`);
    return;
  }
  if (value.length > 4000) {
    errors.push(`${label} exceeds 4,000 characters.`);
    return;
  }
  if (group && !value.includes(`(?<${group}>`)) {
    errors.push(`${label} needs a named group (?<${group}>…)`);
  }

  const unsupported = unsupportedSyntax(value);
  if (unsupported) {
    errors.push(`${label} uses ${unsupported}, which PayPing parsers do not support.`);
  }
  const readableLabel = label.replace(/^(Rule \d+) \([^)]*\):/, '$1:');
  if (hasNestedQuantifier(value)) {
    errors.push(
      `${readableLabel} repeats a repeating part (like (a+)+). This can freeze the app. Simplify it.`,
    );
  }
  const repetitionProblem = hasAdjacentRepetition(value);
  if (repetitionProblem === 'adjacent') {
    errors.push(
      `${readableLabel} places repeated patterns next to each other. This can freeze the app. Simplify it.`,
    );
  }
  if (repetitionProblem === 'group') {
    errors.push(
      `${readableLabel} repeats across a group boundary. This can freeze the app. Simplify it.`,
    );
  }
  if (hasLeadingAttackRepetition(value)) {
    errors.push(
      `${readableLabel} starts with a greedy repeating pattern. This can freeze the app. Simplify it.`,
    );
  }
  if (hasAmbiguousRepetition(value)) {
    errors.push(
      `${label} repeats alternatives that can match the same text. This can freeze the app. Simplify it.`,
    );
  }
  try {
    new RegExp(value, 'i');
  } catch {
    errors.push(`${label} is not valid. Check its brackets, parentheses and escape characters.`);
  }
}

function hasNestedQuantifier(pattern: string): boolean {
  const groups: { any: boolean; unbounded: boolean }[] = [];
  let closedGroup: { any: boolean; unbounded: boolean } | null = null;
  let inCharacterClass = false;

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '\\') {
      index += 1;
      closedGroup = null;
      continue;
    }
    if (character === '[' && !inCharacterClass) {
      inCharacterClass = true;
      closedGroup = null;
      continue;
    }
    if (character === ']' && inCharacterClass) {
      inCharacterClass = false;
      closedGroup = null;
      continue;
    }
    if (inCharacterClass) continue;

    if (character === '(') {
      groups.push({ any: false, unbounded: false });
      closedGroup = null;
      if (pattern[index + 1] === '?') index += 2;
      continue;
    }
    if (character === ')') {
      closedGroup = groups.pop() ?? null;
      continue;
    }

    const braceQuantifier = character === '{' ? /^\{\d+(?:,\d*)?\}/.exec(pattern.slice(index)) : null;
    if (character === '*' || character === '+' || character === '?' || braceQuantifier) {
      const unbounded = character === '*' || character === '+';
      if (closedGroup?.any && (closedGroup.unbounded || unbounded)) return true;
      for (const group of groups) {
        group.any = true;
        if (unbounded) group.unbounded = true;
      }
      closedGroup = null;
      if (braceQuantifier) index += braceQuantifier[0].length - 1;
      continue;
    }
    closedGroup = null;
  }
  return false;
}

function hasLeadingAttackRepetition(pattern: string): boolean {
  if (!pattern || pattern[0] === '^') return false;
  let end = 1;
  let consumesAttackCharacter = pattern[0] === '.' || pattern[0].toLowerCase() === 'a';
  if (pattern[0] === '\\') {
    end = 2;
    consumesAttackCharacter = pattern[1] === 'w';
  } else if (pattern[0] === '[') {
    end = findClosingDelimiter(pattern, 0, '[', ']');
    consumesAttackCharacter = /A-Z|a-z|a|A/.test(pattern.slice(1, end - 1));
  }
  if (!consumesAttackCharacter || (pattern[end] !== '*' && pattern[end] !== '+')) return false;
  if (pattern[end + 1] === '?' || end + 1 === pattern.length || pattern[end + 1] === '$') {
    return false;
  }
  return true;
}

function hasAdjacentRepetition(pattern: string): 'adjacent' | 'group' | null {
  let previousUnbounded = false;
  let previousWhitespace = false;
  for (let index = 0; index < pattern.length;) {
    let groupContent: string | null = null;
    const character = pattern[index];
    if (character === '^' || character === '$' || character === '|') {
      previousUnbounded = false;
      previousWhitespace = false;
      index += 1;
      continue;
    }
    const currentWhitespace = character === '\\' && pattern[index + 1] === 's';
    if (character === '(') {
      const end = findClosingDelimiter(pattern, index, '(', ')');
      groupContent = pattern.slice(index + 1, end - 1);
      index = end;
    } else if (character === '[') {
      index = findClosingDelimiter(pattern, index, '[', ']');
    } else if (character === '\\') {
      index += 2;
    } else {
      index += 1;
    }

    let unbounded = false;
    if (pattern[index] === '*' || pattern[index] === '+') {
      unbounded = true;
      index += 1;
    } else if (pattern[index] === '?') {
      index += 1;
    } else if (pattern[index] === '{') {
      const quantifier = /^\{\d+(?:,\d*)?\}/.exec(pattern.slice(index));
      if (quantifier) index += quantifier[0].length;
    }
    if (pattern[index] === '?') index += 1;
    const expression = groupContent?.replace(/^\?(?::|=|!|<[^>]+>)/, '');
    if (previousUnbounded && unbounded) return 'adjacent';
    if (
      previousUnbounded &&
      !previousWhitespace &&
      expression !== undefined &&
      startsWithGreedyRepetition(expression)
    ) {
      return 'group';
    }
    previousUnbounded = unbounded;
    previousWhitespace = currentWhitespace;

    if (expression !== undefined) {
      const problem = hasAdjacentRepetition(expression);
      if (problem) return problem;
    }
  }
  return null;
}

function startsWithGreedyRepetition(pattern: string): boolean {
  if (!pattern) return false;
  let end = 1;
  if (pattern[0] === '\\') end = 2;
  if (pattern[0] === '[') end = findClosingDelimiter(pattern, 0, '[', ']');
  return pattern[end] === '*' || pattern[end] === '+';
}

function findClosingDelimiter(
  pattern: string,
  start: number,
  opening: '(' | '[',
  closing: ')' | ']',
): number {
  let depth = 0;
  let inCharacterClass = false;
  for (let index = start; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (opening === '(' && character === '[' && !inCharacterClass) {
      inCharacterClass = true;
      continue;
    }
    if (opening === '(' && character === ']' && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }
    if (inCharacterClass) continue;
    if (character === opening) depth += 1;
    if (character === closing) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return pattern.length;
}

function hasAmbiguousRepetition(pattern: string): boolean {
  const groups: number[] = [];
  let inCharacterClass = false;
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === '[' && !inCharacterClass) {
      inCharacterClass = true;
      continue;
    }
    if (character === ']' && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }
    if (inCharacterClass) continue;
    if (character === '(') {
      groups.push(index + 1);
      continue;
    }
    if (character === ')' && groups.length > 0) {
      const start = groups.pop() as number;
      if ((pattern[index + 1] === '*' || pattern[index + 1] === '+') &&
        hasOverlappingAlternatives(pattern.slice(start, index))) {
        return true;
      }
    }
  }
  return false;
}

function hasOverlappingAlternatives(content: string): boolean {
  const expression = content.replace(/^\?(?::|=|!|<[^>]+>)/, '');
  const branches: string[] = [];
  let depth = 0;
  let branchStart = 0;
  let inCharacterClass = false;
  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === '[' && !inCharacterClass) {
      inCharacterClass = true;
      continue;
    }
    if (character === ']' && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }
    if (inCharacterClass) continue;
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === '|' && depth === 0) {
      branches.push(expression.slice(branchStart, index));
      branchStart = index + 1;
    }
  }
  if (branches.length === 0) return false;
  branches.push(expression.slice(branchStart));

  const literals = branches.map((branch) => branch.replace(/^\^|\$$/g, ''));
  if (literals.some((branch) => !/^[A-Za-z0-9 ]+$/.test(branch))) return false;
  return literals.some((branch, index) =>
    literals.some((other, otherIndex) => index !== otherIndex && other.startsWith(branch)),
  );
}

function unsupportedSyntax(pattern: string): string | null {
  if (pattern.includes('(?<=') || pattern.includes('(?<!')) return 'lookbehind';
  if (/\(\?[imsuxdU-]/.test(pattern)) return 'inline regex flags';
  if (pattern.includes('(?>')) return 'an atomic group';
  if (/\\[kp]</.test(pattern)) return 'a named backreference';
  if (/\\[pP]\{/.test(pattern)) return 'Unicode property escapes';
  if (pattern.includes('\\Q') || pattern.includes('\\E')) return 'quoted regex blocks';
  return null;
}

function validateKeywords(value: unknown, label: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${label} keywords must be a list.`);
    return;
  }
  value.forEach((keyword, index) => {
    if (typeof keyword !== 'string' || keyword.length === 0) {
      errors.push(`${label} keyword ${index + 1} must be non-empty text.`);
    }
  });
}

function validateStringList(value: unknown, field: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`The ${field} field must be a list of app names.`);
    return;
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.length === 0) {
      errors.push(`The ${field} entry ${index + 1} must be non-empty text.`);
    } else if (seen.has(item)) {
      errors.push(`The ${field} entry '${item}' appears more than once.`);
    } else {
      seen.add(item);
    }
  });
}

function validateRequiredText(
  value: unknown,
  field: string,
  label: string,
  errors: string[],
): void {
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${label} must be non-empty text (field: ${field}).`);
  }
}

function validateOptionalText(value: unknown, field: string, errors: string[]): void {
  if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
    errors.push(`The ${field} must be non-empty text when included.`);
  }
}

function checkUnknownFields(
  value: Record<string, unknown>,
  allowed: Set<string>,
  label: string,
  errors: string[],
): void {
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      errors.push(`${label} has an unrecognised field '${field}'. Remove it or check its spelling.`);
    }
  }
}

function checkJsonLimits(value: unknown): ValidationError | null {
  if (exceedsJsonDepth(value)) {
    return { code: 'JSON_DEPTH_EXCEEDED', message: 'JSON nesting exceeds 64 levels.' };
  }
  try {
    const size = JSON.stringify(value)?.length ?? 0;
    if (size > 1000000) {
      return { code: 'JSON_TOO_LARGE', message: 'JSON exceeds 1 MB.' };
    }
  } catch {
    return { code: 'VALIDATION_ERROR', message: 'The value must be finite, non-circular JSON.' };
  }
  return null;
}

function exceedsJsonDepth(value: unknown, depth = 0): boolean {
  if (depth > 64) return true;
  if (Array.isArray(value)) {
    return value.some((entry) => exceedsJsonDepth(entry, depth + 1));
  }
  if (isRecord(value)) {
    return Object.values(value).some((entry) => exceedsJsonDepth(entry, depth + 1));
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function failure(
  errors: string[],
  code?: ValidationErrorCode,
): { ok: false; errors: ValidationError[] } {
  return {
    ok: false,
    errors: errors.map((message) => ({ code: code ?? codeForMessage(message), message })),
  };
}

function codeForMessage(message: string): ValidationErrorCode {
  if (message.startsWith('The parser must be a JSON object')) return 'PARSER_NOT_OBJECT';
  if (message.startsWith('The generic parser config must be a JSON object')) return 'GENERIC_NOT_OBJECT';
  if (message.includes('has an unrecognised field')) return 'UNKNOWN_FIELD';
  if (message === 'The schemaVersion must be 1.') return 'BAD_SCHEMA_VERSION';
  if (message.startsWith('The id ') || message.startsWith('Add an id')) return 'BAD_ID';
  if (message.startsWith('The parser name')) return 'BAD_NAME';
  if (message.startsWith('The version')) return 'BAD_VERSION';
  if (message.includes('must be non-empty text when included')) return 'BAD_OPTIONAL_TEXT';
  if (message.includes('field must be a list of app names')) return 'BAD_APP_LIST';
  if (message.includes('appears more than once')) return 'DUPLICATE_APP';
  if (/^The (?:androidPackages|iosAppNames) entry/.test(message)) return 'BAD_APP_LIST_ENTRY';
  if (message === 'Add at least one rule in the rules list.') return 'RULES_REQUIRED';
  if (message.includes('each rule must be a JSON object')) return 'BAD_RULE';
  if (message.includes('the rule id must')) return 'BAD_RULE_ID';
  if (message.includes('the priority must')) return 'BAD_PRIORITY';
  if (message.includes('the direction must')) return 'BAD_DIRECTION';
  if (message.includes('the confidence must')) return 'BAD_CONFIDENCE';
  if (message.includes('add a title or body match pattern')) return 'MATCH_REQUIRED';
  if (message.includes('add an amount extraction pattern')) return 'MISSING_AMOUNT';
  if (message.includes('amount pattern needs a named group')) return 'MISSING_AMOUNT_GROUP';
  if (message.includes('source must be body, title or bodyThenTitle')) return 'BAD_EXTRACTION_SOURCE';
  if (message === 'Add at least one amount pattern.') return 'AMOUNT_PATTERNS_REQUIRED';
  if (message.includes('entries must be a list')) return 'BAD_PATTERN_LIST';
  if (message.includes('keywords must be a list')) return 'BAD_KEYWORD_LIST';
  if (/keyword \d+ must be non-empty text/.test(message)) return 'BAD_KEYWORD';
  if (message === 'Add incoming and outgoing counterparty pattern lists.') {
    return 'BAD_COUNTERPARTY_PATTERNS';
  }
  if (message.includes('uses lookbehind')) return 'REGEX_LOOKBEHIND';
  if (message.includes('repeats a repeating part')) return 'REGEX_NESTED_QUANTIFIER';
  if (message.includes('repeats alternatives')) return 'REGEX_AMBIGUOUS_ALTERNATIVES';
  if (message.includes('places repeated patterns next to each other')) {
    return 'REGEX_ADJACENT_QUANTIFIER';
  }
  if (message.includes('repeats across a group boundary')) {
    return 'REGEX_GROUP_BOUNDARY_QUANTIFIER';
  }
  if (message.includes('starts with a greedy repeating pattern')) return 'REGEX_LEADING_GREEDY';
  if (message.includes('uses ')) return 'REGEX_UNSUPPORTED_SYNTAX';
  if (message.includes('exceeds 4,000 characters')) return 'REGEX_TOO_LONG';
  if (message.includes('needs a named group')) return 'MISSING_GROUP';
  if (message.includes('is not valid. Check')) return 'REGEX_INVALID';
  if (message.includes('must be non-empty text')) return 'REGEX_EMPTY';
  return 'VALIDATION_ERROR';
}
