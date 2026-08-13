# QuickMark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.2.0-blue.svg)](package.json)
[![Chrome: MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4.svg)](public/manifest.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](tsconfig.json)
[![Tested with Vitest](https://img.shields.io/badge/Tested%20with-Vitest-549EFF.svg)](package.json)

> **QuickMark** is a keyboard-first Chrome Extension for searching local bookmarks and browser history. Press `Cmd/Ctrl + Shift + K` on any page and jump to a bookmark or past visit in seconds — no typing full URLs, no hunting through folders.

[**中文文档**](./README.zh-CN.md) | [使用指南 (中文)](./USAGE.md)

---

## Features

- **One keystroke away** — `Cmd/Ctrl + Shift + K` opens a search palette over the current page
- **Fuzzy search** across title, URL and domain with Fuse.js
- **Pinyin search** for Chinese titles (e.g. `zhihu` finds 知乎)
- **Combined results** — bookmarks and browser history in one list, grouped by domain
- **Visual domain groups** — records of the same site collapse into distinct cards with alternating row colors
- **Filters** — source (all / bookmark / history) and time range (today / week / month)
- **Sort modes** — smart, recent, frequent, title, created, relevance
- **Address-bar semantics** — `Enter` on a complete URL or bare domain (e.g. `github.com`) navigates directly
- **Keyboard-first** — `Enter` opens in the current tab, `Cmd/Ctrl + Enter` in a new tab, `Cmd/Ctrl + 1-9` jumps to the N-th result, `Cmd/Ctrl + C` copies the URL
- **Search history** — last 5 queries, one click to re-run or clear
- **Web-search fallback** — no local results? Press `Enter` to search Google
- **Light / dark / system theme**

## Installation

QuickMark is not yet published to the Chrome Web Store. To install it from source:

1. **Build the extension:**

   ```bash
   git clone https://github.com/Amdeo/QuickMark.git
   cd QuickMark
   npm install
   npm run build
   ```

2. **Load it into Chrome:**

   - Open `chrome://extensions`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select this project's `dist` directory

3. **Verify the shortcut** — open `chrome://extensions/shortcuts` and confirm QuickMark has `Command/Ctrl + Shift + K` assigned. Existing tabs receive the modal on demand, so no page reload is needed.

## Usage

| Keys | Action |
| --- | --- |
| `Cmd/Ctrl + Shift + K` | Open / close the search palette |
| `↑ / ↓` | Navigate results |
| `Enter` | Open the selected result in the current tab |
| `Cmd/Ctrl + Enter` | Open the selected result in a new tab |
| `Cmd/Ctrl + 1–9` | Jump to the N-th visible result |
| `Cmd/Ctrl + C` | Copy the selected result's URL |
| `← / →` | Cycle source filter (all / bookmark / history) |
| `Esc` | Clear the query first, then close the palette |
| Click group header | Expand / collapse results of the same domain |

Type a complete URL or bare domain (e.g. `kimi.com`, `localhost:3000`) and press `Enter` to navigate directly, address-bar style — even when no local results match.

> A full Chinese usage guide is available in [USAGE.md](./USAGE.md).

## Development

```bash
npm install      # install dependencies
npm test         # run the Vitest test suite
npm run build    # type-check, bundle and output to dist/
npm run dev      # start the Vite dev server
```

### Project layout

- `src/background` — MV3 service worker: command routing, bookmark/history cache
- `src/content` — on-page modal overlay host (Shadow DOM), skeleton-first loading
- `src/domain` — pure bookmark, search and grouping logic
- `src/adapters` — Chrome bookmarks / history / favicon API adapters
- `src/search` — React search UI and hooks
- `public/manifest.json` — extension manifest, copied into `dist`

Bookmark and history data is cached in `chrome.storage.local` under `quickmark.bookmark-cache-v1` and refreshed in the background whenever bookmarks or history change. Cached data never leaves your browser.

### Limitations

- The palette only appears on normal `http://` / `https://` pages. Chrome internal pages (`chrome://extensions`, Web Store, settings) do not allow extension overlays.

## Contributing

Contributions are welcome! Please follow the existing conventions:

- Keep the codebase **keyboard-first** and dependency-light
- Comments and commit messages may be written in Chinese or English (see the repo history for style)
- Add or update tests in `src/**/*.test.ts` and run `npm test` before submitting
- Run `npm run build` to make sure the extension bundles cleanly

Report issues or feature ideas via [GitHub Issues](https://github.com/Amdeo/QuickMark/issues).

## License

[MIT](./LICENSE) © 2025 [Amdeo](https://github.com/Amdeo)
