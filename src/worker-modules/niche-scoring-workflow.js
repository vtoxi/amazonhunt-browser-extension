// Step 4: Score the niche and generate an HTML report

export async function runNicheScoring(client, config, log, seedKeyword) {
  await log('info', `Scoring niche: "${seedKeyword}"`);

  const keywords = await client.getKeywords(seedKeyword);
  const listings = await client.getListings();
  const maxReviewsBeatable = parseInt(config.max_reviews_beatable) || 1000;
  const minBeatableSlots = parseInt(config.min_beatable_slots) || 3;
  const minPrice = parseInt(config.min_price_usd) || 10;

  const kwScores = [];

  for (const keyword of keywords) {
    const snap = await client.getSnapshot(keyword);
    if (!snap || !snap.length) continue;

    const nonSponsored = snap.filter(r => !r.sponsored);
    const withPrices = nonSponsored.filter(r => r.price > 0);
    const avgPrice = withPrices.length
      ? withPrices.reduce((s, r) => s + r.price, 0) / withPrices.length : 0;

    // Enrich with audit data
    const enriched = snap.map(r => ({ ...r, ...(listings[r.asin] || {}) }));
    const withReviews = enriched.filter(r => r.reviewCount >= 0);
    const avgReviews = withReviews.length
      ? withReviews.reduce((s, r) => s + r.reviewCount, 0) / withReviews.length : 9999;

    const beatable = withReviews.filter(r => r.reviewCount < maxReviewsBeatable);
    const beatableCount = beatable.length;

    // BSR proxy: best BSR seen (lower is better — means there's demand)
    const bsrs = enriched.filter(r => r.bsr).map(r => r.bsr);
    const bestBsr = bsrs.length ? Math.min(...bsrs) : null;

    // Score 0-100
    let score = 0;
    // Competition (lower reviews = higher score), max 40pts
    score += Math.min(40, (maxReviewsBeatable / Math.max(avgReviews, 1)) * 40);
    // Beatable slots, max 30pts
    score += Math.min(30, (beatableCount / 5) * 30);
    // Price viability, max 20pts
    score += avgPrice >= minPrice ? Math.min(20, (avgPrice / 30) * 20) : 0;
    // Demand (BSR < 100k = good), max 10pts
    if (bestBsr && bestBsr < 100000) score += 10;
    else if (bestBsr && bestBsr < 500000) score += 5;

    score = Math.round(Math.min(100, score));

    kwScores.push({
      keyword,
      score,
      avgPrice: Math.round(avgPrice * 100) / 100,
      avgReviews: Math.round(avgReviews),
      beatableCount,
      totalListings: snap.length,
      bestBsr,
      verdict: score >= 60 ? 'GO' : score >= 40 ? 'MAYBE' : 'NO-GO',
    });
  }

  kwScores.sort((a, b) => b.score - a.score);

  // Overall verdict: best keyword score
  const bestScore = kwScores.length ? kwScores[0].score : 0;
  const goCount = kwScores.filter(k => k.verdict === 'GO').length;
  const verdict = goCount >= minBeatableSlots ? 'GO' : bestScore >= 40 ? 'MAYBE' : 'NO-GO';

  await log('success', `Niche verdict: ${verdict} (${goCount} GO keywords, best score: ${bestScore})`);

  const html = buildReport(seedKeyword, verdict, kwScores, config);
  await client.saveReport(html, {
    seedKeyword,
    verdict,
    filename: `amazonhunt_${seedKeyword.replace(/\s+/g, '_')}_report.html`,
    kwCount: kwScores.length,
    goCount,
  });

  return { verdict, kwScores, goCount };
}

function buildReport(seedKeyword, verdict, kwScores, config) {
  const ts = new Date().toLocaleString();
  const verdictColor = verdict === 'GO' ? '#15803d' : verdict === 'MAYBE' ? '#a16207' : '#b91c1c';
  const verdictBg = verdict === 'GO' ? '#dcfce7' : verdict === 'MAYBE' ? '#fef9c3' : '#fee2e2';

  const rows = kwScores.map(k => {
    const vc = k.verdict === 'GO' ? '#15803d' : k.verdict === 'MAYBE' ? '#a16207' : '#b91c1c';
    const vb = k.verdict === 'GO' ? '#dcfce7' : k.verdict === 'MAYBE' ? '#fef9c3' : '#fee2e2';
    return `<tr>
      <td>${esc(k.keyword)}</td>
      <td><b>${k.score}</b>/100</td>
      <td>$${k.avgPrice}</td>
      <td>${k.avgReviews.toLocaleString()}</td>
      <td>${k.beatableCount}</td>
      <td>${k.bestBsr ? '#' + k.bestBsr.toLocaleString() : '—'}</td>
      <td style="background:${vb};color:${vc};font-weight:700;text-align:center">${k.verdict}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AmazonHunt Report — ${esc(seedKeyword)}</title>
<style>
  :root { --ink:#1a1a1a; --mute:#666; --line:#e5e7eb; --paper:#f9fafb; --orange:#FF9900; --dark:#232F3E; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Segoe UI",Arial,sans-serif; background:var(--paper); color:var(--ink); font-size:14px; }
  .header { background:var(--dark); color:#fff; padding:28px 32px; }
  .header h1 { font-size:22px; font-weight:800; letter-spacing:-0.02em; }
  .header .sub { margin-top:4px; font-size:13px; color:#a8b4c0; }
  .verdict-banner { display:inline-flex; align-items:center; gap:10px; margin-top:16px; padding:10px 20px; border-radius:999px; font-size:18px; font-weight:800; background:${verdictBg}; color:${verdictColor}; }
  .container { max-width:900px; margin:28px auto; padding:0 20px 40px; }
  .meta { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
  .meta-item { padding:12px 16px; background:#fff; border:1px solid var(--line); border-radius:10px; }
  .meta-item .label { font-size:11px; font-weight:700; text-transform:uppercase; color:var(--mute); letter-spacing:.05em; }
  .meta-item .value { font-size:20px; font-weight:800; margin-top:2px; }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  th { background:var(--dark); color:#fff; padding:10px 12px; text-align:left; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
  td { padding:10px 12px; border-bottom:1px solid var(--line); font-size:13px; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#f8fafc; }
  .footer { margin-top:24px; font-size:11px; color:var(--mute); text-align:center; }
  .settings-note { margin-top:16px; padding:12px 14px; border-radius:8px; background:#fff; border:1px solid var(--line); font-size:12px; color:var(--mute); }
</style>
</head>
<body>
<div class="header">
  <h1>AmazonHunt Niche Report</h1>
  <div class="sub">Seed: <b>${esc(seedKeyword)}</b> &nbsp;·&nbsp; Generated ${ts}</div>
  <div class="verdict-banner">${verdict === 'GO' ? '✅' : verdict === 'MAYBE' ? '⚠️' : '❌'} ${verdict}</div>
</div>
<div class="container">
  <div class="meta">
    <div class="meta-item"><div class="label">Keywords Scored</div><div class="value">${kwScores.length}</div></div>
    <div class="meta-item"><div class="label">GO Keywords</div><div class="value" style="color:#15803d">${kwScores.filter(k=>k.verdict==='GO').length}</div></div>
    <div class="meta-item"><div class="label">Best Score</div><div class="value">${kwScores.length ? kwScores[0].score : 0}/100</div></div>
    <div class="meta-item"><div class="label">Beatable Threshold</div><div class="value">&lt;${parseInt(config.max_reviews_beatable)||1000} reviews</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Keyword</th>
        <th>Score</th>
        <th>Avg Price</th>
        <th>Avg Reviews</th>
        <th>Beatable Sellers</th>
        <th>Best BSR</th>
        <th>Verdict</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="settings-note">
    <b>Settings used:</b> ${config.max_keywords_per_run||20} keywords per run · ${config.max_listings_per_keyword||10} listings per keyword · ${config.delay_between_pages_sec||7}s page delay · Beatable = &lt;${config.max_reviews_beatable||1000} reviews · Min $${config.min_price_usd||10} price
  </div>

  <p class="footer">AmazonHunt · Free local niche research · Data stays on your device</p>
</div>
</body>
</html>`;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
