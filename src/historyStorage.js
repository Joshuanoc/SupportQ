export const HISTORY_KEY = 'supportq-history';
export const HISTORY_LIMIT = 25;
const MAX_STORED_LENGTH = 1_000_000;
const UNAVAILABLE = 'Browser history is unavailable. Incidents remain available in this session while the app is open.';
const INVALID = 'Some saved incident history could not be loaded. Valid incidents remain available; stored data has not been changed.';
const UNSAVED = 'Incident history could not be saved in this browser. New incidents remain available in this session while the app is open.';
const browserStorage = () => globalThis.localStorage;

function validIncident(item) {
  return item !== null && typeof item === 'object' && !Array.isArray(item) &&
    ((typeof item.id === 'number' && Number.isFinite(item.id)) || (typeof item.id === 'string' && item.id.length > 0)) &&
    ['scenario', 'category', 'priority', 'completedAt'].every(key => typeof item[key] === 'string') &&
    ['Resolved', 'Escalated'].includes(item.status) &&
    Number.isFinite(item.confidence) && item.confidence >= 0 && item.confidence <= 100 &&
    ['reportedIssue', 'cause'].every(key => item[key] === undefined || typeof item[key] === 'string');
}

// Resolve the browser API inside the try: its property getter can itself throw.
export function readIncidentHistory(storageAccessor = browserStorage) {
  try {
    const raw = storageAccessor().getItem(HISTORY_KEY);
    if (raw === null || raw === '') return { history: [], warning: '' };
    if (typeof raw !== 'string' || raw.length > MAX_STORED_LENGTH) return { history: [], warning: INVALID };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { history: [], warning: INVALID };
    const seen = new Set();
    const valid = parsed.filter(item => {
      if (!validIncident(item) || seen.has(String(item.id))) return false;
      seen.add(String(item.id));
      return true;
    });
    return { history: valid.slice(0, HISTORY_LIMIT), warning: valid.length < parsed.length ? INVALID : '' };
  } catch (error) {
    return { history: [], warning: error instanceof SyntaxError ? INVALID : UNAVAILABLE };
  }
}

export function writeIncidentHistory(history, storageAccessor = browserStorage) {
  try {
    if (!Array.isArray(history) || !history.every(validIncident)) return { saved: false, warning: UNSAVED };
    const serialized = JSON.stringify(history.slice(0, HISTORY_LIMIT));
    if (serialized.length > MAX_STORED_LENGTH) return { saved: false, warning: UNSAVED };
    storageAccessor().setItem(HISTORY_KEY, serialized);
    return { saved: true, warning: '' };
  } catch {
    return { saved: false, warning: UNSAVED };
  }
}
