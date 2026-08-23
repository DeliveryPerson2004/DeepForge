# src 目录说明文档

## 1. 技术选型

| 类别 | 选型 | 说明 |
| ---- | ---- | ---- |
| 语言 | TypeScript 7 | 开启 `strict` 严格模式，配合 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等强类型选项 |
| 模块体系 | ESM（`module: nodenext`） | 使用 `type: "module"`，代码中显式携带 `.ts` 扩展名导入 |
| 运行方式 | tsx | 直接执行 TypeScript 源码，无需预先编译；`tsc --noEmit` 负责类型检查 |
| 包管理器 | pnpm | 通过 `devEngines` 锁定 `pnpm ^11.22.0` |
| 数据契约 | TypeScript 类型（编译期） | 请求体 / 响应体类型定义于 `responses.ts`，仅编译期强类型，无运行时校验 |
| HTTP 客户端 | Node.js 原生 fetch | 无第三方 HTTP 依赖 |
| 日志 | pino + pino-pretty | `logger.ts` 统一封装，控制台彩色输出，贯穿所有层 |
| Shell 执行 | node:child_process（exec） | 工具层执行命令，zsh 环境，无第三方依赖 |
| 环境变量 | dotenv | 读取 `.env` 中的 `DEEPSEEK_API_KEY` |
| 模型 API | DeepSeek `/responses` | 兼容 OpenAI Responses API 格式 |

## 2. 项目架构

```
src/
├── main.ts                          # 程序入口：实例化 PlannerAgent 并启动对话循环
├── test.ts                          # executeShellCommand 的独立测试脚本
├── logger.ts                        # pino 日志封装（横切所有类与工具）
├── Agents/
│   └── Planner/
│       ├── PlannerAgent.ts          # 具体 Agent：注册 web_search 与 execute_shell_command 工具
│       └── instructions.md          # Agent 系统指令（独立于代码维护）
├── DeepSeek/
│   ├── ModelClient.ts               # 模型客户端：封装 /responses API 的 HTTP 调用
│   ├── BaseAgent.ts                 # Agent 基类：实现多轮对话循环
│   └── API/
│       └── responses.ts            # 请求体 / 响应体 TypeScript 类型契约（编译期强类型）
└── Tools/
    ├── execute-shell-command.ts     # Shell 命令执行工具（zsh 环境，cwd 指定工作目录）
    └── README.md                    # 工具调用链路与实现说明
```

整体呈分层调用结构，依赖方向自上而下：

```
main.ts
  ├── PlannerAgent (Agents 层)
  │     ├── BaseAgent (Agent 基类)
  │     │     └── ModelClient (网络层)
  │     │           └── responses.ts (数据契约层)
  │     │                 └── DeepSeek API
  │     └── Tools 层
  │           └── execute-shell-command.ts
  └── logger.ts (日志，横切所有层)
```

### 核心机制

- **Agent 继承体系**：`PlannerAgent` 继承 `BaseAgent`，通过构造函数传入 `user`、`funcTools`、`model`、`instructions` 完成定制；`instructions` 从同级 `instructions.md` 文件读取，指令与代码解耦。
- **多轮对话循环**：`BaseAgent.loop()` 将用户输入加入消息上下文后循环调用 `ModelClient.requestResponsesAPI()`，逐条处理响应中的四类输出项：
  - `message`（assistant 文本回复，追加进上下文）
  - `reasoning`（推理过程，追加进上下文）
  - `function_call`（函数调用，追加进上下文，置 `hasFunctionCall = true`）
  - `web_search_call`（web 搜索调用）

  当一轮响应中不再包含 `function_call` 时循环终止。
- **数据契约**：请求体与响应体由 `responses.ts` 中的类型契约定义，全程编译期强类型；运行时不做校验。
- **工具机制**：`PlannerAgent` 通过 `ToolsType` 声明两个工具——`web_search`（内建搜索）与 `execute_shell_command`（本地执行 Shell 命令）。模型发出 `function_call` 后，`requestFunctionCall()` 按 `name` 分发到 `Tools/` 下的对应实现，执行结果通过 `createFunctionCallOutputItemAndPush()` 以 `function_call_output` 形式回填上下文，供模型下一轮推理使用。工具的完整调用链路见 `src/Tools/README.md`。

## 3. 与模型 provider 耦合的原因

本项目（`ModelClient`、`BaseAgent`、API schemas）与 DeepSeek 这一特定 model provider 强绑定，原因如下：

1. **model 与 model-provider 天然强绑定**。不同 provider 的 API 格式截然不同（例如 OpenAI 与 Anthropic 的 client 完全不同），无法抽象出统一接口。国内大部分 provider 目前兼容 OpenAI 或 Anthropic 的 API 格式，但未来模型训练范式可能变化，API 格式也存在变数，因此围绕单一 provider 开发是合理选择。

2. **API 文档即最佳公开资料**。`responses.ts` 直接翻译 DeepSeek API 文档的 request / responses 部分，`BaseAgent` 的字段与 API 请求字段一一对应。开发者只需对照文档即可开发，无需参考其他文件或代码，实现简单、便于维护。

3. **耦合换取实现简洁**。`BaseAgent` 直接以 provider 的请求字段形态组织代码，便于调用 `ModelClient` 的方法，省去了中间抽象层。代价是：如需更换模型 provider，可能需要对类型契约、client 与 agent 字段做重构。

综上，当前阶段以"快速可用、贴合文档"为优先，接受与单一 provider 的耦合，为未来的抽象与扩展预留了空间。
