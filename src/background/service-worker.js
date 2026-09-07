// AmazonHunt Service Worker — Orchestrates the 4-step research pipeline

import { LocalStorageClient } from '../utils/local-storage-client.js';
import { loadConfig, saveRunState, loadRunState } from '../utils/config-loader.js';
import { runKeywordDiscovery } from '../worker-modules/keyword-discovery-workflow.js';
import { runSearchSnapshots } from '../worker-modules/search-snapshot-workflow.js';
import { runListingAudit } from '../worker-modules/listing-audit-workflow.js';
import { runNicheScoring } from '../worker-modules/niche-scoring-workflow.js';

const KEEPALIVE_ALARM = 'ah-keepalive';
let stopRequested = false;
let pipelineRunning = false;
let workTabId = null;

function startKeepalive() {
  chrome.alarms.create(KEEPALIVE_ALARM, { when: Date.now() + 20000, periodInMinutes: 0.35 });
}
function stopKeepalive() {
  chrome.alarms.clear(KEEPALIVE_ALARM);
}
chrome.alarms.onAlarm.addListener(() => {});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startPipeline') {
    (async () => {
      try {
        const state = await loadRunState();
        if (pipelineRunning || state.running) {
          sendResponse({ started: false, reason: 'Pipeline already running' });
          return;
        }
        pipelineRunning = true;
        stopRequested = false;
        await updateState({ running: true, currentStep: 'Starting…', progress: '', lastStatus: null, logs: [] });
        sendResponse({ started: true });
        runFullPipeline(msg.seedKeyword || '').finally(() => { pipelineRunning = false; });
      } catch (e) {
        pipelineRunning = false;
        sendResponse({ started: false, reason: e.message });
      }
    })();
    return true;
  }

  if (msg.action === 'stopPipeline') {
    stopRequested = true;
    updateState({ stopping: true, progress: 'Stopping…' });
    sendResponse({ stopped: true });
  }

  if (msg.action === 'getState') {
    loadRunState().then(s => sendResponse(s));
    return true;
  }

  if (msg.action === 'downloadReport') {
    (async () => {
      const client = new LocalStorageClient();
      const report = await client.getReport();
      if (!report || !report.html) { sendResponse({ ok: false }); return; }
      const blob = new Blob([report.html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      await chrome.downloads.download({ url, filename: report.filename || 'amazonhunt_report.html', saveAs: false });
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.action === 'openReport') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/report/viewer.html') });
    sendResponse({ ok: true });
  }

  if (msg.action === 'clearData') {
    (async () => {
      const client = new LocalStorageClient();
      await client.clearAll();
      await saveRunState({ running: false, currentStep: null, progress: '', lastStatus: null, logs: [] });
      sendResponse({ ok: true });
    })();
    return true;
  }

  return false;
});

let stateQueue = Promise.resolve();
function enqueue(fn) {
  stateQueue = stateQueue.then(fn).catch(e => console.error('[AH]', e));
  return stateQueue;
}

async function updateState(partial) {
  return enqueue(async () => {
    const cur = await loadRunState();
    await saveRunState({ ...cur, ...partial });
  });
}

async function log(type, msg) {
  console.log(`[AH][${type}] ${msg}`);
  return enqueue(async () => {
    const state = await loadRunState();
    const logs = state.logs || [];
    logs.push({ type, msg, time: new Date().toLocaleTimeString() });
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    await saveRunState({ ...state, logs, progress: msg });
  });
}

async function getOrCreateWorkTab() {
  if (workTabId) {
    try { const t = await chrome.tabs.get(workTabId); if (t) return workTabId; } catch (_) { workTabId = null; }
  }
  // Start on amazon.com so content scripts are injected before Step 1 sends messages
  const tab = await chrome.tabs.create({ url: 'https://www.amazon.com', active: false });
  workTabId = tab.id;
  // Wait for the page to finish loading
  await new Promise(resolve => {
    const listener = (tId, info) => {
      if (tId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(resolve, 15000); // fallback
  });
  return workTabId;
}

async function closeWorkTab() {
  if (workTabId) {
    try { await chrome.tabs.remove(workTabId); } catch (_) {}
    workTabId = null;
  }
}

function navigateTab(tabId, url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, { url }, () => {
      if (chrome.runtime.lastError) { workTabId = null; return reject(new Error(chrome.runtime.lastError.message)); }
      const listener = (tId, info) => {
        if (tId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(); }, 30000);
    });
  });
}

function sendToTab(tabId, message, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error(`Tab timeout (${message.action})`)); }
    }, timeoutMs);

    function attempt(retriesLeft) {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (settled) return;
        const err = chrome.runtime.lastError;
        // Content script not yet injected — retry up to 3 times with 1s gap
        if (err && err.message.includes('Receiving end does not exist') && retriesLeft > 0) {
          setTimeout(() => attempt(retriesLeft - 1), 1000);
          return;
        }
        settled = true;
        clearTimeout(timer);
        if (err) reject(new Error(err.message));
        else resolve(response);
      });
    }
    attempt(3);
  });
}

async function runFullPipeline(seedKeyword) {
  await updateState({ running: true, stopping: false, currentStep: 'Initializing…', progress: '', lastStatus: null, logs: [] });
  await log('info', `=== AmazonHunt: Starting pipeline for "${seedKeyword}" ===`);
  startKeepalive();

  try {
    const config = await loadConfig();
    const client = new LocalStorageClient();
    const tabId = await getOrCreateWorkTab();
    const checkStop = () => stopRequested;
    const logFn = (t, m) => log(t, m);

    // Step 1
    await updateState({ currentStep: `Step 1: Discovering keywords for "${seedKeyword}"` });
    const step1 = await runKeywordDiscovery(client, tabId, config, logFn, seedKeyword, checkStop, sendToTab);
    if (stopRequested) { await finalize('stopped'); return; }
    await log('success', `Step 1 done: ${step1.count} keywords`);

    // Step 2
    await updateState({ currentStep: `Step 2: Snapshots for "${seedKeyword}"` });
    const step2 = await runSearchSnapshots(client, tabId, config, logFn, seedKeyword, checkStop, navigateTab, sendToTab);
    if (stopRequested) { await finalize('stopped'); return; }
    await log('success', `Step 2 done: ${step2.totalListings} listings from ${step2.processed} keywords`);

    // Step 3
    await updateState({ currentStep: `Step 3: Auditing listings for "${seedKeyword}"` });
    const step3 = await runListingAudit(client, tabId, config, logFn, seedKeyword, checkStop, navigateTab, sendToTab);
    if (stopRequested) { await finalize('stopped'); return; }
    await log('success', `Step 3 done: ${step3.audited} listings audited`);

    // Step 4
    await updateState({ currentStep: `Step 4: Scoring niche for "${seedKeyword}"` });
    const step4 = await runNicheScoring(client, config, logFn, seedKeyword);
    await log('success', `Step 4 done: ${step4.verdict} (${step4.goCount} GO keywords)`);

    await updateState({
      running: false,
      currentStep: `Complete — ${step4.verdict}`,
      lastStatus: 'success',
      lastSeed: seedKeyword,
      lastVerdict: step4.verdict,
    });
    await chrome.storage.local.set({ lastRunTime: Date.now() });
    await log('success', `=== Pipeline complete for "${seedKeyword}" — ${step4.verdict} ===`);

  } catch (err) {
    await log('error', `Pipeline error: ${err.message}`);
    await updateState({ running: false, lastStatus: 'error', progress: err.message });
  } finally {
    stopKeepalive();
    await closeWorkTab();
  }
}

async function finalize(status) {
  await updateState({ running: false, stopping: false, lastStatus: status });
  await log('warn', `Pipeline ${status}`);
  stopKeepalive();
  await closeWorkTab();
}

chrome.runtime.onInstalled.addListener(() => {
  saveRunState({ running: false, currentStep: null, progress: '', logs: [], lastStatus: null });
});
