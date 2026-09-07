// Extracts product detail data from an Amazon product page.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'extractListingData') return false;

  try {
    const asin = msg.asin || document.querySelector('#ASIN')?.value || '';

    // BSR — appears in product details bullets or table
    let bsr = null;
    let bsrCategory = '';

    // Try detail bullets (most product pages)
    const bullets = document.querySelectorAll('#detailBulletsWrapper_feature_div li, #detailBullets_feature_div li');
    for (const li of bullets) {
      const text = li.textContent;
      if (text.includes('Best Sellers Rank')) {
        const match = text.match(/#([\d,]+)\s+in\s+([^(#\n]+)/);
        if (match) {
          bsr = parseInt(match[1].replace(/,/g, ''));
          bsrCategory = match[2].trim();
          break;
        }
      }
    }

    // Try product details table (alternate layout)
    if (!bsr) {
      const rows = document.querySelectorAll('#productDetails_detailBullets_sections1 tr, #prodDetails tr');
      for (const row of rows) {
        const th = row.querySelector('th');
        if (th && th.textContent.includes('Best Sellers Rank')) {
          const td = row.querySelector('td');
          const match = td ? td.textContent.match(/#([\d,]+)\s+in\s+([^(#\n]+)/) : null;
          if (match) {
            bsr = parseInt(match[1].replace(/,/g, ''));
            bsrCategory = match[2].trim();
            break;
          }
        }
      }
    }

    // Review count
    const reviewEl = document.querySelector('#acrCustomerReviewText') ||
                     document.querySelector('[data-hook="total-review-count"]');
    const reviewCount = reviewEl ? parseInt(reviewEl.textContent.replace(/[^0-9]/g, '')) || 0 : 0;

    // Rating
    const ratingEl = document.querySelector('#acrPopover') ||
                     document.querySelector('[data-hook="rating-out-of-text"]');
    const ratingText = ratingEl ? ratingEl.getAttribute('title') || ratingEl.textContent : '';
    const rating = parseFloat(ratingText) || 0;

    // Q&A count
    const qaEl = document.querySelector('#askATFLink') || document.querySelector('#qa-overview-title');
    const qaText = qaEl ? qaEl.textContent : '';
    const qaCount = parseInt(qaText.replace(/[^0-9]/g, '')) || 0;

    // Date first available — check bullets first, then table rows
    let dateAvailable = '';
    for (const li of bullets) {
      if (li.textContent.includes('Date First Available')) {
        const parts = li.textContent.split(':');
        dateAvailable = parts[1] ? parts[1].trim() : '';
        break;
      }
    }
    if (!dateAvailable) {
      for (const row of document.querySelectorAll('#productDetails_detailBullets_sections1 tr, #prodDetails tr')) {
        const th = row.querySelector('th');
        if (th && th.textContent.includes('Date First Available')) {
          dateAvailable = row.querySelector('td')?.textContent?.trim() || '';
          break;
        }
      }
    }

    // Seller type — FBA vs seller-fulfilled vs Amazon direct
    const merchantEl = document.querySelector('#merchant-info') ||
                       document.querySelector('#sellerProfileTriggerId');
    const merchantText = merchantEl ? merchantEl.textContent.trim() : '';
    const sellerType = merchantText.toLowerCase().includes('amazon') ? 'Amazon' :
                       merchantText ? 'Third-party' : 'Unknown';

    // Variations count
    const variationEls = document.querySelectorAll('#variation_style_name li, #variation_color_name li, .variation-select option');
    const variationCount = variationEls.length;

    sendResponse({
      ok: true,
      data: { asin, bsr, bsrCategory, reviewCount, rating, qaCount, dateAvailable, sellerType, variationCount }
    });
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
  }

  return false;
});
