# Chrome Web Store Listing — AmazonHunt

Submit at: https://chrome.google.com/webstore/devconsole

## Privacy policy URL

https://github.com/vtoxi/AmazonHunt/blob/main/PRIVACY.md

## Listing fields

### Name
AmazonHunt — Amazon Niche Research

### Short description (≤132 characters)
Free local Amazon niche research: discover keywords, audit listings, and download scored niche reports. No account needed.

### Detailed description

AmazonHunt helps Amazon sellers and entrepreneurs research product niches directly in Chrome — for free.

Run a 4-step pipeline from one seed keyword:

1. Discover related keywords using Amazon's own autocomplete (alphabet-soup method)
2. Snapshot top search results for each keyword (ASIN, price, reviews, Prime, sponsored)
3. Audit listing pages for Best Sellers Rank, review count, seller type, and more
4. Score the niche and download an HTML report with a GO / MAYBE / NO-GO verdict

Everything is local-first. Your research data stays in your browser. No AmazonHunt account. No API key. No subscription.

Features:
• Keyword discovery via Amazon autocomplete — uncovers keywords sellers actually search
• Configurable pipeline: keywords per run, page delay, beatable review threshold, price floor
• Full BSR, review count, and seller-type data per listing
• Activity log with copy support
• Downloadable niche reports (GO / MAYBE / NO-GO)

How to use:
1. Install AmazonHunt and pin it
2. Enter a seed keyword (for example: yoga mat, dog toy)
3. Click Run full research
4. When finished, your HTML report opens automatically

Notes:
• Use a page delay of at least 7 seconds
• Runs take 20–60 minutes depending on settings
• Works only on amazon.com (US store)

AmazonHunt is free and open source (MIT): https://github.com/vtoxi/AmazonHunt

### Category
Productivity

### Language
English

## Privacy practices

- **Website content** — Yes (reads amazon.com page content during runs you start)
- **Personally identifiable information** — No
- **Does not sell data** — Yes
- **Limited Use** — Certify yes

Remote code: No
Single purpose: Amazon niche research automation

## Permission justifications

**storage**
Stores settings, seed keywords, research results (keywords, snapshots, listings, scores), and activity logs in chrome.storage.local on the user's device.

**tabs**
Creates and controls browser tabs used during a research run, so the extension can open Amazon search and product pages, wait for them to load, and collect publicly visible niche data.

**scripting**
Injects content scripts into Amazon pages during a user-started run to extract search results and product data.

**alarms**
Keeps the Manifest V3 service worker alive during long research runs. Without alarms, Chrome suspends the worker mid-pipeline.

**downloads**
Saves the generated HTML niche report to the user's Downloads folder when a run completes.

**Host permission: https://www.amazon.com/***
Required to open Amazon search and product pages and read publicly visible niche signals during user-started runs.

**Host permission: https://completion.amazon.com/***
Required to fetch Amazon's public autocomplete suggestions used in Step 1 keyword discovery.

## Screenshots

Create 1280×800 screenshots from the HTML files in `store/screenshots/`:

| # | File | Shows |
|---|------|-------|
| 1 | `01-seed-research.html` | Popup with seed input and Run button |
| 2 | `02-in-progress.html` | Pipeline running with live log |
| 3 | `03-results-report.html` | Completed run, GO verdict + download |
| 4 | `04-report-preview.html` | Sample niche report table |

## Developer checklist

- [ ] Run `.\scripts\generate-icons.ps1` to create icons
- [ ] Run `.\scripts\package.ps1` to create the ZIP
- [ ] Load unpacked and test a short run (5 keywords)
- [ ] Confirm privacy URL opens in Incognito
- [ ] Upload ZIP from `dist/`
- [ ] Paste listing copy + permission justifications
- [ ] Upload screenshots (1280×800 PNG)
- [ ] Complete privacy practices form
- [ ] Submit for review
