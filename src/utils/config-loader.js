const DEFAULTS = {
  max_keywords_per_run: 20,
  delay_between_pages_sec: 7,
  max_listings_per_keyword: 10,
  max_reviews_beatable: 1000,
  min_beatable_slots: 3,
  min_price_usd: 10,
};

export async function loadConfig() {
  const data = await chrome.storage.local.get('config');
  return { ...DEFAULTS, ...(data.config || {}) };
}

export async function saveConfig(config) {
  await chrome.storage.local.set({ config });
}

export async function loadRunState() {
  const data = await chrome.storage.local.get('runState');
  return data.runState || {};
}

export async function saveRunState(state) {
  await chrome.storage.local.set({ runState: state });
}
