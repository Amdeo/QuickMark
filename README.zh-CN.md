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
- **独立结果列表** — 一次搜索同时覆盖书签与浏览历史；不再按域名折叠，也不额外插入首页
- **固定网站** — 最多固定 8 个网址，筛选栏内仅以图标单行展示，`Cmd/Ctrl + 1–8` 直接打开
- **筛选** — 来源用胶囊按钮（全部 / 书签 / 历史），时间范围（全部时间 / 今天 / 本周 / 本月）与排序合并进同一个下拉，按钮上显示已生效的非默认选项
- **记住排序模式** — 智能排序 / 最近访问 / 使用频率 / 标题 A-Z / 创建时间 / 相关度优先；智能排序结合最近访问与随时间衰减的使用频率，不把新建书签当成最近访问
- **地址栏直跳** — 输入完整网址或裸域名（如 `github.com`、`localhost:3000`）回车直接跳转
- **键盘全程操作** — `Enter` 当前标签打开、`Cmd/Ctrl + Enter` 新标签打开、`Cmd/Ctrl + 1-9` 直达第 N 个结果、`Cmd/Ctrl + C` 复制链接
- **搜索历史** — 最近 5 条搜索词；搜索框为空时按 `Space` 打开下拉，↑↓ 选择、回车回填，下拉底部可一次清空
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
| `Cmd/Ctrl + 1–9` | 打开第 N 个固定图标，之后顺延到第 N 条结果——固定区可见时图标先占号；输入关键词后数字键直接对应结果 |
| `Cmd/Ctrl + C` | 复制选中结果的链接 |
| `Alt + ← / →` | 循环切换来源筛选；普通左右键用于移动搜索光标 |
| `Space` | 搜索框为空时打开最近搜索下拉（↑↓ 移动、回车回填）；有输入时空格照常输入 |
| `Esc` | 第一次清空搜索词，第二次关闭面板 |
| `Alt + P` | 固定 / 取消固定选中结果 |

输入完整网址或裸域名（如 `kimi.com`、`localhost:3000`）后回车，可直接跳转——即使本地没有匹配结果。

固定网站保留完整网址及手动添加顺序，不随排序自动变化；即使原书签或历史记录被删除，快捷入口仍保留。点击结果右侧图钉即可添加；固定区就在筛选栏里、来源筛选右侧，只显示图标（行首一个钉子标记说明用途，图标左上角数字就是它的快捷键）；没有固定任何网站时不占位，悬停可看到名称、快捷键和完整网址，拖拽图标可调整顺序，点击图标上角的小按钮取消固定。结果行角标始终等于它真实的数字键：固定了 N 个时，第一条结果是 `Cmd/Ctrl + N+1`。固定区在搜索词为空时显示，固定网站和排序模式均在本地保存，下次打开恢复。有关键词时优先匹配程度，所选排序用于相近结果；没有关键词时，“最近访问”只按实际访问时间，“使用频率”按访问次数。

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
- `src/content` — 页面内模态覆盖层宿主（Shadow DOM）；搜索大包按需加载，加载超过 120ms 才用骨架面板占位
- `src/domain` — 纯书签、搜索与排序逻辑
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
