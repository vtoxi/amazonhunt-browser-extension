// Step 1: Discover keywords via Amazon autocomplete (alphabet soup method)

import { RateLimiter } from '../utils/rate-limiter.js';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export async function runKeywordDiscovery(client, tabId, config, log, seedKeyword, checkStop, sendToTab) {
  await log('info', `Discovering keywords for: "${seedKeyword}"`);

  const maxKeywords = parseInt(config.max_keywords_per_run) || 20;
  // Autocomplete is an API call, not a page load — 1.5s is enough to avoid rate limiting
  const limiter = new RateLimiter(1500);

  // Wait for content script to be ready in the tab
  await new Promise(r => setTimeout(r, 2000));

  const found = new Set();
  const prefixes = [seedKeyword, ...ALPHABET.map(l => `${seedKeyword} ${l}`)];

  for (const prefix of prefixes) {
    if (checkStop()) break;
    if (found.size >= maxKeywords * 3) break; // collect extra, then trim

    try {
      await limiter.wait();
      const res = await sendToTab(tabId, { action: 'getAutocomplete', prefix }, 15000);
      if (res && res.ok && Array.isArray(res.keywords)) {
        for (const kw of res.keywords) {
          if (kw && kw.toLowerCase() !== seedKeyword.toLowerCase()) {
            found.add(kw.toLowerCase().trim());
          }
        }
      }
      await log('info', `[${Math.min(found.size, maxKeywords)}/${maxKeywords}] Autocomplete for "${prefix}" → ${res?.keywords?.length || 0} suggestions`);
    } catch (err) {
      await log('warn', `Autocomplete failed for "${prefix}": ${err.message}`);
    }
  }

  // Always include the seed itself
  found.add(seedKeyword.toLowerCase().trim());
  const keywords = [...found].slice(0, maxKeywords);

  await client.saveKeywords(seedKeyword, keywords);
  await log('success', `Discovered ${keywords.length} keywords for "${seedKeyword}"`);

  return { keywords, count: keywords.length };
}
