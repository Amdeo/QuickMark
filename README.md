# QuickMark

QuickMark is a keyboard-first Chrome Extension for searching local bookmarks and browser history.

## Features

- `Command/Ctrl + Shift + K`: show a modal search palette over the current webpage
- Fuzzy search by title, URL, and domain with Fuse.js
- Combined bookmark + history results, grouped by domain
- Filters: source (all / bookmark / history), time range (today / week / month)
- Sort modes: smart, recent, frequent, title, created, relevance
- `Enter`: open the selected result in the current tab
- `Enter` on a complete URL/domain (e.g. `github.com`): navigate directly, address-bar style
- `Command/Ctrl + Enter`: open the selected result in a new tab
- `Command/Ctrl + 1-9`: jump to the N-th visible result
- `Command/Ctrl + C`: copy the selected result's URL
- `Esc`: clear the query first, then close the palette
- Search history (last 5 queries), web-search fallback for no results
- Light / dark / system theme toggle

## Development

```bash
npm install
npm test
npm run build
```

Load the extension from `dist` in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click “Load unpacked”
4. Select this project’s `dist` directory

## Architecture

- `src/background`: MV3 service worker, command routing, bookmark cache
- `src/content`: current-page modal overlay host (Shadow DOM)
- `src/domain`: pure bookmark and search logic
- `src/adapters`: Chrome bookmarks/history/favicon API adapters
- `src/search`: React search UI and hooks
- `public/manifest.json`: extension manifest copied into `dist`

Bookmark and history data is cached in `chrome.storage.local` under `quickmark.bookmark-cache-v1`, refreshed in the background when bookmarks or history change.

## Shortcut Notes

If a shortcut does not fire, open `chrome://extensions/shortcuts` and confirm QuickMark has the expected keys assigned. Existing tabs are supported: the background worker injects the modal content script on demand when the page did not receive the automatic content script yet.

The modal can only appear on normal `http://` and `https://` pages. Chrome internal pages such as `chrome://extensions`, the Chrome Web Store, and browser settings pages do not allow extension overlays.
