# QuickMark 书签管理丰富化 — 第一阶段设计

> **Goal:** 给书签增加「稍后阅读/收藏」状态管理和批量操作能力，提升日常整理效率。

**Scope:** 第一阶段只包含两个核心功能：状态标记 + 批量操作。重复检测与关联推荐留在第二阶段。

---

## 1. 数据模型变更

在 `BookmarkItem` 追加两个布尔字段：

```ts
export type BookmarkItem = {
  // ... existing fields
  isFavorite: boolean;   // 收藏标记，默认 false
  isUnread: boolean;     // 未读标记，默认 true（新保存的书签）
};
```

**现有数据迁移规则：**
- 所有旧书签：`isFavorite = false`
- `visitCount === 0` 的旧书签：`isUnread = true`
- `visitCount > 0` 的旧书签：`isUnread = false`

迁移在 `ChromeBookmarkRepository.list()` 中惰性执行（读取时补全缺失字段），不破坏现有存储格式。

---

## 2. 稍后阅读 / 收藏

### 2.1 状态指示器

**Dashboard 页面版（表格行）：**
- 每行最左侧（favicon 之前）显示「未读蓝点」：直径 6px 的圆点，`bg-primary`，点击后消失
- 每行最右侧（操作按钮旁边）显示「收藏星」：`☆` 空心 / `★` 实心，点击切换
- 已收藏的书签标题加粗或变色，视觉上更突出

**Dashboard 弹窗版（列表行）：**
- 同样的星标按钮放在行右侧（访问次数旁边）
- 未读蓝点放在 favicon 左上角（叠加小圆点）
- 点击星标/蓝点直接 toggle，不触发打开书签

**搜索弹窗（SearchApp）：**
- 在 BookmarkRow 右侧增加星标按钮
- 未读蓝点放在 favicon 左上角

### 2.2 自动状态变更

- **保存新书签**（SavePanel / background save）：默认 `isUnread = true`，`isFavorite = false`
- **打开书签**（Dashboard / SearchApp 点击或 Enter）：自动将 `isUnread` 设为 `false`
- **手动 toggle**：用户可随时点击蓝点或星标切换状态

### 2.3 筛选器

Dashboard 页面版和弹窗版的搜索栏旁边增加快速筛选按钮组：

```
[全部] [未读] [收藏]
```

- 与现有「工作区筛选」共存，两者是 AND 关系
- 「未读」筛选：`isUnread === true`
- 「收藏」筛选：`isFavorite === true`
- 弹窗版用 pill 样式的按钮放在搜索栏右侧（workspace 筛选之前或并排）

---

## 3. 批量操作

### 3.1 选择模式

**Dashboard 页面版：**
- 表格表头增加「全选」复选框（`<input type="checkbox">`），位于「书签」列之前
- 每行最左侧增加复选框，与 favicon 同列或单独一列
- 点击表头复选框：切换当前筛选结果的所有书签选中状态
- Shift + 点击复选框：范围选择（从上一个点击位置到当前位置）

**Dashboard 弹窗版：**
- 列表顶部增加「全选」复选框
- 每行左侧增加复选框（与 favicon 并排）
- 键盘：当搜索框失焦时，按 Space 切换当前高亮行的选中状态

### 3.2 批量操作栏

当有 ≥1 个书签被选中时，在内容区底部浮出操作栏：

```
┌─────────────────────────────────────────┐
│  已选 3 项    删除  移动工作区  添加标签  标记已读  收藏  │
└─────────────────────────────────────────┘
```

- 页面版：固定在表格底部（`sticky`），与表格同宽
- 弹窗版：固定在列表底部（模态框内），与列表同宽
- 取消全选后自动隐藏

### 3.3 批量操作行为

| 操作 | 行为 |
|---|---|
| 删除 | `confirm("确定删除选中的 N 个书签？")` 后批量删除 |
| 移动工作区 | 下拉选择目标工作区，批量更新 `workspaceId` |
| 添加标签 | 弹出迷你 TagInput，输入后给所有选中书签**追加**标签（去重） |
| 标记已读 | 批量设 `isUnread = false` |
| 标记未读 | 批量设 `isUnread = true` |
| 收藏 | 批量设 `isFavorite = true` |
| 取消收藏 | 批量设 `isFavorite = false` |

所有批量操作通过 `repository.update()` 逐个更新，最后一次性 `setBookmarks` 刷新状态。

---

## 4. Repository 变更

### 4.1 `update()` 扩展

现有 `update()` 已支持 `Partial<Omit<BookmarkItem, "id" | "createdAt" | "lastVisitedAt" | "visitCount">>`，需要把 `isFavorite` 和 `isUnread` 加入可 patch 字段。

**变更：** 把 `Partial<...>` 的类型定义扩展，不再排除 `isFavorite` / `isUnread`（它们本来就不在排除列表中，所以现有签名天然支持）。

### 4.2 `saveCurrentTab()` 默认值

保存新书签时，确保 `isFavorite` 和 `isUnread` 有默认值：
- `isFavorite: false`
- `isUnread: true`

### 4.3 新增 `bulkUpdate()`（可选优化）

```ts
bulkUpdate(ids: string[], patch: Partial<...>): Promise<void>
```

一次性读取、修改、写回，减少 storage 读写次数。如果实现成本高，可先循环调用 `update()`。

---

## 5. UI 变更清单

| 文件 | 变更 |
|---|---|
| `src/domain/types.ts` | BookmarkItem 加 `isFavorite`、`isUnread` |
| `src/repositories/bookmarkRepository.ts` | `list()` 加迁移逻辑，`saveCurrentTab()` 加默认值 |
| `src/dashboard/DashboardApp.tsx` | 页面版：加复选框列、状态指示器、筛选按钮、批量操作栏 |
| `src/dashboard/DashboardModal` | 弹窗版：加复选框、状态指示器、筛选按钮、批量操作栏 |
| `src/search/SearchApp.tsx` | BookmarkRow 加星标和未读指示器 |
| `src/save/SavePanel.tsx` | 保存时默认 `isUnread=true` |
| `src/components/TagInput.tsx` | 确认可复用于批量添加标签弹窗 |

---

## 6. 测试策略

- **单元测试：** `bookmarkRepository.test.ts` 补全迁移逻辑测试、批量更新测试
- **搜索测试：** `search.test.ts` 确认筛选逻辑不受新字段影响
- **手动测试：**
  1. 旧扩展升级后，旧书签正确显示迁移状态
  2. 保存新书签后默认未读
  3. 打开书签后自动标记已读
  4. 批量选择 → 批量删除 / 移动 / 加标签 / 标记状态
  5. 弹窗版键盘 Space 选择 + Enter 打开

---

## 7. 第二阶段预览（不做深入设计）

第二阶段将包含：
- **重复书签检测**：扫描相同 URL，提供合并标签/访问记录的 UI
- **关联推荐**：基于共享标签/工作区推荐相关书签

---

## 验收标准

- [ ] 旧书签升级后无报错，迁移状态正确
- [ ] 新书签保存后显示「未读」蓝点
- [ ] 点击书签打开后蓝点消失
- [ ] 收藏/取消收藏实时生效并持久化
- [ ] 筛选按钮（全部/未读/收藏）正确过滤
- [ ] 批量选择至少 1 项时底部出现操作栏
- [ ] 批量删除、移动、加标签、标记状态均正常工作
