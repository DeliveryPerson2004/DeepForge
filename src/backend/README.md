# deep-forge

基于 DeepSeek `/responses` API，为个人开发者打造的最小 AI Agent 运行时。核心能力为**多轮对话循环 + 工具调用**：Agent 可调用 web 搜索、执行 shell 命令、在拿不准时主动询问开发者，工具结果回填对话上下文供模型继续推理。整体采用 TypeScript 编写，代码从 API 文档直接翻译出类型契约，全程编译期强类型。

本文件为项目的完整技术文档（由原根目录 `Agent设定.md` 与 `src` 说明文档整合而成），覆盖技术选型、项目架构、运行方式、测试与路线图。

## 1. 特色特点

### 1.1 工具调用闭环

模型通过 `function_call` 请求执行工具，Agent 在本地完成执行后把结果以 `function_call_output` 形式回填进消息上下文，下一轮请求时模型即可看到执行结果，继续推理直至不再发出 `function_call`。完整的调用链路与实现见「[4. 工具调用闭环与上下文回填](#4-工具调用闭环与上下文回填）」及 [Tools/README.md](Tools/README.md)。

当前 `PlanAgent` 注册了三个工具：

| 工具                    | 说明                                                    |
|-------------------------|---------------------------------------------------------|
| `web_search`            | DeepSeek 内建 web 搜索                                  |
| `execute_shell_command` | 在指定工作目录中执行 shell 命令（bash 环境，禁用 sudo） |
| `ask_developer`         | 有疑问时主动向开发者提问（如用户要求调用一个并不存在的工具） |

### 1.2 shell 命令在 Docker Sandbox 中隔离执行

shell 命令的执行**不会直接接触宿主机**，而是运行在 **Docker 官方 Sandbox（`sbx` CLI）** 提供的隔离沙箱环境中：

- `sbx` 为每个沙箱提供独立的 microVM（独立文件系统、网络与 Docker daemon），agent 的 shell 命令全部在沙箱内完成
- **针对注入的防护**：即使模型被诱导执行恶意命令，影响范围也被限制在沙箱内，宿主开发机不受影响
- **开发环境与运行环境分离**：宿主只负责 agent 代码的开发，运行时通过 `./sandbox-init.sh` 把项目同步进沙箱，两边互不干扰

```
宿主机（agent 开发）
        │  sandbox-init.sh（sbx cp 同步项目）
        ▼
Docker Sandbox（shell-user-workspace，microVM 隔离）
        │  命令在此执行，与宿主机隔离
        ▼
模型发出的 execute_shell_command 调用
```

`sandbox-init.sh` 的两条命令：

```bash
sbx exec -d shell-user-workspace sudo rm -rf /home/administrator/WebstormProjects/deep-forge  # 清空沙箱中的旧项目
sbx cp /home/administrator/WebstormProjects/deep-forge shell-user-workspace:/home/administrator/WebstormProjects/  # 将项目同步进沙箱
```

### 1.3 编译期强类型数据契约

请求体 / 响应体类型定义于 `DeepSeek/API/responses.ts`，直接从 DeepSeek API 文档翻译而来，编译期强类型、无运行时校验。开发者只需对照 API 文档即可开发，无需参考其他文件。

### 1.4 指令与代码解耦

Agent 的系统指令存放在 `DeepSeek/Agents/Planner/instructions.md`，通过文件读取加载，调整提示词无需改动代码。

### 1.5 日志贯穿全流程

基于 pino + pino-pretty 的统一日志（`./logger.ts`），agent 实例化、对话循环、工具调用与结果均有记录，便于追踪整个对话与工具执行过程。

## 2. 技术选型

| 类别 | 选型 | 说明 |
| ---- | ---- | ---- |
| 语言 | TypeScript 7 | 开启 `strict` 严格模式，配合 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等强类型选项 |
| 模块体系 | ESM（`module: nodenext`） | 使用 `type: "module"`，代码中显式携带 `.ts` 扩展名导入 |
| 运行方式 | tsx | 直接执行 TypeScript 源码，无需预先编译；`tsc --noEmit` 负责类型检查 |
| 包管理器 | pnpm | 通过 `devEngines` 锁定 `pnpm ^11.22.0` |
| 数据契约 | TypeScript 类型（编译期） | 请求体 / 响应体类型定义于 `DeepSeek/API/responses.ts`，仅编译期强类型，无运行时校验 |
| HTTP 客户端 | Node.js 原生 fetch | 无第三方 HTTP 依赖 |
| 日志 | pino + pino-pretty | `logger.ts` 统一封装，控制台彩色输出，贯穿所有层 |
| Shell 执行 | node:child_process（exec） | 工具层执行命令，zsh 环境，无第三方依赖 |
| 环境变量 | dotenv | 读取 `../../.env` 中的 `DEEPSEEK_API_KEY` |
| 模型 API | DeepSeek `/responses` | 兼容 OpenAI Responses API 格式 |
| 测试 | node:test + node:assert | Node 内置测试框架，经 tsx 直接运行 TS 源码，无第三方测试依赖 |

## 3. 项目架构

### 3.1 目录结构

`src/backend/` 的实际结构：

```
src/backend/
├── main.ts                  # 程序入口：启动 Express 服务（端口 30000）
├── AppServer.ts             # 应用编排：checkEnvironment / getSessionList / createNewSession / resumeSession
├── Session.ts               # 单次会话：管理工作目录、触发对话循环、持久化日志与 agent input
├── logger.ts                # pino 日志封装（横切所有类与工具）
├── prisma-client.ts         # Prisma 客户端单例
├── sandbox-init.sh          # 初始化 Docker Sandbox 运行环境（sbx cp 同步项目）
├── DeepSeek/
│   ├── ModelClient.ts       # 模型客户端：封装 /responses API 的 HTTP 调用
│   ├── BaseAgent.ts         # Agent 基类：实现多轮对话循环
│   ├── API/
│   │   └── responses.ts     # 请求体 / 响应体 TypeScript 类型契约（编译期强类型）
│   └── Agents/
│       └── Planner/
│           ├── PlanAgent.ts     # 具体 Agent：注册 web_search / execute_shell_command / ask_developer
│           └── instructions.md  # Agent 系统指令（独立于代码维护）
└── Tools/
    ├── ask-developer.ts     # 询问开发者工具
    └── shell-command/
        ├── shell-execute.ts # 核心执行器：在指定 cwd 执行 shell 命令（bash，sudo 拦截）
        ├── shell-ls.ts      # 薄封装：固定执行 ls
        └── shell-pwd.ts     # 薄封装：固定执行 pwd
```

### 3.2 分层依赖，自上而下

整体呈分层调用结构，依赖方向自上而下：

```
入口层：main.ts / AppServer（Express，端口 30000）
        │
        ▼
Session 层：Session（管理一次会话与工作目录、触发对话循环）
        │
        ▼
Agents 层：PlanAgent（具体 Agent，注册工具）
        │  继承
        ▼
BaseAgent（Agent 基类：多轮对话循环 + 工具分发契约）
        │
        ▼
ModelClient（网络层：唯一接触 /responses API HTTP 细节的类）
        │
        ▼
responses.ts（数据契约层，编译期强类型）
        │
        ▼
DeepSeek API

Tools 层：shell-command / ask-developer（由 PlanAgent 按 name 分发调用）
logger.ts（日志，横切所有层）
```

各层各司其职：`Session` 管理一次会话与工作目录，`BaseAgent` 提供对话循环与工具回填机制，`ModelClient` 是唯一接触网络细节的类，工具层只负责具体执行。

### 3.3 核心机制

- **Agent 继承体系**：`PlanAgent` 继承 `BaseAgent`，通过构造函数传入 `user`、`funcTools`、`model`、`instructions` 完成定制；`instructions` 从同级 `instructions.md` 文件读取，指令与代码解耦。
- **多轮对话循环**：`BaseAgent.loop()` 将用户输入加入消息上下文后循环调用 `ModelClient.requestResponsesAPI()`，逐条处理响应中的四类输出项：
  - `message`（assistant 文本回复，追加进上下文）
  - `reasoning`（推理过程，追加进上下文）
  - `function_call`（函数调用，追加进上下文，置 `hasFunctionCall = true`）
  - `web_search_call`（web 搜索调用）

  当一轮响应中不再包含 `function_call` 时循环终止。
- **数据契约**：请求体与响应体由 `DeepSeek/API/responses.ts` 中的类型契约定义，全程编译期强类型；运行时不做校验。
- **工具机制**：`PlanAgent` 通过 `ToolsType` 声明工具——`web_search`（内建搜索）、`execute_shell_command`（本地执行 Shell 命令）与 `ask_developer`。模型发出 `function_call` 后，`requestFunctionCall()` 按 `name` 分发到 `Tools/` 下的对应实现，执行结果通过 `createFunctionCallOutputItemAndPush()` 以 `function_call_output` 形式回填上下文，供模型下一轮推理使用。

## 4. 工具调用闭环与上下文回填

```
用户输入追加进上下文
        ▼
循环请求模型（携带全部历史消息）
        ▼
逐条处理输出：message / reasoning / function_call / web_search_call
        ▼
function_call → requestFunctionCall() 按名称分发到对应工具
        ▼
执行结果构造为 function_call_output 回填上下文
        ▼
直到响应中不再包含 function_call 循环终止
```

- **注册**：具体 Agent（`PlanAgent`）通过 `ToolsType` 声明工具列表，`function` 类工具在 `parameters` 中以 JSON Schema 声明参数形态，与 `responses.ts` 类型契约一一对应
- **分发**：`requestFunctionCall()` 按 `inputFunctionCallItem.name` 分发到对应工具，`arguments`（JSON 字符串）反序列化为工具入参（如 `shellExecuteInput` / `askDeveloperInput`）
- **回填**：工具执行完成后由 `createFunctionCallOutputItemAndPush()` 构造 `function_call_output` 输入项，使模型在下一轮推理中可见执行结果

工具的注册、分发与 shell 工具的详细实现见 [Tools/README.md](Tools/README.md) 与 [Tools/shell-command/README.md](Tools/shell-command/README.md)。

## 5. 与模型 provider 耦合的取舍

本项目（`ModelClient`、`BaseAgent`、API schemas、Agents）与 DeepSeek 这一特定 model provider 强绑定，原因如下：

1. **model 与 model-provider 天然强绑定**。不同 provider 的 API 格式截然不同（例如 OpenAI 与 Anthropic 的 client 完全不同），无法抽象出统一接口。国内大部分 provider 目前兼容 OpenAI 或 Anthropic 的 API 格式，但未来模型训练范式可能变化，API 格式也存在变数，因此围绕单一 provider 开发是合理选择。

2. **API 文档即最佳公开资料**。`DeepSeek/API/responses.ts` 直接翻译 DeepSeek API 文档的 request / responses 部分，`BaseAgent` 的字段与 API 请求字段一一对应。开发者只需对照文档即可开发，无需参考其他文件或代码，实现简单、便于维护。

3. **耦合换取实现简洁**。`BaseAgent` 直接以 provider 的请求字段形态组织代码，便于调用 `ModelClient` 的方法，省去了中间抽象层。

综上，当前阶段以"快速可用、贴合文档"为优先，接受与单一 provider 的耦合，为未来的抽象与扩展预留了空间。代价是：如需更换模型 provider，可能需要对类型契约、client 与 agent 字段做重构。更多设计细节见 [DeepSeek/README.md](DeepSeek/README.md)。

## 6. 数据库说明

对话会话与日志持久化在 **SQLite 单文件数据库**（`dev.db`）中，由 Prisma 管理：

- `dev.db`（数据）与 `generated/prisma`（构建产物）均已在 `.gitignore` 中，**不会进入版本库**
- clone 后执行 `../../init-prisma.sh` 即可重建：`prisma migrate dev` 创建 `dev.db`、应用 `../../prisma/migrations/` 下已提交的迁移，并自动生成 `generated/prisma` 客户端
- 脚本幂等：数据库已存在且迁移同步时重复执行无副作用（非破坏性，不会清空数据）
- SQLite 单文件，无需外部数据库服务；连接地址由 `../../.env` 中的 `DATABASE_URL` 指定

## 7. 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp ../../.env.example .env
# 在 .env 中填入 DEEPSEEK_API_KEY 与 DATABASE_URL="file:./dev.db"

# 3. 初始化数据库（首次 clone 必做；幂等，可重复执行）
sh ../../init-prisma.sh

# 4. 初始化 Docker Sandbox 运行环境（需已安装 sbx CLI）
bash ./sandbox-init.sh

# 5. 运行后端服务（dev:backend:main 会先执行 tsc --noEmit 类型检查）
pnpm dev:backend:main

# 6. 运行测试
pnpm test
```

## 8. 测试说明

测试套件位于根目录 `test/`（即 `../../test/`），采用 Node.js 内置测试框架（`node:test` + `node:assert`），经 tsx 直接运行 TypeScript 源码，无第三方测试依赖：

```bash
pnpm test   # 等价于 node --import tsx --test test/**/*.ts
```

前置条件：`.env` 中需配置 `DATABASE_URL`（`Session` / `AppServer` 相关测试会只读连接 `dev.db`，不会写入数据）。

### 测试覆盖

| 测试文件                                           | 覆盖内容                                                                                                                                                         |
|----------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `test/shell-execute.test.ts`                       | `shellExecute()`：sudo 拦截（开头 / 嵌入 / 管道 / 大写 / 引号包裹，`csudo` 不误伤）、成功执行与输出 trim、指定 cwd、失败返回错误信息而非抛异常                   |
| `test/shell-pwd.test.ts`                           | `executeShellCommandPWD()`：返回指定 cwd 的绝对路径                                                                                                              |
| `test/shell-ls.test.ts`                            | `executeShellCommandLs()`：列出目录内容，空目录返回空字符串                                                                                                      |
| `test/model-client.test.ts`                        | `ModelClient`：mock 全局 `fetch`，断言请求 URL / 请求头 / 请求体结构、响应解析、日志获取                                                                         |
| `test/plan-agent.test.ts`                          | `PlanAgent`：`execute_shell_command` 分发与 `function_call_output` 回填（含失败与 sudo 拦截场景）、`ask_developer` 分发                                          |
| `test/app-server.test.ts` / `test/session.test.ts` | `AppServer` / `Session`：`checkEnvironment()` 未设置 provider 时返回 false（不触发网络）、`getSessionList()` 返回数组、`resumeSession()` 对不存在的 id 返回 null |

### 测试策略

- 网络层（`ModelClient`）通过 `node:test` 的 `mock.method(globalThis, "fetch", ...)` 模拟请求，测试过程中不会发起真实网络请求
- shell 工具测试使用 `fs.mkdtempSync` 创建临时目录并在 `after()` 中清理，不污染宿主机工作区
- 数据库相关测试仅执行只读查询，不写入数据

### CI

PR 合并至 `main` 时，GitHub Actions（`../../.github/workflows/main.yml`）自动执行：`prisma migrate deploy` → `prisma generate` → `pnpm test`，并注入 `DATABASE_URL` 与 `DEEPSEEK_API_KEY` 环境变量。

## 9. 路线图

1. **移除 Prisma 依赖**：改用 `better-sqlite3` 直接管理 `dev.db`，去掉 `prisma migrate` / `prisma generate` 迁移与构建步骤，简化克隆后的初始化流程。
2. **实现 MCP client 模块**：引入 Model Context Protocol 客户端，使 Agent 能以标准协议接入外部工具与数据源（如文件系统、数据库、第三方服务），摆脱对内置工具的硬编码依赖，扩大 Agent 的能力边界。
3. **实现 skills 模块**：将可复用的能力沉淀为 skills（技能包），支持按需加载与组合，使 Agent 的指令、提示词与工具集可以按场景灵活装配，降低单 Agent 的系统指令复杂度。
4. **使用 A2A 协议对每一个智能体进行封装**：将每个智能体封装为 A2A（Agent-to-Agent）协议下的独立 Agent，提供标准化的发现、消息与任务协商接口，从而实现智能体之间的通信与协作，支持多智能体协同完成复杂任务。
5. **利用沙箱控制每个智能体可使用的工具**：借助既有 Docker Sandbox 环境按智能体粒度控制工具可见性与可用性——如果不希望某个工具可以被智能体调用，即在环境中不进行安装即可；实现最小权限原则，降低单点风险。
6. **基于 TUI 实现前端**：以终端 UI 替代/补充当前的交互入口，提供更直观的会话与工具调用展示（可能考虑使用 GraphQL 统一查询与推送前端数据）。

## 10. 局限与后续方向

当前项目聚焦于**单次会话内**的对话循环与工具调用，尚未涉猎任何**记忆（Memory）**相关内容——Agent 无法跨会话记住用户偏好、历史结论或沉淀长期知识，每次会话都从零开始，上下文仅存在于单次运行的窗口内。

若要让 Agent 具备长期记忆，可沿以下方向学习：

- **知识图谱（Knowledge Graph）**：将对话中出现的实体与关系抽取为图结构并持久化，支撑跨会话的事实检索与多跳推理
- **LLM Wiki**：以 wiki 式知识库组织长期沉淀，供模型在回答时检索引用，把"想得起来"变成"查得到"
- **本体论（Ontology）**：为领域概念建立显式分类与关系 schema，指导知识的抽取、组织与一致表达，避免记忆内容彼此冲突

三者可组合演进（如知识图谱 + LLM Wiki 的 GraphRAG 思路），但均属于本项目范围之外的后续方向。

## 11. 文档导航

| 文档                                                                               | 定位                                                                |
|------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| [根目录 README.md](../../README.md)                                                | 项目入口 / 文档导航（本文件的精简版）                               |
| [本文件（README.md）](README.md)                                                    | 项目完整技术文档：特色、技术选型、架构、快速开始、测试、路线图      |
| [DeepSeek/README.md](DeepSeek/README.md)                                            | ModelClient、BaseAgent 实现与设计说明                               |
| [Tools/README.md](Tools/README.md)                                                  | 工具调用链路与工具实现说明                                          |
| [Tools/shell-command/README.md](Tools/shell-command/README.md)                      | shell 命令工具（shell-execute / ls / pwd）实现细节                  |
| [DeepSeek/API/responses.ts](DeepSeek/API/responses.ts)                              | 请求 / 响应 TypeScript 类型契约定义                                 |
| [../../test/](../../test)                                                           | 测试套件：shell 工具、ModelClient、PlanAgent、AppServer / Session   |
