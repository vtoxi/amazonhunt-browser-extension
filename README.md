# AmazonHunt

Free Chrome extension for Amazon niche research. Discover keywords, snapshot search results, audit listings, and download scored HTML reports — all from your browser. No account. No API keys. Data stays on your device.

## Features

- **4-step pipeline** — keyword discovery → search snapshots → listing audit → niche scoring
- **Alphabet soup autocomplete** — uncovers related keywords Amazon suggests for your seed
- **Local-first** — all data stored in Chrome on your machine
- **HTML reports** — downloadable GO / MAYBE / NO-GO niche reports
- **Configurable** — keywords per run, delays, beatable review thresholds, price floors

## Install (developer / sideload)

1. Download or clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select this folder
5. Pin **AmazonHunt** to your toolbar

## Package for Chrome Web Store

```powershell
.\scripts\package.ps1
```

Upload the ZIP from `dist/` in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Quick start

1. Open the extension popup
2. Enter a seed keyword (e.g. `yoga mat`, `dog toy`)
3. Click **Run full research**
4. Wait for the pipeline to complete — report downloads automatically

## Pipeline

| Step | Name | What it does |
|------|------|--------------|
| 1 | Discover | Finds related keywords via Amazon autocomplete (alphabet soup) |
| 2 | Snapshot | Captures top search results for each keyword |
| 3 | Audit | Opens listings and reads BSR, reviews, price, seller type |
| 4 | Score | Grades keywords and produces a niche report |

## Settings

| Setting | Default | Notes |
|---------|---------|-------|
| Keywords / run | 20 | Searched and audited |
| Page delay | 7 sec | Minimum 5 — Amazon rate-limits fast scraping |
| Listings / keyword | 10 | Audit depth |
| Beatable reviews | 1000 | Sellers under this count = beatable |
| Min beatable slots | 3 | Per keyword for GO verdict |
| Min price (USD) | $10 | Price viability floor |

## Privacy

No login required. Research data (keywords, snapshots, audits, scores) lives in `chrome.storage.local`. Uninstalling removes it.

Full policy: [PRIVACY.md](PRIVACY.md)

## License

MIT — free for personal and commercial use.
