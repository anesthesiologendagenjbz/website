// app.js — SPA router + controllers
import { loadData, isCorrectAnswer, cacheBuster } from './data.js';
import { loadState, saveState, resetState, markAttempt, markSolved, isSolved } from './storage.js';
import { renderHome, renderAssignmentsList, renderAssignmentDetail, setMessage, showReveal } from './ui.js';
import { renderAdmin } from './admin.js';

const app = document.getElementById('app');
const resetBtn = document.getElementById('reset-progress');

let DATA = null;
let STATE = loadState();

const DEBUG = new URLSearchParams(location.search).has('debug');

init().catch(err => {
  console.error(err);
  app.textContent = 'Er ging iets mis bij het laden.';
});

async function init() {
  DATA = await loadData();
  window.addEventListener('hashchange', () => renderRoute(location.hash));
  resetBtn?.addEventListener('click', onReset);
  renderRoute(location.hash || '#/assignments');
  registerSW();
}

function onReset() {
  if (confirm('Weet je zeker dat je alle voortgang wilt wissen?')) {
    resetState();
    STATE = {};
    renderRoute(location.hash || '#/assignments');
  }
}

function renderRoute(hash) {
  const route = (hash || '').replace(/^#/, '') || '/assignments';
  const [_, base, id] = route.split('/');
  switch (`/${base || ''}`) {
    case '/':
    case '/assignments':
      renderAssignmentsList(app, DATA, STATE);
      break;
    case '/assignment':
      renderAssignmentController(Number(id));
      break;
    case '/about':
      renderAbout();
      break;
    case '/admin':
      renderAdmin(app);
      break;
    default:
      location.hash = '#/assignments';
  }
  // focus main for a11y
  setTimeout(() => app.focus(), 0);
}

function renderAbout() {
  app.innerHTML = '';
  app.insertAdjacentHTML('beforeend', `
    <section class="card">
      <h2 class="title">Uitleg</h2>
      <p>Open de opdrachtenlijst. Voor elke opdracht voer je een antwoord in. Bij correct antwoord verschijnt de bijbehorende pubquiz‑vraag. Je voortgang wordt lokaal opgeslagen op dit apparaat.</p>
      <p class="muted">Deze site werkt offline na de eerste keer laden.</p>
    </section>
  `);
}

function getAssignment(id) {
  return DATA.assignments.find(a => a.id === id);
}

function getStateEntry(id) {
  return STATE[String(id)] || null;
}

function renderAssignmentController(id) {
  const a = getAssignment(id);
  if (!a) { location.hash = '#/assignments'; return; }
  const preReveal = DEBUG && new URLSearchParams(location.search).get('debug') === '';
  const { form, msg, reveal } = renderAssignmentDetail(app, a, getStateEntry(id), { preReveal });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.answer;
    const btn = form.querySelector('button');
    const controleer = form.querySelector('.controleer');
    setMessage(msg, '');
    btn.disabled = true; controleer.hidden = false;
    markAttempt(STATE, id); // record attempt regardless
    try {
      const ok = await isCorrectAnswer(a, input.value);
      if (ok) {
        markSolved(STATE, id);
        saveState(STATE);
        showReveal(reveal, a.reveal);
        setMessage(msg, 'Correct! De pubquiz‑vraag is ontgrendeld.', 'success');
      } else {
        saveState(STATE);
        setMessage(msg, 'Onjuist antwoord, probeer opnieuw.', 'error');
        input.focus();
        input.select();
      }
    } catch (err) {
      console.error(err);
      setMessage(msg, 'Er trad een fout op bij het controleren.', 'error');
    } finally {
      btn.disabled = false; controleer.hidden = true;
    }
  });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?b=' + cacheBuster()).catch(() => {});
  }
}
