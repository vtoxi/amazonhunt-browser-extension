// Fetches Amazon autocomplete suggestions from the public completion API.
// Runs on amazon.com pages so CORS is not an issue.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'getAutocomplete') return false;

  const prefix = encodeURIComponent(msg.prefix || '');
  // alias=aps + site-variant/version/event are required for non-empty results (verified live)
  const url = `https://completion.amazon.com/api/2017/suggestions?limit=20&prefix=${prefix}&alias=aps&site-variant=desktop&version=3&event=onkeypress&lop=en_US&mid=ATVPDKIKX0DER&plain-mid=1&client-info=amazon-search-ui`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const keywords = (data.suggestions || [])
        .filter(s => s.type === 'KEYWORD')
        .map(s => s.value)
        .filter(Boolean);
      sendResponse({ ok: true, keywords });
    })
    .catch(err => sendResponse({ ok: false, error: err.message, keywords: [] }));

  return true; // async
});
