#!/usr/bin/env node
// offline_hash.mjs — generate salted hashes for assignments.json from CSV or prompt
// Usage:
//   node scripts/offline_hash.mjs < input.csv > assignments.json
// CSV columns: id,title,description,answers,reveal
// answers are separated by '|'

import crypto from 'node:crypto';
import fs from 'node:fs';

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\p{P}\p{S}]/gu, '')
    .replace(/\s+/g, ' ');
}

function newSalt(bytes = 24) { return crypto.randomBytes(bytes).toString('base64url'); }
function hashAnswer(salt, ans) { return crypto.createHash('sha256').update(`${salt}:${normalize(ans)}`, 'utf8').digest('hex'); }

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    // naive split, suitable for simple input without quoted commas
    const parts = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = parts[i] ?? '');
    return obj;
  });
}

async function main() {
  const input = await new Promise(res => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => res(data));
  });

  const rows = parseCSV(input);
  const assignments = rows.map(r => {
    const id = Number(r.id);
    const title = r.title || `Opdracht ${id}`;
    const description = r.description || '';
    const reveal = r.reveal || '';
    const variants = String(r.answers || '').split('|').map(s => s.trim()).filter(Boolean);
    const salt = newSalt();
    const hashes = variants.map(v => hashAnswer(salt, v));
    return {
      id,
      title,
      description,
      answerSalt: salt,
      answerHashes: hashes,
      case: 'insensitive',
      trim: true,
      reveal: { type: 'text', content: reveal }
    };
  });

  const out = {
    game: { name: 'JBZ Anesthesiologendagen', edition: '2025', startAt: '2025-12-11T09:00:00+01:00' },
    assignments
  };
  process.stdout.write(JSON.stringify(out, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
