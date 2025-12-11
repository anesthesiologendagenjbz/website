// storage.js — local persistence for per-assignment progress

const KEY = 'jbz_game_progress_v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return typeof data === 'object' && data ? data : {};
  } catch {
    return {};
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function resetState() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function markAttempt(state, id) {
  const k = String(id);
  state[k] = state[k] || {};
  state[k].attempts = (state[k].attempts || 0) + 1;
  state[k].lastTried = Date.now();
}

export function markSolved(state, id) {
  const k = String(id);
  state[k] = state[k] || {};
  state[k].solvedAt = Date.now();
}

export function isSolved(state, id) {
  return !!(state[String(id)] && state[String(id)].solvedAt);
}
