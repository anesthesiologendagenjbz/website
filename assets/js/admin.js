
// admin.js — Simplified client-side Admin Console (no backend writes)
// Scope: edit only assignments.json; allow downloading the file or viewing/copying the JSON contents.

import { normalize, sha256Hex } from './data.js';

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

export function renderAdmin(container) {
  container.innerHTML = '';
  const wrap = el(`<section class="card">
    <h2 class="title">Admin Console</h2>
    <p class="muted">Bewerk enkel <code class="inline">assignments.json</code>. Download het bestand of bekijk/kopieer de JSON en upload dit handmatig in GitHub.</p>

    <div class="row" style="margin-top:1rem; gap:.5rem; flex-wrap:wrap">
      <button class="btn" id="btn-load-local" type="button">Laad huidige assignments.json</button>
      <input type="file" id="file-input" accept="application/json" style="display:none">
      <button class="btn btn-secondary" id="btn-upload-file" type="button">Laad vanuit bestand…</button>
    </div>

    <div id="editor" style="margin-top:1rem"></div>

    <div class="row" style="margin-top:1rem; gap:.5rem; flex-wrap:wrap">
      <button class="btn" id="btn-add" type="button">Nieuwe opdracht</button>
      <button class="btn" id="btn-download" type="button">Download assignments.json</button>
      <button class="btn btn-secondary" id="btn-show-json" type="button">Toon JSON (kopiëren)</button>
    </div>
    <div id="status" class="message" hidden role="status"></div>
  </section>`);

  container.append(wrap);

  const editor = wrap.querySelector('#editor');
  const status = wrap.querySelector('#status');
  let data = null;         // { game, assignments }
  // No server-side write/commit functionality in this version.

  function setStatus(msg, type = 'info') {
    status.textContent = msg;
    status.hidden = !msg;
    status.classList.toggle('error', type === 'error');
    status.classList.toggle('success', type === 'success');
  }

  // No password dialogs needed anymore.

  async function loadLocal() {
    try {
      const res = await fetch('assignments.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      renderList();
      setStatus('assignments.json geladen.', 'success');
    } catch (e) {
      console.error(e);
      setStatus('Kon assignments.json niet laden.', 'error');
    }
  }

  function renderList() {
    editor.innerHTML = '';
    if (!data) { editor.append(el('<div class="muted">Nog geen data geladen.</div>')); return; }
    // Game header quick edit
    const game = data.game || (data.game = { name: '', edition: '', startAt: '' });
    const gameEl = el(`<div class="card" style="margin-bottom:1rem">
      <h3 class="title">Game</h3>
      <div class="row" style="flex-wrap:wrap; gap:.5rem">
        <label style="flex:2 1 240px">Naam<br><input id="g-name" type="text" value="${esc(game.name)}"></label>
        <label style="flex:1 1 140px">Editie<br><input id="g-edition" type="text" value="${esc(game.edition)}"></label>
        <label style="flex:2 1 260px">StartAt<br><input id="g-start" type="text" value="${esc(game.startAt || '')}"></label>
      </div>
    </div>`);
    gameEl.querySelector('#g-name').addEventListener('input', e => game.name = e.target.value);
    gameEl.querySelector('#g-edition').addEventListener('input', e => game.edition = e.target.value);
    gameEl.querySelector('#g-start').addEventListener('input', e => game.startAt = e.target.value);
    editor.append(gameEl);

    // Assignments list
    const list = el('<div class="grid"></div>');
    (data.assignments || (data.assignments = [])).forEach((a, idx) => {
      const card = el(`<article class="card">
        <label>Titel<br><input class="a-title" type="text" value="${esc(a.title || '')}"></label>
        <label>Omschrijving<br><input class="a-desc" type="text" value="${esc(a.description || '')}"></label>
        <label>Reveal (tekst)<br><input class="a-reveal" type="text" value="${esc(a.reveal && a.reveal.content || '')}"></label>
        <div class="row" style="gap:.5rem; flex-wrap:wrap; margin-top:.25rem">
          <button class="btn btn-secondary set-answer" type="button">Zet antwoord…</button>
          <button class="btn btn-secondary remove" type="button">Verwijder</button>
        </div>
      </article>`);
      card.querySelector('.a-title').addEventListener('input', e => a.title = e.target.value);
      card.querySelector('.a-desc').addEventListener('input', e => a.description = e.target.value);
      card.querySelector('.a-reveal').addEventListener('input', e => a.reveal = { type: 'text', content: e.target.value });
      card.querySelector('.remove').addEventListener('click', () => {
        if (confirm(`Verwijder opdracht ${a.id ?? (idx+1)}?`)) {
          data.assignments.splice(idx, 1);
          renderList();
        }
      });
      card.querySelector('.set-answer').addEventListener('click', () => openSetAnswer(a));
      list.append(card);
    });
    editor.append(list);
  }

  function openSetAnswer(a) {
    const dialog = el(`<div class="card" style="margin-top:1rem">
      <h3 class="title">Antwoord instellen — Opdracht ${a.id}</h3>
      <div class="row" style="flex-wrap:wrap; gap:.5rem">
        <label style="flex:2 1 240px">Antwoord (menselijk leesbaar)<br><input id="ans" type="text" placeholder="bijv. banaantje"></label>
        <label style="flex:1 1 200px">Methode<br>
          <select id="method">
            <option value="salted">Salted (aanbevolen)</option>
            <option value="unsalted">Unsalted</option>
          </select>
        </label>
      </div>
      <div class="row" style="margin-top:.5rem; gap:.5rem">
        <button class="btn" id="do-set" type="button">Genereer en toepassen</button>
        <button class="btn btn-secondary" id="do-cancel" type="button">Sluiten</button>
      </div>
      <div class="muted" style="margin-top:.5rem">Normalisatie: trim, lowercase, diakritiek/leestekens weg, spaties samenvoegen.</div>
    </div>`);
    editor.append(dialog);
    dialog.querySelector('#do-cancel').addEventListener('click', () => dialog.remove());
    dialog.querySelector('#do-set').addEventListener('click', async () => {
      const method = dialog.querySelector('#method').value;
      const raw = dialog.querySelector('#ans').value || '';
      const norm = normalize(raw, { trim: true, case: 'insensitive' });
      if (!norm) { setStatus('Antwoord is leeg na normalisatie.', 'error'); return; }
      // Clear previous formats
      delete a.answerSalt; delete a.answerHashes; delete a.answerHash; delete a.answerCombined;
      if (method === 'unsalted') {
        a.answerHash = await sha256Hex(norm);
      } else {
        const salt = randomSaltBase64Url(24);
        const hex = await sha256Hex(`${salt}:${norm}`);
        a.answerCombined = `${salt}:${hex}`;
      }
      a.case = 'insensitive';
      a.trim = true;
      setStatus('Antwoord ingesteld.', 'success');
      dialog.remove();
    });
  }

  function randomSaltBase64Url(bytes = 24) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    let b64 = btoa(String.fromCharCode(...arr));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function addAssignment() {
    const nextId = (data.assignments?.length ? Math.max(...data.assignments.map(x => x.id || 0)) + 1 : 1);
    const a = { id: nextId, description: '', reveal: { type: 'text', content: '' }, case: 'insensitive', trim: true };
    (data.assignments || (data.assignments = [])).push(a);
    renderList();
    setStatus(`Opdracht ${nextId} toegevoegd.`, 'success');
  }

  function downloadJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'assignments.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function showJsonModal() {
    if (!data) { setStatus('Geen data om te tonen.', 'error'); return; }
    const text = JSON.stringify(data, null, 2);
    const dlg = el(`<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0008;z-index:9999">
      <div class="card" role="dialog" aria-modal="true" style="max-width:860px;width:calc(100% - 2rem)">
        <h3 class="title">JSON inhoud — assignments.json</h3>
        <div>
          <textarea readonly style="width:100%;height:min(60vh,520px);background:#0b0c10;color:#e5e7eb;border:1px solid var(--border);border-radius:.5rem;padding:.75rem;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">${esc(text)}</textarea>
        </div>
        <div class="row" style="margin-top:.75rem;gap:.5rem">
          <button class="btn" id="copy" type="button">Kopieer naar klembord</button>
          <button class="btn btn-secondary" id="close" type="button">Sluiten</button>
        </div>
        <div class="small muted" style="margin-top:.5rem">Tip: Plak deze inhoud rechtstreeks in de GitHub webeditor of upload het gedownloade bestand.</div>
      </div>
    </div>`);
    document.body.appendChild(dlg);
    const ta = dlg.querySelector('textarea');
    const btnCopy = dlg.querySelector('#copy');
    const btnClose = dlg.querySelector('#close');
    setTimeout(() => { ta.focus(); ta.select(); }, 0);
    btnCopy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); setStatus('JSON gekopieerd naar klembord.', 'success'); }
      catch { setStatus('Kopiëren mislukt. Selecteer en kopieer handmatig (Ctrl/Cmd+C).', 'error'); }
    });
    btnClose.addEventListener('click', () => dlg.remove());
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') dlg.remove(); });
  }

  // Event wiring
  wrap.querySelector('#btn-load-local').addEventListener('click', loadLocal);
  wrap.querySelector('#btn-add').addEventListener('click', () => { if (!data) { setStatus('Laad eerst assignments.json.', 'error'); return; } addAssignment(); });
  wrap.querySelector('#btn-download').addEventListener('click', () => { if (!data) { setStatus('Geen data om te downloaden.', 'error'); return; } downloadJson(); });
  wrap.querySelector('#btn-show-json').addEventListener('click', () => { showJsonModal(); });
  wrap.querySelector('#btn-upload-file').addEventListener('click', () => wrap.querySelector('#file-input').click());
  wrap.querySelector('#file-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const text = await file.text(); data = JSON.parse(text); renderList(); setStatus('Bestand geladen.', 'success'); }
    catch { setStatus('Ongeldig JSON bestand.', 'error'); }
  });
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
