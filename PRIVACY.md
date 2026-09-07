# Privacy Policy — AmazonHunt

**Last updated:** September 7, 2026

AmazonHunt ("the Extension") is a free Chrome extension for local Amazon niche research.

## Summary

AmazonHunt keeps your research data on your device. It does not require an account, does not sell data, and does not send your results to any server.

## Data stored locally

The Extension stores the following in `chrome.storage.local` on your computer:

- Seed keywords you enter
- Settings you configure
- Keywords, search snapshots, listing audits, and scores from your runs
- Generated HTML reports

This data stays on your device. Clearing extension data or uninstalling AmazonHunt removes it.

## Website content accessed

When you start a research run, the Extension opens browser tabs and reads publicly visible page content from:

- **amazon.com** — to run keyword discovery, capture search results, and audit listing pages
- **completion.amazon.com** — to fetch keyword autocomplete suggestions (public API, no login required)

Content is processed locally. The Extension does not upload results to any AmazonHunt backend.

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save settings and local research data |
| `tabs` | Open and control research tabs on Amazon |
| `scripting` | Inject content scripts into Amazon pages during a run |
| `alarms` | Keep long research runs alive under Manifest V3 |
| `downloads` | Save HTML niche reports to your Downloads folder |
| Host access to `amazon.com` | Read Amazon search and listing pages during a run |
| Host access to `completion.amazon.com` | Fetch autocomplete keyword suggestions |

## Data we do not collect

AmazonHunt does not:
- Require signup or login
- Sell or rent personal data
- Use research data for advertising
- Track browsing outside runs you start
- Send analytics or telemetry

## Contact

Questions: open an issue at https://github.com/vtoxi/AmazonHunt
