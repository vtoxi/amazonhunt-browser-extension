// Extracts search result listings from an Amazon search results page.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'extractSearchResults') return false;

  try {
    const results = [];
    const items = document.querySelectorAll('[data-component-type="s-search-result"][data-asin]');

    for (const item of items) {
      const asin = item.getAttribute('data-asin');
      if (!asin || asin.length < 5) continue;

      // Title — pick the longest leaf span inside h2 to skip the short "Sponsored" spans
      const titleSpans = [...item.querySelectorAll('h2 span')].filter(s => !s.querySelector('span'));
      const titleEl = titleSpans.sort((a, b) => b.textContent.length - a.textContent.length)[0] ||
                      item.querySelector('h2');
      const title = titleEl ? titleEl.textContent.trim().replace(/^Sponsored\s*/i, '') : '';

      // Price — grab the first offscreen price (screen-reader text with full price)
      const priceEl = item.querySelector('.a-price .a-offscreen');
      const priceText = priceEl ? priceEl.textContent.trim() : '';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

      // Rating
      const ratingEl = item.querySelector('.a-icon-star-small .a-icon-alt') ||
                       item.querySelector('[class*="a-star"] .a-icon-alt');
      const ratingText = ratingEl ? ratingEl.textContent : '';
      const rating = parseFloat(ratingText) || 0;

      // Review count
      const reviewEl = item.querySelector('[aria-label*="ratings"]') ||
                       item.querySelector('.a-size-small .a-link-normal[href*="reviews"]');
      const reviewText = reviewEl ? (reviewEl.getAttribute('aria-label') || reviewEl.textContent) : '';
      const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, '')) || 0;

      // Sponsored?
      const sponsored = !!(item.querySelector('.s-sponsored-label-text') ||
                           item.querySelector('[aria-label="Sponsored"]') ||
                           item.textContent.includes('Sponsored'));

      // Prime?
      const prime = !!(item.querySelector('.a-icon-prime') || item.querySelector('[aria-label="Amazon Prime"]'));

      // URL — construct from ASIN to avoid sponsored javascript:void(0) links
      const url = asin ? `https://www.amazon.com/dp/${asin}` : '';

      if (asin && title) {
        results.push({ asin, title, price, rating, reviewCount, sponsored, prime, url });
      }
    }

    sendResponse({ ok: true, results });
  } catch (err) {
    sendResponse({ ok: false, error: err.message, results: [] });
  }

  return false;
});
