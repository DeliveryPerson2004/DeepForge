# deep-forge · 架构说明

> 项目门面与命名故事见 [根目录 README.md](../../README.md)。

基于 DeepSeek `/responses` API 的最小多智能体运行时。核心能力为**多轮对话循环 + 工具调用**：Agent 可调用 web 搜索、按需加载 skill，工具结果回填对话上下文供模型继续推理。整体用 TypeScript 编写，代码从 API 文档直接翻译出类型契约，全程编译期强类型。

本文件为 `src/backend` 的技术文档，覆盖技术选型、架构、运行方式、测试与路线图。设计取舍（"为什么这么做 / 为什么不那么做"）见 [THINKING.md](THINKING.md)。

## 1. 技术选型

| 类别 | 选型 | 说明 |
| ---- | ---- | ---- |
| 语言 | TypeScript 7 | 开启 `strict`，并启用 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等强类型选项 |
| 模块体系 | ESM（`module: nodenext`） | `type: "module"`，代码中显式携带 `.ts` 扩展名导入 |
| 运行方式 | tsx | 直接执行 TypeScript 源码；`tsc --noEmit` 负责类型检查 |
| 包管理器 | pnpm | 通过 `devEngines` 锁定版本 |
| 数据契约 | TypeScript 类型（编译期） | 请求 / 响应类型定义于 `Agents/DeepSeek/API`，无运行时校验 |
| HTTP 客户端 | Node.js 原生 fetch | 无第三方 HTTP 依赖 |
| 参数校验 | zod | 工具入参（如 `load_skill`）的运行时校验 |
| 持久化 | better-sqlite3 | 单文件 `./database.db`，prepared statement，无 ORM / 迁移 |
| 日志 | pino + pino-pretty | `logger.ts` 统一封装，控制台彩色输出，贯穿所有层 |
| Shell 执行 | node:child_process（exec） | `Tools/shellCommand` 内实现，无第三方依赖 |
| 环境变量 | dotenv | 读取 `../../.env` 中的 `DEEPSEEK_API_KEY` |
| 模型 API | DeepSeek `/responses` | 兼容 OpenAI Responses API 格式 |
| 测试 | node:test + node:assert | Node 内置测试框架，经 tsx 直接运行 TS 源码 |

## 2. 目录结构

```
src/backend/
├── main.ts                       # 程序入口（演示：实例化 LexeyAgent 并提问）
├── logger.ts                     # pino 日志封装（横切所有类与工具）
├── database/
│   ├── db.ts                     # better-sqlite3 连接（./database.db，外键开启）
│   ├── initDatabase.ts           # 建表（agent / message）并登记 Lexey
│   └── stmt.ts                   # prepared statements
├── Agents/
│   ├── README.md                 # Agent 名册与命名约定
│   └── DeepSeek/
│       ├── ModelClient.ts        # 模型客户端：封装 /responses API 的 HTTP 调用
│       ├── README.md             # ModelClient / BaseAgent / LexeyAgent 说明
│       ├── API/
│       │   └── responses.ts      # 请求体 / 响应体 TypeScript 类型契约
│       └── Agents/
│           ├── BaseAgent.ts      # Agent 基类：多轮对话循环 + 工具回填 + 持久化
│           └── Lexey/            # 语言 Agent（Lexicon）
│               ├── LexeyAgent.ts # 具体 Agent：注册 web_search / load_skill
│               ├── instructions.md  # 角色、职责与行为准则
│               ├── run.ts        # 本地调试脚本
│               └── skills/
│                   └── 从英语单词引申到外国名著片段/SKILL.md
└── Tools/
    ├── askDeveloper.ts           # 向开发者提问（warn 日志）
    ├── loadInstructions.ts       # 读取 instructions.md 并注入 skills 元数据
    ├── loadSkill.ts              # 按 frontmatter 的 name 加载 SKILL.md 正文
    ├── README.md                 # 工具调用链路与各工具说明
    └── shellCommand/
        ├── shell-execute.ts      # 核心执行器：在指定 cwd 执行 shell 命令（sudo 拦截）
        ├── shell-ls.ts           # 薄封装：固定执行 ls
        ├── shell-pwd.ts          # 薄封装：固定执行 pwd
        └── README.md             # shell 工具实现细节
```

## 3. 分层依赖

依赖方向自上而下，`logger.ts` 横切所有层：

```
入口层：main.ts
        │
        ▼
Agent 层：LexeyAgent（注册工具、加载 instructions/skills、恢复历史）
        │  继承
        ▼
BaseAgent（多轮对话循环 + function_call 回填 + 持久化增量）
        │
        ▼
ModelClient（网络层：唯一接触 /responses API HTTP 细节的类）
        │
        ▼
responses.ts（数据契约层，编译期强类型）
        │
        ▼
DeepSeek API

旁挂：
database/（agent / message 两表 + prepared statements，由 LexeyAgent / BaseAgent 使用）
Tools/（loadSkill / loadInstructions / askDeveloper / shellCommand，由 LexeyAgent 按 name 分发）
```

各层各司其职：`LexeyAgent` 负责定制（工具、指令、历史），`BaseAgent` 提供对话循环与工具回填机制，`ModelClient` 是唯一接触网络细节的类，工具层只负责具体执行。

## 4. 核心机制

### 4.1 多轮对话循环

`BaseAgent.ask(userInput)` 把用户输入构造成 `message` 输入项追加进上下文，随后循环调用 `ModelClient.requestResponsesAPI()`，逐条处理响应中的四类输出项：

| 输出项 | 处理 |
| ------ | ---- |
| `message` | 记录 assistant 文本，追加进上下文 |
| `reasoning` | 记录推理过程，追加进上下文 |
| `function_call` | 追加进上下文，置 `hasFunctionCall = true`，交由子类的 `requestFunctionCall()` 执行工具 |
| `web_search_call` | 模型内建完成，仅记录 |

当一轮响应中不再包含 `function_call` 时循环终止。终止后，`ask()` 只把**本轮新增**的上下文（`input.slice(inputLengthBeforeLoop)`）序列化为 JSON，写入 `message` 表。

### 4.2 工具注册与分发

- **注册**：具体 Agent（`LexeyAgent`）通过 `ToolsType` 声明工具列表。当前注册两个：
  - `web_search`：DeepSeek 内建 web 搜索
  - `load_skill`：按名称加载 skill 正文，`parameters` 以 JSON Schema 声明参数形态
- **分发**：模型发出 `function_call` 后，`BaseAgent` 调用子类实现的抽象方法 `requestFunctionCall()`；`LexeyAgent` 按 `name` 分发，将 `arguments`（JSON 字符串）反序列化、经 zod `safeParse` 校验后执行。
- **回填**：工具执行完成后由 `createFunctionCallOutputItemAndPush()` 构造 `function_call_output` 输入项追加进上下文，供模型下一轮推理使用。

> `Tools/shellCommand` 下的 shell 工具与 `askDeveloper.ts` 已实现，但**当前未注册**到 `LexeyAgent`；它们是为后续"执行类 Agent"准备的（见路线图）。

### 4.3 Skills 加载

Agent 的职责与行为准则写在 `instructions.md`，具体能力沉淀为 `skills/<目录>/SKILL.md`：

- **启动时**：`loadInstructions(dirPath)` 读取 `instructions.md`，并扫描同级 `skills/`，把每个 `SKILL.md` frontmatter 中的 `name` / `description` 以列表形式追加到指令末尾——模型由此知道"有哪些 skill 可用"。
- **运行时**：模型需要某项能力时调用 `load_skill`，`loadSkill(skillsDirPath, skillName)` 按 frontmatter 的 `name` 命中对应文件，剥离 frontmatter 后返回正文。
- 这样做的目的是把"能力清单"与"能力详情"分开：常驻上下文里只有一行元数据，正文按需加载。

### 4.4 历史恢复

`LexeyAgent` 构造函数从 `agent` 表读取 `id` 与 `max_turn`，再用 `selectMessageFromMessageTableStmt` 取出该 Agent 所有 `is_activated = 1` 的 `message` 行，逐行 `JSON.parse` 后展开进 `input`，从而在进程重启后恢复上下文；无法解析的行会跳过并记录 warn。

## 5. 数据库

对话历史持久化在 **SQLite 单文件** `./database.db`，由 `better-sqlite3` 直接管理（无 ORM、无迁移）：

- `database/db.ts`：`new Database("./database.db", { verbose })`，并 `PRAGMA foreign_keys = ON`
- `database/initDatabase.ts`：`CREATE TABLE IF NOT EXISTS` 建表，并插入 `Lexey` 记录
- `database/stmt.ts`：集中定义 prepared statement

| 表 | 字段 | 说明 |
| -- | ---- | ---- |
| `agent` | `id` / `name` / `max_turn` / `created_at` | 每个 Agent 一行 |
| `message` | `id` / `agent_id` / `turn` / `content` / `is_activated` / `created_at` | `content` 为整段 JSON（输入项数组）；`agent_id` 外键指向 `agent`，`ON DELETE CASCADE` |

## 6. 与模型 provider 耦合的取舍

本项目（`ModelClient`、`BaseAgent`、API schemas、Agents）与 DeepSeek 这一特定 model provider 强绑定，原因如下：

1. **model 与 model-provider 天然强绑定**。不同 provider 的 API 格式截然不同，无法抽象出统一接口。国内大部分 provider 目前兼容 OpenAI 或 Anthropic 的 API 格式，但未来模型训练范式可能变化，API 格式也存在变数，因此围绕单一 provider 开发是合理选择。
2. **API 文档即最佳公开资料**。`Agents/DeepSeek/API` 直接翻译 DeepSeek API 文档的 request / response 部分，`BaseAgent` 的字段与 API 请求字段一一对应，开发者只需对照文档即可开发。
3. **耦合换取实现简洁**。`BaseAgent` 直接以 provider 的请求字段形态组织代码，省去了中间抽象层。

代价是：如需更换模型 provider，可能需要对类型契约、client 与 agent 字段做重构。更完整的论证见 [THINKING.md](THINKING.md) 与 [Agents/DeepSeek/README.md](Agents/DeepSeek/README.md)。

## 7. 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 在 .env 中填入 DEEPSEEK_API_KEY

# 3. 建表并登记 Agent（首次运行一次）
pnpm dev:backend:initDatabase

# 4. 启动（会先执行 tsc --noEmit 类型检查）
pnpm dev:backend:main

# 5. 运行测试
pnpm test
```

## 8. 测试

测试套件位于根目录 `test/`，采用 Node.js 内置测试框架（`node:test` + `node:assert`），经 tsx 直接运行 TypeScript 源码，无第三方测试依赖：

```bash
pnpm test   # 等价于 node --import tsx --test test/**/*.ts
```

| 测试文件 | 覆盖内容 |
| -------- | -------- |
| `test/lexey-agent.test.ts` | `LexeyAgent`：构造函数读取 agentId/name、从 `message` 表加载 `is_activated = 1` 历史并跳过非法 JSON；`load_skill` 分发（正常 / JSON 解析失败 / schema 校验失败 / 未知工具名）；`ask()` 全链路（`function_call` 回填后继续推理直至无 `function_call`，并持久化 message） |
| `test/database.test.ts` | `initDatabase()` 建表并插入 `Lexey`；prepared statements 插入读回、`is_activated` 过滤、外键约束 |
| `test/load-skill.test.ts` | `loadSkill()`：按 frontmatter `name` 命中并剥离 frontmatter、多 skill 选择、未找到、目录不存在、跳过无 `SKILL.md` / 无 frontmatter 的目录 |
| `test/load-instructions.test.ts` | `loadInstructions()`：拼接 instructions 与 skills 元数据、description 续行合并、多 skill、跳过缺 `name` / `description` 的 skill、skills 目录不存在时抛错 |
| `test/model-client.test.ts` | `ModelClient`：mock 全局 `fetch`，断言请求 URL / 请求头 / 请求体结构、响应解析、`ModelType` 取值 |
| `test/ask-developer.test.ts` | `askDeveloper()`：以 warn 日志转达问题 |
| `test/shell-execute.test.ts` | `shellExecute()`：sudo 拦截（开头 / 嵌入 / 管道 / 大写 / 引号包裹，`csudo` 不误伤）、成功执行与输出 trim、指定 cwd、失败返回错误信息而非抛异常 |
| `test/shell-pwd.test.ts` / `test/shell-ls.test.ts` | `executeShellCommandPWD()` / `executeShellCommandLs()`：返回 cwd 绝对路径 / 列出目录内容 |

### 测试策略

- 网络层（`ModelClient`）与 Agent 全链路通过 `mock.method(globalThis, "fetch", ...)` 模拟请求，测试过程不发起真实网络请求
- 数据库相关测试在临时目录中建库，仅使用临时数据，结束后 `db.close()` 并清理
- skill / instructions 测试用 `fs.mkdtempSync` 创建临时目录并在 `after()` 中清理，不污染工作区

## 9. 路线图

已落地：移除 Prisma（改用 `better-sqlite3` 直接管理 `./database.db`）、skills 模块（`SKILL.md` + `load_skill` + 指令元数据注入）。

后续：

1. **实现 MCP client 模块**：引入 Model Context Protocol 客户端，使 Agent 能以标准协议接入**外部工具与数据源（第三方服务）**，扩大能力边界。
2. **使用 A2A 协议对每一个智能体进行封装**：将每个智能体封装为 A2A（Agent-to-Agent）协议下的独立 Agent，提供标准化的发现、消息与任务协商接口，支持多智能体协作。
3. **利用沙箱控制每个智能体可使用的工具**：按智能体粒度控制工具可见性与可用性——不想让某个工具被调用，即在环境中不安装；实现最小权限原则。
4. **基于 TUI 实现前端**：以终端 UI 替代 / 补充当前入口，更直观地展示会话与工具调用。
5. **长期记忆**：见下一节。

## 10. 局限与后续方向

当前项目聚焦于**单 Agent、单次会话内**的对话循环与工具调用，尚未涉猎任何**记忆（Memory）**相关内容——Agent 无法跨会话记住用户偏好、历史结论或沉淀长期知识，每次会话都从零开始，上下文仅存在于单次运行的窗口内。

若要让 Agent 具备长期记忆，可沿以下方向学习：

- **知识图谱（Knowledge Graph）**：将对话中出现的实体与关系抽取为图结构并持久化，支撑跨会话的事实检索与多跳推理
- **LLM Wiki**：以 wiki 式知识库组织长期沉淀，供模型在回答时检索引用，把"想得起来"变成"查得到"
- **本体论（Ontology）**：为领域概念建立显式分类与关系 schema，指导知识的抽取、组织与一致表达，避免记忆内容彼此冲突

三者可组合演进（如知识图谱 + LLM Wiki 的 GraphRAG 思路），但均属于本项目范围之外的后续方向。

## 11. 文档导航

| 文档 | 定位 |
| ---- | ---- |
| [根目录 README.md](../../README.md) | 项目入口 / 命名故事 |
| [THINKING.md](THINKING.md) | 7 条设计取舍与方向设想（部分尚未实现） |
| [Agents/README.md](Agents/README.md) | Agent 名册与命名约定 |
| [Agents/DeepSeek/README.md](Agents/DeepSeek/README.md) | ModelClient、BaseAgent 与 LexeyAgent |
| [Tools/README.md](Tools/README.md) | 工具调用链路与各工具实现 |
| [Tools/shellCommand/README.md](Tools/shellCommand/README.md) | shell 工具实现细节 |
| [../../test/](../../test) | 测试套件 |
