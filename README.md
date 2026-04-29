# QuickMark

QuickMark is a keyboard-first Chrome Extension for saving and searching local bookmarks.

## MVP Features

- `Command/Ctrl + Shift + S`: save the current tab to `chrome.storage.local`
- `Command/Ctrl + Shift + K`: show a modal search palette over the current webpage
- Fuzzy search by title, URL, and domain with Fuse.js
- `Enter`: open the selected result in the current tab
- `Command/Ctrl + Enter`: open the selected result in a new tab
- `Delete` or `Command/Ctrl + Backspace`: remove the selected bookmark

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

- `src/background`: MV3 service worker, command routing, active-tab saving
- `src/content`: current-page modal overlay host
- `src/domain`: pure bookmark and search logic
- `src/repositories`: repository pattern over `chrome.storage.local`
- `src/search`: React search page and hooks
- `public/manifest.json`: extension manifest copied into `dist`

Data stays local in `chrome.storage.local` under `quickmark.bookmarks`.

## Shortcut Notes

If a shortcut does not fire, open `chrome://extensions/shortcuts` and confirm QuickMark has the expected keys assigned. Existing tabs are supported: the background worker injects the modal content script on demand when the page did not receive the automatic content script yet.

The modal can only appear on normal `http://` and `https://` pages. Chrome internal pages such as `chrome://extensions`, the Chrome Web Store, and browser settings pages do not allow extension overlays.
