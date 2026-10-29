// AmazonHunt popup controller

const shell = document.getElementById('shell');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const statusPill = document.getElementById('status-pill');
const resultHero = document.getElementById('result-hero');
const runFocus = document.getElementById('run-focus');
const heroPanel = document.getElementById('hero-panel');
const currentStep = document.getElementById('current-step');
const progressInfo = document.getElementById('progress-info');
const miniLog = document.getElementById('mini-log');
const logArea = document.getElementById('log-area');
const seedInput = document.getElementById('input-seed');
const seedError = document.getElementById('seed-error');
const resultSeed = document.getElementById('result-seed');
const resultMeta = document.getElementById('result-meta');
const resultVerdict = document.getElementById('result-verdict');

let pollTimer = null;

function setMode(mode) {
  shell.className = `shell mode-${mode}`;
}

function setStatus(type, text) {
  statusDot.className = `dot ${type}`;
  statusText.textContent = text;
  statusPill.className = `status-pill ${type === 'running' ? 'is-running' : type === 'success' ? 'is-success' : type === 'error' ? 'is-error' : ''}`;
}

function renderLogs(logs) {
  if (!logs || !logs.length) return;
  // mini-log (latest 3)
  const recent = logs.slice(-3);
  miniLog.innerHTML = recent.map(l =>
    `<div class="log-entry log-${l.type}">${l.time ? l.time + ' ' : ''}${esc(l.msg)}</div>`
  ).join('');

  // full log
  logArea.innerHTML = logs.map(l =>
    `<div class="log-entry log-${l.type}">${l.time ? '<span style="opacity:.5">' + l.time + '</span> ' : ''}${esc(l.msg)}</div>`
  ).join('');
  logArea.scrollTop = logArea.scrollHeight;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function applyState(state) {
  if (!state) return;

  if (state.running || state.stopping) {
    setMode('running');
    setStatus('running', state.stopping ? 'Stopping…' : 'Running');
    currentStep.textContent = state.currentStep || 'Processing…';
    progressInfo.textContent = state.progress || '';
    renderLogs(state.logs);
    schedulePoll();
  } else if (state.lastStatus === 'success') {
    setMode('result');
    setStatus('success', 'Complete');
    resultSeed.textContent = state.lastSeed || '—';
    const verdict = state.lastVerdict || '';
    resultVerdict.textContent = verdict;
    resultVerdict.className = 'report-verdict ' + (verdict === 'GO' ? 'go' : verdict === 'NO-GO' ? 'nogo' : 'maybe');
    resultMeta.textContent = `Verdict: ${verdict}`;
    renderLogs(state.logs);
    stopPoll();
  } else if (state.lastStatus === 'error') {
    setMode('idle');
    setStatus('error', 'Error');
    renderLogs(state.logs);
    stopPoll();
  } else {
    setMode('idle');
    setStatus('idle', 'Idle');
    stopPoll();
  }
}

function schedulePoll() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const state = await send('getState');
    applyState(state);
  }, 1500);
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function send(action, extra = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, ...extra }, (r) => resolve(r));
  });
}

// Run button
document.getElementById('btn-run').addEventListener('click', async () => {
  const seed = seedInput.value.trim();
  if (!seed) { seedError.style.display = ''; return; }
  seedError.style.display = 'none';
  const res = await send('startPipeline', { seedKeyword: seed });
  if (res && res.started) {
    setMode('running');
    setStatus('running', 'Running');
    schedulePoll();
  }
});

seedInput.addEventListener('input', () => { seedError.style.display = 'none'; });

// Stop button
document.getElementById('btn-stop').addEventListener('click', async () => {
  await send('stopPipeline');
});

// View / Download report
document.getElementById('btn-view-report').addEventListener('click', () => send('openReport'));
document.getElementById('btn-download-report').addEventListener('click', () => send('downloadReport'));

// Copy log
document.getElementById('btn-copy-log').addEventListener('click', async () => {
  const text = logArea.innerText;
  await navigator.clipboard.writeText(text).catch(() => {});
});

// Clear log (just clears the display)
document.getElementById('btn-clear-log').addEventListener('click', () => {
  logArea.innerHTML = '<div class="log-empty">Log cleared.</div>';
});

// Clear all data
document.getElementById('btn-clear-data').addEventListener('click', async () => {
  if (!confirm('Erase all saved keywords, snapshots, audits, and reports?')) return;
  await send('clearData');
  setMode('idle');
  setStatus('idle', 'Idle');
  logArea.innerHTML = '<div class="log-empty">Data cleared.</div>';
});

// Settings
const CFG_KEYS = {
  'input-max-keywords': 'max_keywords_per_run',
  'input-delay': 'delay_between_pages_sec',
  'input-max-listings': 'max_listings_per_keyword',
  'input-max-reviews': 'max_reviews_beatable',
  'input-min-beatable': 'min_beatable_slots',
  'input-min-price': 'min_price_usd',
};

async function loadSettings() {
  const data = await chrome.storage.local.get('config');
  const config = data.config || {};
  const defaults = { max_keywords_per_run:20, delay_between_pages_sec:7, max_listings_per_keyword:10, max_reviews_beatable:1000, min_beatable_slots:3, min_price_usd:10 };
  const merged = { ...defaults, ...config };
  for (const [id, key] of Object.entries(CFG_KEYS)) {
    const el = document.getElementById(id);
    if (el) el.value = merged[key] ?? el.value;
  }
}

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const config = {};
  for (const [id, key] of Object.entries(CFG_KEYS)) {
    const el = document.getElementById(id);
    if (el) config[key] = Number(el.value);
  }
  await chrome.storage.local.set({ config });
  const msg = document.getElementById('settings-saved');
  msg.style.display = '';
  setTimeout(() => { msg.style.display = 'none'; }, 2000);
});

document.getElementById('btn-reset-settings').addEventListener('click', async () => {
  await chrome.storage.local.remove('config');
  await loadSettings();
});

// Init
(async () => {
  await loadSettings();
  const state = await send('getState');
  applyState(state);
})();
