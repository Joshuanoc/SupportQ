const REDACTED = '[REDACTED]';
const MAX_EXPORT_LENGTH = 100_000;

const replacements = [
  [/-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)* PRIVATE KEY-----/gi, `[PRIVATE KEY ${REDACTED}]`],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, `Bearer ${REDACTED}`],
  [/(\bauthorization\s*:\s*basic)\s+[A-Za-z0-9+/]{12,}={0,2}/gi, (_, label) => `${label} ${REDACTED}`],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, `[JWT ${REDACTED}]`],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sb_secret_[A-Za-z0-9_-]{12,}|sk_(?:live|test)_[A-Za-z0-9]{12,}|AKIA[A-Z0-9]{16})\b/g, `[TOKEN ${REDACTED}]`],
  [/\b((?:password|passwd|passcode|otp|one[- ]time (?:password|code)|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|client[-_ ]?secret|secret)\s*[:=]\s*)([^\s,;]+)/gi, (_, label) => `${label}${REDACTED}`],
  [/\b([a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:)([^\s@/]+)(@)/gi, (_, prefix, _secret, suffix) => `${prefix}${REDACTED}${suffix}`],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, `[EMAIL ${REDACTED}]`],
  [/\b((?:phone|mobile|telephone|tel)\s*[:=]\s*)(?:\+?\d[\d ().-]{6,}\d)/gi, (_, label) => `${label}${REDACTED}`],
  [/\b((?:sin|social insurance number|ssn|social security number|credit card|card number)\s*[:=]\s*)(?:\d[\d -]{6,}\d)/gi, (_, label) => `${label}${REDACTED}`],
];

export function sanitizeIncidentText(value) {
  let text = String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
  if (text.length > MAX_EXPORT_LENGTH) text = `${text.slice(0, MAX_EXPORT_LENGTH)}\n[EXPORT TRUNCATED]`;
  return text;
}

export async function copySanitizedIncident(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    return { ok: false, message: 'Incident could not be copied. Clipboard access is unavailable.' };
  }
  try {
    await clipboard.writeText(sanitizeIncidentText(text));
    return { ok: true, message: 'Incident copied with sensitive values redacted.' };
  } catch {
    return { ok: false, message: 'Incident could not be copied. Check clipboard permission and try again.' };
  }
}
