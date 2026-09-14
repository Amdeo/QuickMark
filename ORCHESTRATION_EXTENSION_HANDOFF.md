# Pi Orca Orchestration Extension Handoff

## 交接目标

在 `/Users/cooper/.pi` 目录启动新的 Pi 会话，实现一个全局 Pi 扩展，将当前写在项目 `AGENTS.md` 中的 Orca 多 Agent 编排策略改为可动态开启、可配置模型、可按请求注入的运行时能力。

这是一份实现交接，不是产品规格。下一位 Agent 应先验证当前 Pi/Orca 版本和 API，再按下述 V1 范围实现，不要直接复制未经验证的命令。

## 已确认环境

- Pi CLI：`0.85.1`
- Pi 安装文档：`/Users/cooper/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/docs/`
- Pi 扩展示例：`/Users/cooper/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/`
- Orca CLI：`/opt/homebrew/bin/orca`
- Orca app/runtime 在本机可运行；曾确认 app version `1.4.200`
- 全局 Pi 扩展目录：`/Users/cooper/.pi/agent/extensions/`
- 全局 Pi 配置目录：`/Users/cooper/.pi/agent/`
- `/Users/cooper/.pi` 当前不是 Git 仓库；不要假设可以用 Git 恢复文件
- 修改 `/Users/cooper/.pi/agent/**` 前读取：
  - `/Users/cooper/.pi/AGENTS.md`
  - `/Users/cooper/.pi/agent/AGENTS.md`
  - 命中条件时读取 `/Users/cooper/.pi/agent/rules/*.md`

当前已有 Orca/Pi 扩展，可参考但不要无关重构：

- `/Users/cooper/.pi/agent/extensions/orca-prefill.ts`
- `/Users/cooper/.pi/agent/extensions/orca-agent-status.ts`
- `/Users/cooper/.pi/agent/extensions/orca-titlebar-spinner.ts`
- `/Users/cooper/.pi/agent/extensions/plan-model-switch.ts`

## 已验证的 Pi 扩展能力

官方文档已确认：

- `pi.on("input", ...)`：读取原始用户输入，可 transform/handle/continue
- `pi.on("before_agent_start", ...)`：按 turn 动态追加 system prompt
- `pi.registerCommand()`：注册 `/orch ...` 命令
- `pi.registerFlag()` / `pi.getFlag()`：注册启动参数
- `pi.appendEntry()`：保存当前会话的扩展状态，不进入 LLM 上下文
- `ctx.sessionManager`：恢复当前分支上的扩展状态
- `ctx.modelRegistry.find(provider, model)`：解析模型
- `ctx.scopedModels`：读取当前会话允许的模型范围
- `pi.setModel()` / `pi.setThinkingLevel()`：只改变当前 Pi 会话模型；不能代替 Worker 启动参数
- `pi.exec(command, args, options)`：使用 argv 调用外部 CLI
- `ctx.ui.select/input/confirm/notify/setStatus`：配置 UI 与状态显示
- `ctx.isProjectTrusted()`：决定是否读取项目级配置
- `/reload` 可重载自动发现的扩展

必须完整阅读：

- `docs/extensions.md`
- `docs/models.md`
- `docs/settings.md`
- `docs/packages.md`
- `docs/environment-variables.md`
- `examples/extensions/preset.ts`
- `examples/extensions/pirate.ts`

## 关键架构结论

采用两层结构：

1. **策略层（Pi 扩展）**
   - 管理开关、触发模式、模型和布局配置
   - 在命中请求时动态注入精简的 Coordinator 策略
   - 提供 `/orch` 命令和状态展示

2. **执行层（Orca）**
   - Run、Task、Dispatch、Message、Decision Gate 和生命周期状态始终以 Orca 为唯一权威
   - Pi 扩展只封装参数校验、CLI argv 调用、JSON 解析和展示
   - 不在扩展里复制 Orca 状态机

不要把当前 `AGENTS.md` 的整段流程原样在每个 turn 注入。只在模式启用且请求命中时追加一段短策略，否则会增加上下文并污染提示缓存。

## V1 实现范围

### 必须实现

1. 全局扩展入口：
   - 建议路径：`/Users/cooper/.pi/agent/extensions/orchestration-mode/index.ts`

2. 命令：

   ```text
   /orch on
   /orch off
   /orch status
   /orch config
   /orch run <任务>
   ```

3. 启动参数：

   ```text
   --orch
   --orch-role coordinator|worker|reviewer
   ```

4. 动态提示注入：
   - 使用 `input` 记录本次是否应该注入
   - 使用 `before_agent_start` 追加 system prompt
   - 只对当前 turn 生效
   - `event.source === "extension"` 时避免再次触发

5. 配置读取与合并：
   - 全局：`/Users/cooper/.pi/agent/orchestration.json`
   - 项目覆盖：`<cwd>/.pi/orchestration.json`
   - 当前会话命令覆盖优先级最高
   - 只有 `ctx.isProjectTrusted()` 为 true 才读取项目配置

6. 模型选择：
   - 配置保存 `provider/modelId`，不保存 API Key
   - 用 model registry 验证模型存在和认证可用性
   - 校验 thinking level 是否被模型支持；不支持时拒绝保存，不要静默降级

7. UI：
   - 状态栏显示 `Orch: off`、`Orch: explicit` 或 `Orch: auto`
   - `/orch status` 输出开关、触发模式、实现模型、Review 模型、布局、角色和当前 Run（若有）
   - `/orch config` 使用 `ctx.ui.select/input`，不要先实现复杂自定义 TUI

8. Worker 防递归：
   - Worker 和 reviewer 自己也会加载全局扩展
   - 当角色为 `worker` 或 `reviewer` 时，禁止自动创建子 Run/Worker
   - 只注入对应 Worker contract，不注入 Coordinator 自动编排规则

### V1 不做

- 不重新实现 Orca scheduler
- 不自动轮询直到所有 Worker 完成
- 不在扩展中保存第二份 Run/Task/Dispatch 状态
- 不自动停止 `unverifiable` Worker
- 不做 Web UI
- 不做 npm 发布
- 不删除现有项目 `AGENTS.md` 中的编排兜底规则
- 不新增依赖；优先 Node stdlib + Pi Extension API

## 默认配置

建议默认值：

```json
{
  "enabled": false,
  "trigger": "explicit",
  "layout": "same-tab-split",
  "splitDirection": "horizontal",
  "workspace": "current",
  "implementation": {
    "model": "deepseek/deepseek-flash",
    "thinking": "max"
  },
  "review": {
    "enabled": true,
    "model": "nowcoding/gpt-6-astra",
    "thinking": "high"
  },
  "waitTimeoutMs": 900000
}
```

当前本机模型映射已验证：

- `deepseek/deepseek-flash`：显示名 DeepSeek V4.1 Flash，支持 `high`、`max`
- `nowcoding/gpt-6-astra`：显示名 GPT-6 Astra，支持 `off` 到 `max`

配置不得写 API Key。模型认证继续由 Pi 的 `auth.json`、环境变量和 `models.json` 管理。

## 触发策略

支持两种模式：

### explicit（默认）

仅以下情况注入编排策略：

- 用户执行 `/orch run <任务>`
- 用户明确写出完整编排意图，例如同时包含“先规划”“创建 Worker”“等待/监督”“Review”

### auto（可选）

使用保守、确定性的规则匹配。至少命中两个不同类别信号才注入：

- 规划：`先规划`、`主 Agent 规划`、`先思考`
- Worker：`创建 Worker`、`多个 Agent`、`并行 Worker`
- 监督：`监督`、`等待结果`、`等全部完成`
- Review：`Review`、`审查 Worker`、`最后审查`
- 显式编排：`orchestration`、`Orca 编排`

不要仅因为用户说“Review”“模型”或“交给 Agent”就自动编排。普通无监督 ownership handoff 应继续走 `orca-cli`。

`/orch run <任务>` 的推荐行为：将 `<任务>` 通过 `pi.sendUserMessage()` 或输入 transform 变成普通用户任务，并设置一个只消费一次的 `forceNextTurn` 标志；不要在命令 handler 中直接自动创建 Run，因为主 Agent尚未读取代码并生成可靠 Task spec。

## 注入提示词建议

保持短而明确，可以放在扩展常量或独立 Markdown 中：

```text
ORCA ORCHESTRATION MODE ACTIVE

你是本次任务的 Coordinator。先读取适用规则、相关设计、当前 diff 和调用关系，形成最小改动方案，再创建 Orca Run/Task/Dispatch。Task spec 必须包含目标、范围、约束、所有权和可验证验收。实现 Worker 完成并收到有效 worker_done 后，创建依赖实现 Task 的 Review Task。Run/Task/Dispatch/Message 状态只以 Orca 为权威；timeout、空结果、联系丢失和 unverifiable 不授权停止、重试或释放。Worker 必须使用当前配置的 Pi 模型；同一 Tab 使用 terminal split。最终由主 Agent核对实际 diff、用户原有改动、测试、构建和 reclaimable Worker。

实现 Worker：<model>，thinking=<level>
Review Worker：<model>，thinking=<level>
布局：same-tab-split，direction=<direction>
```

Worker/reviewer 角色使用更短的 contract：

```text
你是 Orca 已派发的 Worker。只执行注入 preamble 中当前 Task，遵守其文件所有权和验收条件。阻塞问题用 preamble 提供的 ask 命令；按要求 check 跟进；结束时发送一次 worker_done，包含 taskId、dispatchId 和 outcome。不要创建新的 Run 或 Worker。
```

## 同一 Tab 的 Pi Worker 流程

当前 Orca 的 `worker-start` 未能直接表达本机自定义 Pi 模型，已实际遇到以下拒绝：

- `--agent codex --model deepseek/... --effort max` 被拒绝
- `--agent worker` 被拒绝为 `agent_unconfigured`

已验证可用的路径是低层拓扑：

```bash
orca orchestration run-create --objective "..." --json
orca orchestration task-create --run <run_id> --spec "..." --json
orca terminal split \
  --terminal <coordinator_handle> \
  --direction horizontal \
  --command "pi --model <provider/modelId> --thinking <level> --orch-role worker" \
  --json
orca terminal wait --terminal <worker_handle> --for tui-idle --timeout-ms 60000 --json
orca orchestration dispatch --task <task_id> --to <worker_handle> --inject --json
```

注意：

- `<coordinator_handle>` 从 `run-create` 回执读取，不根据窗口标题猜测
- 命令使用 argv，不拼接未经校验的用户字符串
- `dispatch --inject` 产生权威 Dispatch，但 Worker 资源状态会是 `unsupervised`
- 不得把这种 Worker 表述为 Orca supervised worker
- `worker-release` 对 `unsupervised` lane 可能返回 `no_owned_resource`，不会关闭 Pi 终端；终端是否关闭必须单独、明确处理

## Orca CLI 封装建议

V1 可以先由 Coordinator Agent 使用现有 `bash` 调用 Orca。若实现类型化工具，只做薄封装，建议工具名：

```text
orca_orchestration
```

限制动作：

```text
status
run_create
task_create
worker_split
dispatch
check
ack
reply
worker_show
worker_list
release
```

工具实现必须：

- 使用 `pi.exec("orca", argv, { signal, timeout })`
- 解析 stdout JSON；非零退出码抛错并保留 Orca 的 code/message/nextSteps
- 输出做 50KB/2000 行限制
- 不接受任意 shell command
- `worker_split` 的 model 先通过 model registry 验证，再作为单独 argv 传给 Pi
- `task_create` 的 spec 作为单独 argv，不经过 shell
- `check` 只执行单次；不要在工具内部无限循环

V1 可以只完成提示注入和命令，不必立即实现全部 `orca_orchestration` 动作。

## 会话与持久化

建议状态拆分：

- 配置文件：持久化默认行为
- `pi.appendEntry("orchestration-mode-state", ...)`：持久化当前会话覆盖、当前角色、forceNextTurn、可选 currentRunId
- `session_start`：从当前 branch 最后一条同类型 entry 恢复
- 不把配置状态写进 LLM 上下文

配置写入必须采用：

1. 写同目录临时文件
2. `fsync`（若实现成本合理）
3. `rename` 原子替换

至少保证 JSON 不会半写入。解析失败时使用最后一个有效内存配置或默认值，并显示错误；不要覆盖损坏文件。

## 角色来源与递归防护

优先顺序：

1. CLI `--orch-role`
2. Orca 注入 preamble 中的 Task/Dispatch 身份
3. 进程环境中的显式标记（如果 Orca/终端启动可以安全传递）
4. 默认 `coordinator`

不要仅根据“是否在 Orca 中运行”判断角色，因为 Coordinator 和 Worker 都在 Orca 中。

如果自定义 CLI flag 在子 Pi 命令中经过 Orca 时不稳定，退回环境变量方案，例如：

```bash
PI_ORCHESTRATION_ROLE=worker pi --model ... --thinking ...
```

但要先验证子进程是否只在目标 Worker 中继承该值，不能污染 Coordinator。

## `/orch config` 交互顺序

第一版使用简单选择器：

1. trigger：`explicit` / `auto`
2. layout：只支持 `same-tab-split`
3. splitDirection：`horizontal` / `vertical`
4. implementation model：从 `ctx.scopedModels` 或 `modelRegistry.getAvailable()` 中选
5. implementation thinking：只显示该模型支持的 level
6. review enabled：true / false
7. review model
8. review thinking
9. wait timeout：预设 `300000` / `600000` / `900000`
10. 保存范围：当前会话 / 全局 / 项目

项目保存前必须确认项目可信；没有 UI 的 JSON/print 模式下拒绝交互式 config，并提示直接编辑配置文件。

## 安全边界

- 扩展拥有当前用户完整系统权限，只加载可信源码
- 不记录或展示 API Key
- 不将完整 system prompt、AGENTS 内容或模型认证信息写日志
- 不允许用户文本进入 Worker 启动 shell command
- 所有外部调用使用 argv
- 不执行 Orca `reset`、`worker-stop`、`worker-abandon` 等破坏性动作，除非用户明确要求且状态允许
- `timeout`、空消息、`connectionLost`、`agentWait: null`、`unverifiable` 都只是检查点
- 只有有效 `worker_done` 或积极的 `exited` 证据才允许进入对应恢复流程
- 校验 `worker_done` 的 taskId、dispatchId、outcome 与预期活跃 Dispatch 完全一致
- 每个 Delivery 处理完所有消息后再 ack
- 保留用户未提交改动；共享 cwd 时 Task spec 明确授权文件

## 测试计划

### 单元测试

至少覆盖：

- 全局/项目/会话配置优先级
- 项目未信任时忽略项目配置
- 配置 JSON 损坏时不覆盖文件
- `/orch on/off/status`
- `/orch run` 只强制下一次 turn
- explicit/auto 触发规则及误触发反例
- Worker/reviewer 角色不触发子编排
- system prompt 只在命中 turn 注入
- 模型不存在、未认证、thinking 不支持时拒绝配置
- argv 生成不经过 shell
- Orca 非零 JSON 错误被保留

### 手动集成验证

1. 在普通项目启动 Pi，确认默认 `Orch: off`
2. `/orch on` 后普通问答不应自动创建 Run
3. `/orch run 修改一个小文件并 Review` 应在本 turn 注入 Coordinator 策略
4. 创建 Run 后读取真实 `coordinator_handle`
5. 同一 Tab 横向 split 出实现 Pi Worker
6. 确认 Worker 使用配置模型与 thinking，并且不会递归编排
7. Worker 发送合法 worker_done
8. Review Task 依赖实现 Task
9. 同一 Tab 再 split 出 Review Pi Worker
10. 收到 Review worker_done 后逐 Delivery ack
11. `worker-list --terminal-state reclaimable` 为空
12. `/orch off` 后不再注入
13. `/reload` 后持久配置与当前会话状态符合预期

### 验证命令

根据扩展实现位置选择最小检查：

- TypeScript 类型检查（若现有扩展目录没有 tsconfig，则使用 Pi `-e` 实际加载）
- `pi -e /Users/cooper/.pi/agent/extensions/orchestration-mode/index.ts`
- `/reload`
- `orca status --json`
- `orca skills get orchestration`

不要为了测试修改真实项目代码；可使用临时目录或 fixture 配置。

## 实施顺序

1. 读 `~/.pi` 两层 AGENTS 和 Pi 官方扩展文档
2. 检查现有扩展命名、类型风格和加载顺序
3. 建立 `orchestration-mode/index.ts`
4. 先实现配置 schema、读取/合并/校验
5. 实现角色判定和递归防护
6. 实现 `/orch on/off/status/run`
7. 实现 `input` + `before_agent_start` 动态注入
8. 实现 `/orch config` 简单 UI
9. 添加测试或可运行自检
10. 用 `pi -e` 在临时/安全会话验证
11. 真实同 Tab split 一个无修改任务验证角色与模型
12. 确认无递归、无状态重复后再考虑类型化 Orca 工具

## AGENTS.md 迁移策略

扩展验证稳定前，不删除现有项目 `AGENTS.md` 中的手动编排规则。稳定后可缩成：

```text
当 orchestration-mode 扩展启用时，遵循扩展动态注入的编排策略；扩展不可用时，回退到本节的手动 Orca 流程。用户明确要求监督、等待结果、协调 DAG 或先实现后 Review 时使用 orchestration；普通 ownership handoff 使用 orca-cli。
```

## 下一次会话建议提示词

在 `/Users/cooper/.pi` 中启动 Pi 后，发送：

```text
请读取本目录 AGENTS.md、agent/AGENTS.md 和这份 ORCHESTRATION_EXTENSION_HANDOFF.md，然后实现 V1 的 orchestration-mode Pi 扩展。先核对当前 Pi 0.85.1 扩展 API 和现有 Orca 扩展，不修改无关运行时文件。完成 /orch on|off|status|config|run、--orch-role、动态 before_agent_start 注入、全局/项目配置、模型与 thinking 校验、Worker 防递归和 same-tab-split 配置表达；Run/Task/Dispatch 仍以 Orca 为唯一权威。先做最小实现和测试，不实现完整自动调度器。完成后给出实际验证证据和剩余风险。
```

## 已知风险与未决项

- Orca `worker-start` 对自定义 Pi 模型支持有限，V1 应保留 `terminal split + pi + dispatch --inject` 路径
- 低层 Dispatch 是 `unsupervised` resource，release 不会自动关闭终端
- 扩展 CLI flag 是否能在当前 Orca 启动链中稳定传递，需要实际验证；不行则用专用环境变量
- 自动触发容易误判，默认必须是 `explicit`
- 完整自动等待会与宿主/Orca 的现有通知机制竞争，V1 不实现无限等待器
- `~/.pi` 不是 Git 仓库，修改前建议手工备份目标扩展和配置文件
