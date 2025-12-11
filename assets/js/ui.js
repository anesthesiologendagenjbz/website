// ui.js — rendering functions

import { isSolved } from './storage.js';

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function renderHome(container, data, state) {
  const solved = solvedCount(state);
  const total = data.assignments.length;
  container.innerHTML = '';
  container.append(
    el(`<section class="card"><p class="kicker">Welkom</p>
      <h2 class="title">JBZ Opdrachten</h2>
      <p>Open de opdrachten, voer je antwoord in en ontgrendel de pubquiz‑vraag.</p>
      <p><strong>Status:</strong> ${solved} / ${total} opgelost.</p>
      <p><a class="btn" href="#/assignments">Naar opdrachten</a></p>
    </section>`)
  );
}

export function renderAssignmentsList(container, data, state) {
  container.innerHTML = '';
  const header = el(`<div class="list-header"><h2 class="title">Opdrachten</h2><div class="muted">${solvedCount(state)} / ${data.assignments.length} opgelost</div></div>`);
  const grid = el('<div class="grid"></div>');
  for (const a of data.assignments) {
    const status = isSolved(state, a.id) ? 'ok' : 'unsolved';
    const card = el(`<article class="card" aria-labelledby="a-${a.id}">
      <div class="kicker">Opdracht ${a.id}</div>
      <h3 id="a-${a.id}" class="title">${escapeHtml(a.title)}</h3>
      <div><span class="badge ${status}">${status === 'ok' ? 'Opgelost' : 'Open'}</span></div>
      <div style="margin-top:auto"><a class="btn btn-secondary" href="#/assignment/${a.id}">Openen</a></div>
    </article>`);
    grid.append(card);
  }
  container.append(header, grid);
}

export function renderAssignmentDetail(container, assignment, stateEntry, opts) {
  const solved = !!(stateEntry && stateEntry.solvedAt);
  container.innerHTML = '';
  const wrap = el(`<article class="card" aria-labelledby="t-${assignment.id}">
    <div class="kicker">Opdracht ${assignment.id}</div>
    <h2 id="t-${assignment.id}" class="title">${escapeHtml(assignment.title)}</h2>
    <p>${escapeHtml(assignment.description)}</p>
  </article>`);

  const form = el(`<form autocomplete="off">
      <label for="answer">Antwoord</label>
      <div class="row">
        <input id="answer" name="answer" type="text" inputmode="text" required aria-describedby="answer-help">
        <button class="btn" type="submit"><span class="label">Controleer</span><span class="spinner" hidden aria-hidden="true"></span></button>
      </div>
      <div id="answer-help" class="muted">Druk op Enter om te verzenden.</div>
    </form>`);
  const msg = el('<div class="message" hidden role="status"></div>');
  const reveal = el('<section aria-live="polite"></section>');

  wrap.append(form, msg, reveal);
  container.append(wrap);

  if (solved || opts.preReveal) {
    showReveal(reveal, assignment.reveal);
  }

  return { form, msg, reveal };
}

export function showReveal(container, reveal) {
  container.innerHTML = '';
  if (!reveal) return;
  if (reveal.type === 'text') {
    container.append(el(`<div class="message success"><strong>Pubquiz‑vraag:</strong><br>${escapeHtml(reveal.content)}</div>`));
  }
}

export function setMessage(node, text, type = 'info') {
  node.textContent = text;
  node.hidden = !text;
  node.classList.toggle('error', type === 'error');
  node.classList.toggle('success', type === 'success');
}

export function solvedCount(state) { return Object.values(state || {}).filter(x => x && x.solvedAt).length; }

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
