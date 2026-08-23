# deep-forge

基于 DeepSeek `/responses` API 的 AI Agent 框架示例，核心能力为多轮对话循环与工具调用（web_search、shell 命令执行）。整体采用 TypeScript 编写，代码从 API 文档直接翻译出 TypeScript 类型契约，保证编译期强类型。

## 全库目录结构

```
deep-forge/
├── package.json              # 依赖与脚本（dev:main / dev:test）
├── pnpm-workspace.yaml       # pnpm 配置（esbuild 构建许可）
├── tsconfig.json             # TypeScript 严格模式配置
├── .env.example              # 环境变量模板（DEEPSEEK_API_KEY）
├── .gitignore
├── user-workspace/           # 工具执行的工作目录（shell 命令在此运行）
└── src/
    ├── main.ts               # 程序入口：实例化 PlannerAgent 并启动对话循环
    ├── test.ts               # executeShellCommand 独立测试脚本
    ├── logger.ts             # pino 日志封装（所有类与工具统一使用）
    ├── README.md             # src 目录说明（技术选型 / 架构 / 耦合原因）
    ├── Agents/
    │   └── Planner/
    │       ├── PlannerAgent.ts       # 具体 Agent：注册 web_search 与 execute_shell_command 工具
    │       └── instructions.md       # Agent 系统指令（独立于代码维护）
    ├── DeepSeek/
    │   ├── ModelClient.ts            # 模型客户端：封装 /responses API 调用
    │   ├── BaseAgent.ts              # Agent 基类：多轮对话循环
    │   ├── README.md                 # DeepSeek 目录说明（ModelClient / BaseAgent）
    │   └── API/
    │       └── responses.ts          # 请求体 / 响应体 TypeScript 类型契约（编译期强类型）
    └── Tools/
        ├── execute-shell-command.ts  # Shell 命令执行工具（zsh 环境）
        └── README.md                 # Tools 目录说明（工具调用链路）
```

## 技术选型

| 类别 | 选型 | 说明 |
| ---- | ---- | ---- |
| 语言 | TypeScript 7 | `strict` 严格模式 + `noUncheckedIndexedAccess` 等强类型选项 |
| 模块体系 | ESM（`module: nodenext`） | `type: "module"`，导入显式携带 `.ts` 扩展名 |
| 运行方式 | tsx | 直接执行 TS 源码；`tsc --noEmit` 负责类型检查 |
| 包管理器 | pnpm | `devEngines` 锁定 `pnpm ^11.22.0` |
| 数据契约 | TypeScript 类型（编译期） | 请求体 / 响应体类型定义于 `responses.ts`，无运行时校验 |
| HTTP 客户端 | Node.js 原生 fetch | 无第三方 HTTP 依赖 |
| 日志 | pino + pino-pretty | `logger.ts` 统一封装，控制台彩色输出 |
| Shell 执行 | node:child_process（exec） | 工具层执行命令，zsh 环境，无第三方依赖 |
| 环境变量 | dotenv | 读取 `.env` 中的 `DEEPSEEK_API_KEY` |
| 模型 API | DeepSeek `/responses` | 兼容 OpenAI Responses API 格式 |

## 核心架构

整体呈分层调用结构，依赖方向自上而下：

```
main.ts
  ├── PlannerAgent (Agents 层)
  │     ├── BaseAgent (Agent 基类)
  │     │     └── ModelClient (网络层)
  │     │           └── responses.ts (数据契约层)
  │     │                 └── DeepSeek API
  │     └── Tools 层
  │           └── execute-shell-command.ts (Shell 命令执行)
  └── logger.ts (日志，横切所有层)
```

- **Agent 继承体系**：`PlannerAgent` 继承 `BaseAgent`，构造函数注入 `user`、`funcTools`、`model`、`instructions`；指令从 `instructions.md` 文件读取，与代码解耦。
- **多轮对话循环**：`BaseAgent.loop()` 累积历史消息并循环请求模型，逐条处理 message（回复）、reasoning（推理）、function_call（工具调用）、web_search_call（搜索）四类输出项，直到响应中不再包含 function_call 时终止。
- **工具机制**：`PlannerAgent` 注册 `web_search`（内建搜索）与 `execute_shell_command`（本地执行 Shell 命令）两个工具。模型发出 `function_call` 后，`requestFunctionCall()` 按名称分发到 `Tools/` 下的工具实现，执行结果以 `function_call_output` 形式回填上下文供模型继续推理。详见 `src/Tools/README.md`。
- **数据契约**：请求体与响应体由 `responses.ts` 中的类型契约定义，全程编译期强类型；运行时不做校验。
- **设计取舍**：项目与 DeepSeek 单一 provider 强绑定——API 文档即最佳公开资料，直接翻译为 schema 使实现简单，但更换 provider 可能需要重构。详见 `src/DeepSeek/README.md`。

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 在 .env 中填入 DEEPSEEK_API_KEY

# 3. 运行 Agent 对话（main.ts，含类型检查）
pnpm dev:main

# 4. 运行 Shell 工具测试脚本（test.ts）
pnpm dev:test
```

## 文档导航

| 文档 | 覆盖范围 |
| ---- | ---- |
| [src/README.md](src/README.md) | 技术选型、项目架构、与模型 provider 耦合的原因 |
| [src/DeepSeek/README.md](src/DeepSeek/README.md) | ModelClient、BaseAgent 的实现与设计说明 |
| [src/Tools/README.md](src/Tools/README.md) | 工具调用链路与 execute-shell-command 实现说明 |
| [src/DeepSeek/API/responses.ts](src/DeepSeek/API/responses.ts) | 请求 / 响应 TypeScript 类型契约定义 |
