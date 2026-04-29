# QuickMark 使用指南

## 安装

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `QuickMark/dist` 文件夹

## 基础操作

### 保存当前网页

**快捷键**：`Cmd/Ctrl + Shift + S`

- 默认弹出保存面板，可编辑标题、选择工作区、添加标签、写备注
- 在 Settings 中关闭「Show save panel on every save」可实现静默保存

### 打开搜索

**快捷键**：`Cmd/Ctrl + Shift + K`

- 在任意网页按下快捷键，弹出搜索覆盖层
- 输入关键词搜索书签
- 支持 `#标签名` 过滤标签，如 `#docs #frontend`
- 支持 `@工作区名` 过滤工作区，如 `@work`
- 组合使用：`react #tutorial @work`

**导航**：
- `↑/↓` 选择结果
- `Enter` 在当前标签页打开
- `Cmd/Ctrl + Enter` 在新标签页打开
- `Delete` 删除选中的书签
- `Esc` 关闭搜索

## Dashboard（书签管理）

点击 Popup 中的 **Dashboard** 打开，或直接在浏览器中打开 `dashboard.html`。

- **统计卡片**：显示总书签数、本周新增、最高访问次数
- **搜索框**：支持文本搜索 + `#tag` + `@workspace`
- **Workspace 筛选**：搜索框右侧下拉可按工作区过滤
- **点击标题**：在新标签页打开书签，自动更新访问计数
- **编辑**（✎）：修改书签的标题、URL、工作区、标签、备注
- **删除**（🗑）：删除书签

## Workspaces（工作区）

点击 Popup 中的 **Workspaces** 打开。

- 创建工作区来分组管理书签
- 点击工作区可展开查看关联书签
- 可编辑、删除工作区

## Settings（设置）

点击 Popup 中的 **Settings** 打开。

- **Save Behavior**：切换保存时是否弹出面板
- **Data > Export**：导出全部书签和工作区为 JSON
- **Data > Import**：从 JSON 或浏览器 HTML 书签文件导入
  - 导入时自动按 URL 去重，不覆盖已有数据
- **Keyboard Shortcuts**：查看快捷键，点击链接可自定义

## Popup 菜单

点击浏览器工具栏的 QuickMark 图标打开：

- **Search**：触发搜索覆盖层
- **Dashboard**：打开书签管理页
- **Workspaces**：打开工作区管理页
- **Settings**：打开设置页

## 数据存储

所有数据保存在浏览器的 `chrome.storage.local` 中，随浏览器同步（如果开启了 Chrome 同步）。
