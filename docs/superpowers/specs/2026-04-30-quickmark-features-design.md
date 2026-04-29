# QuickMark 功能扩展设计

## 概述

将 QuickMark 从 MVP（保存 + 搜索）扩展为具备完整书签管理能力的 Chrome 扩展，新增 save_panel、workspaces、management_dashboard、settings 四个功能模块。

## 实现顺序

1. 数据模型扩展（tags / workspaceId / notes）
2. Save Panel — 保存时确认/编辑/打标签
3. Workspaces — 工作区分组管理
4. Management Dashboard — 全量书签管理后台
5. Settings — 保存行为配置 + 快捷键展示

---

## 1. 数据模型扩展

### BookmarkItem 扩展

```typescript
type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
  lastVisitedAt?: number;
  visitCount: number;
  tags: string[];             // 新增，默认 []
  workspaceId: string | null; // 新增，默认 null
  notes: string;              // 新增，默认 ""
};
```

### Workspace 类型

```typescript
type Workspace = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
};
```

### 数据迁移

读取现有书签时做兼容填充：
- `tags: item.tags ?? []`
- `workspaceId: item.workspaceId ?? null`
- `notes: item.notes ?? ""`

### 存储键

- `quickmark.bookmarks` — 书签列表（已有）
- `quickmark.workspaces` — 工作区列表（新增）

---

## 2. Save Panel

### 触发流程

1. Background 收到 `save-current-page` 命令
2. 检查当前 tab URL 合法性（同现有逻辑）
3. 向 content script 发送 `QUICKMARK_OPEN_SAVE_PANEL`
4. Content script 注入 overlay（非全屏，中央定位）
5. 用户编辑后点击 Save，调用 `repository.saveCurrentTab(tab, options)`
6. 关闭面板

### UI 结构

- 页面标题输入框（预填充当前 tab title，可编辑）
- Workspace 下拉选择器（显示已有 workspaces，支持"无分组"选项）
- Tags 输入（回车添加 chip，点击 chip 上的 x 删除）
- Notes 多行文本框
- Cancel 按钮 + Save 按钮

### 键盘交互

- `Esc`：取消并关闭面板
- `Enter`：保存（focus 不在 textarea 时）
- 面板已打开时再次按 `Cmd+Shift+S`：直接快速保存（跳过面板）

### 快速保存模式

Settings 中提供开关"Show save panel on every save"。关闭后恢复静默保存。

---

## 3. Workspaces

### 入口

新页面 `workspaces.html`，从 extension popup 或左侧导航进入。

### 页面结构

- 顶部搜索框：按 workspace 名称过滤
- Workspace 卡片列表，每张卡片展示：
  - 名称 + 书签数量
  - 该 workspace 下最近 3 个书签的 favicon 预览
  - 悬停显示编辑/删除按钮
- 底部"Create New Workspace"按钮

### 交互

- 点击卡片展开/折叠，显示该 workspace 下全部书签
- 可从列表中移除书签（仅解除分组，不删除书签）
- 编辑 workspace：名称、颜色、描述
- 删除 workspace：确认弹窗，删除后旗下书签 `workspaceId` 置为 `null`

### 关联规则

- Workspaces 独立存储，Bookmark 通过 `workspaceId` 关联
- 删除 workspace 不级联删除书签

---

## 4. Management Dashboard

### 入口

新页面 `dashboard.html`。

### 页面结构

- 顶部：搜索框 + tag/workspace 过滤条件
- 统计卡片区：总书签数、本周新增、最常访问
- 主表格，列包括：
  - Favicon + Title + URL
  - Tags（chip 形式）
  - Visits
  - Last Visited（相对时间）
- 每行操作：Edit、Delete

### 编辑弹窗

复用 Save Panel 的表单组件，可修改标题、URL、tags、workspace、notes。

### 批量操作（可选）

多选复选框 + 顶部 toolbar：批量删除、批量修改 workspace、批量添加 tag。

---

## 5. Settings

### 入口

新页面 `settings.html`。

### 内容

- **Keyboard Shortcuts**：展示当前绑定快捷键（从 manifest 读取）。Chrome API 不允许代码动态修改，仅展示并引导用户到 `chrome://extensions/shortcuts`。
- **Save Behavior**：
  - Toggle："Show save panel on every save"（默认 on）
- **Auto-Tagging**：开关占位（后续扩展）

---

### 导航入口

新页面（workspaces / dashboard / settings）需要通过某种入口触达。采用 extension popup 菜单：
- 新增 `popup.html`，点击 browser action 图标时弹出
- 菜单项：Search（触发搜索 overlay）、Dashboard、Workspaces、Settings
- Search 项保持现有行为，其余项打开对应页面

---

## 6. 技术架构

### 新页面路由

| 页面 | 入口文件 | 根组件 |
|------|----------|--------|
| workspaces | `src/workspaces/main.tsx` | WorkspacesApp |
| dashboard | `src/dashboard/main.tsx` | DashboardApp |
| settings | `src/settings/main.tsx` | SettingsApp |

### 共享组件

- `TagInput` — tag 增删改（save_panel + dashboard 编辑共用）
- `WorkspaceSelect` — workspace 下拉选择
- `BookmarkRow` — 现有搜索页书签行，复用到 dashboard

### Content Script 扩展

`src/content/index.tsx` 目前只处理搜索 overlay。扩展为同时处理 save_panel overlay：
- 搜索和保存面板共用 shadow DOM CSS 注入逻辑
- 挂载到不同 host ID（`quickmark-overlay-root` vs `quickmark-save-panel-root`）

### 数据流

- 所有页面通过 `BookmarkRepository` 和 `WorkspaceRepository` 直接读写 `chrome.storage.local`
- 无后端，保持现有 useState + custom hooks 的轻量模式
- 各页面通过 storage 变化事件同步（`chrome.storage.onChanged`）

### Repository 扩展

`BookmarkRepository` 扩展：
- `saveCurrentTab(tab, options: { tags?, workspaceId?, notes? })` — 支持传入额外字段
- `update(id, patch)` — 更新书签字段
- `listByWorkspace(workspaceId)` — 按工作区过滤

新增 `WorkspaceRepository`：
- `list()` / `get(id)` / `create(workspace)` / `update(id, patch)` / `remove(id)`

---

## 7. 样式规范

沿用现有 `stitch_UI/velocity_dark` 设计系统：
- Surface 色值：`#111317`
- Primary：`#aec6ff`
- 字体：Inter
- 圆角：`0.5rem` 为默认
- 边框：`#1F2430` 1px
