// Step 3: Audit individual Amazon product pages for BSR and competition signals

import { RateLimiter } from '../utils/rate-limiter.js';

export async function runListingAudit(client, tabId, config, log, seedKeyword, checkStop, navigateTab, sendToTab) {
  const keywords = await client.getKeywords(seedKeyword);
  const maxPerKw = parseInt(config.max_listings_per_keyword) || 10;
  const delay = Math.max(parseInt(config.delay_between_pages_sec) || 7, 5) * 1000;
  const limiter = new RateLimiter(delay);

  // Collect ASINs to audit (top N per keyword, deduplicated)
  const asinsToAudit = new Map(); // asin -> keyword
  for (const keyword of keywords) {
    const snap = await client.getSnapshot(keyword);
    let count = 0;
    for (const item of snap) {
      if (item.asin && !asinsToAudit.has(item.asin) && count < maxPerKw) {
        asinsToAudit.set(item.asin, keyword);
        count++;
      }
    }
  }

  const total = asinsToAudit.size;
  let audited = 0;
  await log('info', `Auditing ${total} unique ASINs`);

  for (const [asin, keyword] of asinsToAudit) {
    if (checkStop()) break;
    audited++;
    await log('info', `[${audited}/${total}] Auditing listing ${asin} (from "${keyword}")`);

    try {
      await limiter.wait();
      await navigateTab(tabId, `https://www.amazon.com/dp/${asin}`);
      await new Promise(r => setTimeout(r, 3500)); // wait for content scripts to inject

      const res = await sendToTab(tabId, { action: 'extractListingData', asin }, 20000);
      if (res && res.ok && res.data) {
        await client.saveListing(asin, { ...res.data, keyword });
        await log('success', `${asin}: BSR #${res.data.bsr || '?'}, ${res.data.reviewCount} reviews`);
      } else {
        await log('warn', `${asin}: extraction failed`);
      }
    } catch (err) {
      await log('warn', `${asin}: ${err.message}`);
    }
  }

  return { audited, total };
}
