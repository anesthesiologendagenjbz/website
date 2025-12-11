// data.js — load assignments and provide normalization + hashing helpers

export async function loadData() {
  const res = await fetch(`assignments.json?v=${cacheBuster()}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`assignments.json load failed: ${res.status}`);
  return res.json();
}

export function cacheBuster() {
  return '2025-12-11-2';
}

export function normalize(input, rules = { trim: true, case: 'insensitive' }) {
  let s = String(input ?? '');
  if (rules.trim) s = s.trim();
  s = s.replace(/\s+/g, ' ');
  if (rules.case === 'insensitive') s = s.toLowerCase();
  // Remove diacritics
  s = s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  // Strip punctuation and symbols (keep spaces & letters/digits)
  s = s.replace(/[\p{P}\p{S}]/gu, '');
  return s;
}

export async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function isCorrectAnswer(entry, userInput) {
  const norm = normalize(userInput, entry);

  // New single-field format support: answerCombined = "<salt>:<hash>" or "sha256:<salt>:<hash>"
  if (entry.answerCombined && typeof entry.answerCombined === 'string') {
    const parts = String(entry.answerCombined).split(':');
    let salt = '';
    let expected = '';
    if (parts.length === 3 && parts[0].toLowerCase() === 'sha256') {
      [, salt, expected] = parts;
    } else if (parts.length === 2) {
      [salt, expected] = parts;
    }
    if (salt && expected) {
      const candidate = await sha256Hex(`${salt}:${norm}`);
      return candidate === expected;
    }
  }

  // Backward compatibility: separate salt + one-or-many hashes
  if (entry.answerSalt) {
    const candidate = await sha256Hex(`${entry.answerSalt}:${norm}`);
    const list = entry.answerHashes || entry.answerHash ? (entry.answerHashes || [entry.answerHash]) : [];
    return list.includes(candidate);
  }

  // Hash-only mode (unsalted): compare sha256(normalized) against answerHash/answerHashes
  if (entry.answerHashes || entry.answerHash) {
    const candidate = await sha256Hex(norm);
    const list = entry.answerHashes || [entry.answerHash];
    return Array.isArray(list) ? list.includes(candidate) : false;
  }

  return false;
}
