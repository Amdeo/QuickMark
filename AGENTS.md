# AGENTS.md

## 项目简介

QuickMark 是一个键盘优先的 Chrome 扩展（Manifest V3），用 Cmd/Ctrl+Shift+K 打开搜索面板，模糊搜索本地书签与浏览历史。技术栈：TypeScript + React + Vite + Tailwind，测试用 Vitest。

## 构建与测试

- 每次修改代码后，运行 `npm run build` 验证构建通过，再报告完成。
- `npm test` 运行全部 Vitest 测试；单文件测试用 `npx vitest run src/xxx.test.ts`。
- `npm run dev` 启动 Vite dev server（127.0.0.1）。
- 新增功能需在 `src/**/*.test.ts(x)` 补测试（vitest，node 环境，globals 开启）。

## 目录结构与分层

- `src/background` — MV3 service worker：快捷键路由、书签/历史缓存（`chrome.storage.local`，键 `quickmark.bookmark-cache-v1`）。service worker 无 DOM。
- `src/content` — 页面内搜索面板宿主：`index.tsx`（IIFE 入口）+ `search.tsx`（ESM 拆分入口，产物名 `content-search`），Shadow DOM 隔离，骨架屏先行。
- `src/domain` — 纯书签/搜索/分组逻辑，禁止依赖 chrome API，保持可单测。
- `src/adapters` — chrome bookmarks/history/favicon API 适配层，测试中 mock。
- `src/search` — React 搜索 UI（SearchApp）与 hooks。
- `src/popup` — 极简：只向 background 发 `QUICKMARK_TRIGGER_SEARCH` 消息后关闭。
- `public/manifest.json` — MV3 manifest，构建时拷入 `dist`。
- `harness/` — 排序验证沙盒页：mock chrome API 渲染真实 SearchApp；构建命令见文件头注释，`bundle.js`/`styles.css` 是 gitignore 的产物。
- `DESIGN.md` 与 `docs/superpowers/` — 设计与迭代规格，改动 UI/排序等敏感区域前先读。

## 约定与注意事项

- 保持键盘优先、依赖精简；注释与提交信息中英文均可，参考现有历史风格。
- 构建是 `tsc` + `vite build` + tailwind + 两个 esbuild bundle 的多阶段流水线，改 `vite.config`/`tsconfig` 前确认各阶段产物不被破坏。
- MV3 的 content script 面对页面 DOM，background 面对无 DOM 的 service worker，两者约束不同。
- 搜索面板只在 http/https 页面可用，chrome:// 内页不注入。
- `src/components/Icon.tsx` 基于 lucide-react（无 `filled` prop）。
