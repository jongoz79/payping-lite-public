# Shared validation contract

Every validator returns `{ ok: true, value }` or `{ ok: false, errors: [{ code, message }] }`. Codes are stable API; messages are plain language and may be clarified. Implementations must accept and reject the same cases in `validation-fixtures.json`.

- `PARSER_NOT_OBJECT`: the parser input is not a JSON object.
- `GENERIC_NOT_OBJECT`: the generic config input is not a JSON object.
- `UNKNOWN_FIELD`: an object contains a field outside the shared schema.
- `BAD_SCHEMA_VERSION`: `schemaVersion` is not 1.
- `BAD_ID`: the parser id is missing or is not lowercase letters, numbers, `-` and `_`, starting with a letter.
- `BAD_NAME`: the parser name is missing or empty.
- `BAD_VERSION`: the parser version is not an integer of at least 1.
- `BAD_OPTIONAL_TEXT`: optional author or description is present but empty or not text.
- `BAD_APP_LIST`: Android packages or iOS app names is not an array.
- `BAD_APP_LIST_ENTRY`: an app-list entry is empty or not text.
- `DUPLICATE_APP`: an app package or name appears more than once in one list.
- `RULES_REQUIRED`: the rules array is missing or empty.
- `BAD_RULE`: a rule entry is not an object.
- `BAD_RULE_ID`: a rule id does not have the `<parser>.<name>.v<N>` form.
- `BAD_PRIORITY`: a rule priority is not an integer.
- `BAD_DIRECTION`: a rule direction is not `in`, `out` or `info`.
- `BAD_CONFIDENCE`: an explicit rule confidence is not `high` or `none`.
- `MATCH_REQUIRED`: a rule has no title or body match expression.
- `MISSING_AMOUNT`: a money rule has no amount extraction.
- `MISSING_AMOUNT_GROUP`: an amount extraction lacks `(?<amount>…)`.
- `MISSING_GROUP`: a counterparty or reference extraction lacks its corresponding named group.
- `BAD_EXTRACTION_SOURCE`: an extraction source is not `body`, `title` or `bodyThenTitle`.
- `BAD_PATTERN_LIST`: a regex list is not an array.
- `AMOUNT_PATTERNS_REQUIRED`: the generic config has no amount patterns.
- `BAD_KEYWORD_LIST`: a debit or credit keyword collection is not an array.
- `BAD_KEYWORD`: a keyword entry is empty or not text.
- `BAD_COUNTERPARTY_PATTERNS`: incoming/outgoing counterparty lists are missing or malformed.
- `REGEX_EMPTY`: a regex is empty or not text.
- `REGEX_TOO_LONG`: a regex exceeds 4,000 characters.
- `REGEX_LOOKBEHIND`: a regex uses lookbehind, which is not portable.
- `REGEX_UNSUPPORTED_SYNTAX`: a regex uses inline flags, atomic groups, named backreferences, Unicode properties or quoted blocks.
- `REGEX_NESTED_QUANTIFIER`: a group containing an unbounded quantifier is quantified, or a group containing any quantifier is repeated with `*` or `+`. Bounded-inside-bounded forms such as `(?:\.\d{1,2})?` are accepted.
- `REGEX_AMBIGUOUS_ALTERNATIVES`: a repeated group has overlapping literal alternatives such as `(a|aa)+`.
- `REGEX_ADJACENT_QUANTIFIER`: adjacent atoms have unbounded quantifiers.
- `REGEX_GROUP_BOUNDARY_QUANTIFIER`: an unbounded atom is followed by a group starting with a greedy repetition, except after whitespace.
- `REGEX_LEADING_GREEDY`: an unanchored leading greedy wildcard/letter run can cause quadratic backtracking.
- `REGEX_INVALID`: the regex does not compile with case-insensitive matching.
- `JSON_TOO_LARGE`: the JSON value exceeds 1 MB.
- `JSON_DEPTH_EXCEEDED`: the JSON value nests beyond 64 levels.
- `VALIDATION_ERROR`: fallback for a non-JSON value such as a circular object; shared fixtures must not use this for ordinary schema errors.

Whitespace before a named capture is allowed. Lazy wildcards between literals, bounded repetitions, terminal greedy runs, and anchored greedy prefixes are valid. Regex evaluation deadlines remain necessary even after static validation.
