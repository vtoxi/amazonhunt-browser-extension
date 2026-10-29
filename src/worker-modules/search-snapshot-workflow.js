// Step 2: Snapshot Amazon search results for each keyword

import { RateLimiter } from '../utils/rate-limiter.js';

export async function runSearchSnapshots(client, tabId, config, log, seedKeyword, checkStop, navigateTab, sendToTab) {
  const keywords = await client.getKeywords(seedKeyword);
  if (!keywords.length) throw new Error('No keywords found — run Step 1 first');

  const delay = Math.max(parseInt(config.delay_between_pages_sec) || 7, 5) * 1000;
  const limiter = new RateLimiter(delay);

  let totalListings = 0;
  let processed = 0;

  for (const keyword of keywords) {
    if (checkStop()) break;
    processed++;
    await log('info', `[${processed}/${keywords.length}] Searching Amazon for "${keyword}"`);

    try {
      await limiter.wait();
      const url = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&ref=sr_pg_1`;
      await navigateTab(tabId, url);
      await new Promise(r => setTimeout(r, 3500)); // wait for content scripts to inject

      const res = await sendToTab(tabId, { action: 'extractSearchResults' }, 20000);
      if (res && res.ok && Array.isArray(res.results)) {
        await client.saveSnapshot(keyword, res.results);
        totalListings += res.results.length;
        await log('success', `"${keyword}" → ${res.results.length} results`);
      } else {
        await log('warn', `"${keyword}" → no results extracted`);
      }
    } catch (err) {
      await log('warn', `Snapshot failed for "${keyword}": ${err.message}`);
    }
  }

  return { processed, totalListings };
}
