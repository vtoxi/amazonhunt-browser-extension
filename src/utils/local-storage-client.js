// Local storage API client — all data stays on device in chrome.storage.local

export class LocalStorageClient {
  async get(key) {
    const data = await chrome.storage.local.get(key);
    return data[key] || null;
  }

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  async append(key, items) {
    const existing = await this.get(key) || [];
    const merged = [...existing, ...items];
    await this.set(key, merged);
    return merged;
  }

  async clear(key) {
    await chrome.storage.local.remove(key);
  }

  async clearAll() {
    const keys = ['ah_keywords', 'ah_snapshots', 'ah_listings', 'ah_scores', 'lastReport'];
    await chrome.storage.local.remove(keys);
  }

  // Store keywords for a seed
  async saveKeywords(seedKeyword, keywords) {
    const key = `ah_keywords_${seedKeyword}`;
    await this.set(key, { seedKeyword, keywords, savedAt: new Date().toISOString() });
  }

  async getKeywords(seedKeyword) {
    const data = await this.get(`ah_keywords_${seedKeyword}`);
    return data ? data.keywords : [];
  }

  // Store search snapshots (list of results per keyword)
  async saveSnapshot(keyword, results) {
    const key = `ah_snap_${keyword}`;
    await this.set(key, { keyword, results, savedAt: new Date().toISOString() });
  }

  async getSnapshot(keyword) {
    const data = await this.get(`ah_snap_${keyword}`);
    return data ? data.results : [];
  }

  // Store listing details keyed by ASIN
  async saveListing(asin, details) {
    const existing = await this.get('ah_listings') || {};
    existing[asin] = { ...details, savedAt: new Date().toISOString() };
    await this.set('ah_listings', existing);
  }

  async getListings() {
    return await this.get('ah_listings') || {};
  }

  async saveScores(seedKeyword, scores) {
    await this.set('ah_scores', { seedKeyword, scores, savedAt: new Date().toISOString() });
    await this.set('ah_last_seed', seedKeyword);
  }

  async getScores() {
    return await this.get('ah_scores');
  }

  async saveReport(html, meta) {
    await this.set('lastReport', { html, ...meta, savedAt: new Date().toISOString() });
  }

  async getReport() {
    return await this.get('lastReport');
  }
}
