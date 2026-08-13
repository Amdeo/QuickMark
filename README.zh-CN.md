# QuickMark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.2.0-blue.svg)](package.json)
[![Chrome: MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4.svg)](public/manifest.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](tsconfig.json)
[![Tested with Vitest](https://img.shields.io/badge/Tested%20with-Vitest-549EFF.svg)](package.json)

> **QuickMark** 是一款键盘优先的 Chrome 扩展，用于快速搜索本地书签和浏览器历史。在任何网页按下 `Cmd/Ctrl + Shift + K`，几秒内直达目标——无需输入完整网址，无需翻找书签文件夹。

[**English README**](./README.md) | [使用指南](./USAGE.md)

---

## 功能特性

- **一键唤起** — 在任意网页按 `Cmd/Ctrl + Shift + K` 弹出搜索面板
- **模糊搜索** — 基于 Fuse.js，匹配标题、URL 与域名
- **拼音搜索** — 中文书签可直接输入拼音命中（如 `zhihu` → 知乎）
- **书签 + 历史合并** — 一次搜索同时覆盖书签与浏览历史，结果按域名分组
- **域名分组卡片** — 同一站点的多条记录折叠为独立卡片，行间交替底色、清晰可辨
- **筛选** — 来源（全部 / 书签 / 历史）与时间范围（今天 / 本周 / 本月）
- **排序模式** — 智能排序 / 最近访问 / 使用频率 / 标题 A-Z / 创建时间 / 相关度优先
- **地址栏直跳** — 输入完整网址或裸域名（如 `github.com`、`localhost:3000`）回车直接跳转
- **键盘全程操作** — `Enter` 当前标签打开、`Cmd/Ctrl + Enter` 新标签打开、`Cmd/Ctrl + 1-9` 直达第 N 个结果、`Cmd/Ctrl + C` 复制链接
- **搜索历史** — 最近 5 条搜索词，一键回填或清空
- **无结果兜底** — 本地无匹配时回车一键 Google 搜索
- **主题** — 浅色 / 深色 / 跟随系统

## 安装

QuickMark 尚未上架 Chrome 应用商店，请从源码构建安装：

1. **构建扩展：**

   ```bash
   git clone https://github.com/Amdeo/QuickMark.git
   cd QuickMark
   npm install
   npm run build
   ```

2. **加载到 Chrome：**

   - 打开 `chrome://extensions`
   - 开启右上角「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择本项目的 `dist` 目录

3. **确认快捷键** — 打开 `chrome://extensions/shortcuts`，确认 QuickMark 已绑定 `Command/Ctrl + Shift + K`。已打开的标签页会自动按需注入，无需刷新页面。

## 使用方法

| 按键 | 操作 |
| --- | --- |
| `Cmd/Ctrl + Shift + K` | 打开 / 关闭搜索面板 |
| `↑ / ↓` | 选择结果 |
| `Enter` | 在当前标签页打开选中结果 |
| `Cmd/Ctrl + Enter` | 在新标签页打开选中结果 |
| `Cmd/Ctrl + 1–9` | 直达第 N 个可见结果 |
| `Cmd/Ctrl + C` | 复制选中结果的链接 |
| `← / →` | 循环切换来源筛选（全部 / 书签 / 历史） |
| `Esc` | 第一次清空搜索词，第二次关闭面板 |
| 点击分组标题 | 展开 / 折叠同一域名的结果 |

输入完整网址或裸域名（如 `kimi.com`、`localhost:3000`）后回车，可直接跳转——即使本地没有匹配结果。

> 完整的中文使用指南见 [USAGE.md](./USAGE.md)。

## 开发

```bash
npm install      # 安装依赖
npm test         # 运行 Vitest 测试
npm run build    # 类型检查、打包并输出到 dist/
npm run dev      # 启动 Vite 开发服务器
```

### 项目结构

- `src/background` — MV3 后台 Service Worker：命令路由、书签/历史缓存
- `src/content` — 页面内模态覆盖层宿主（Shadow DOM），先渲染骨架、按需加载大包
- `src/domain` — 纯书签、搜索与分组逻辑
- `src/adapters` — Chrome 书签 / 历史 / 图标 API 适配层
- `src/search` — React 搜索 UI 与 Hooks
- `public/manifest.json` — 扩展清单，构建时复制到 `dist`

书签与历史数据缓存在 `chrome.storage.local` 的 `quickmark.bookmark-cache-v1` 键下，书签或历史发生变化时后台自动刷新。缓存数据始终保存在本地浏览器，**不会上传任何数据**。

### 已知限制

- 搜索面板只能出现在普通 `http://` / `https://` 页面。Chrome 内部页面（`chrome://extensions`、应用商店、设置页）不允许扩展注入覆盖层。

## 参与贡献

欢迎贡献代码！请遵循项目既有约定：

- 保持**键盘优先**的设计与轻量依赖
- 代码注释与提交信息可使用中文或英文（参考仓库历史风格）
- 在 `src/**/*.test.ts` 中补充或更新测试，提交前运行 `npm test`
- 提交前运行 `npm run build`，确保扩展可正常打包

问题反馈与功能建议请到 [GitHub Issues](https://github.com/Amdeo/QuickMark/issues)。

## 许可证

[MIT](./LICENSE) © 2025 [Amdeo](https://github.com/Amdeo)
