# Pantheon of Confidants

**A multi-agent runtime where every agent is a confidant.**
**多智能体运行时 —— 每一个 Agent，都是一位挚友。**

基于 DeepSeek `/responses` API、为个人开发者打造的最小多智能体运行时。核心是**多轮对话循环 + 工具调用闭环**：Agent 可内建 web 搜索、按需加载 skill，工具结果回填上下文供模型继续推理；会话历史落在本地 SQLite。整体用 TypeScript 编写，请求 / 响应契约从 API 文档直接翻译而来，全程编译期强类型。

## 名字从哪来

这里的每个 Agent，都是现实中一位好友的化身。

- **Agent 命名**：取好友中文名的拼音首字母，在字母之间插入两个 `e`。例如 `gxp → Gexep`，`lxy → Lexey`，`jyh → Jeyeh`。名字本身就是暗号——只有懂的人才知道每个 Agent 背后站着谁。
- **项目命名**：`Pantheon`（万神殿）是众 Agent 的群像，`Confidant`（挚友 / 知己）既是每个 Agent 的身份，也是 Persona 里"与挚友建立羁绊、以 Coop 等级累积协作"的那套系统。**每个好友一位神，协作以 Coop 累积**——这就是 Pantheon of Confidants。

## 为什么值得一看

- **多轮对话循环 + 工具回填**：模型发 `function_call` → 本地执行工具 → 结果以 `function_call_output` 回填上下文 → 继续推理，直至模型不再要工具。逐条处理 `message` / `reasoning` / `function_call` / `web_search_call` 四类输出项。
- **Skills 按需加载**：Agent 的职责写在 `instructions.md`，具体能力沉淀为 `skills/<name>/SKILL.md`；启动时只把 skill 的 `name` / `description` 注入指令，模型需要时再通过 `load_skill` 工具拉取正文，避免把全部能力塞进上下文。
- **编译期强类型契约**：`/responses` 的请求 / 响应类型从 DeepSeek API 文档直接翻译，无运行时校验、无 SDK 抽象层，模型特色（reasoning、web_search、结构化输出……）全部是一等公民。
- **本地持久化**：`better-sqlite3` 直接管理单文件 `./database.db`，`agent` / `message` 两张表 + prepared statement，无 ORM、无迁移步骤。

## 快速开始

```bash
pnpm install
cp .env.example .env          # 填入 DEEPSEEK_API_KEY

pnpm dev:backend:initDatabase # 建表并登记 Agent（首次运行一次即可）
pnpm dev:backend:main         # 先 tsc --noEmit 类型检查，再启动

pnpm test                     # node:test 内置测试框架
```

`src/backend/main.ts` 目前是一个最小演示入口：实例化 `LexeyAgent` 并向它提一个问题。

## 目录速览

```
src/backend/
├── main.ts                 # 入口（演示：实例化 LexeyAgent 并提问）
├── logger.ts               # pino 统一日志
├── database/               # better-sqlite3：db / 建表 / prepared statements
├── Agents/DeepSeek/        # 与 DeepSeek 交互的全部能力
│   ├── ModelClient.ts      # 唯一接触 /responses HTTP 细节的类
│   ├── API/responses.ts    # 请求 / 响应类型契约
│   └── Agents/
│       ├── BaseAgent.ts    # Agent 基类：多轮循环 + 工具回填
│       └── Lexey/          # 语言 Agent（instructions + skills）
└── Tools/                  # load_skill / loadInstructions / askDeveloper / shellCommand
```

## 文档导航

| 文档 | 定位 |
|------|------|
| [src/backend/README.md](src/backend/README.md) | 架构细节：技术选型、分层、核心机制、数据库、路线图、局限 |
| [src/backend/THINKING.md](src/backend/THINKING.md) | 7 条设计取舍与方向设想（部分尚未实现） |
| [src/backend/Agents/README.md](src/backend/Agents/README.md) | Agent 名册与命名约定 |
| [src/backend/Agents/DeepSeek/README.md](src/backend/Agents/DeepSeek/README.md) | ModelClient、BaseAgent 与 LexeyAgent |
| [src/backend/Tools/README.md](src/backend/Tools/README.md) | 工具调用链路与各工具实现 |
| [src/backend/Tools/shellCommand/README.md](src/backend/Tools/shellCommand/README.md) | shell 工具实现细节 |
| [test/](test) | 测试套件：Agent 全链路、数据库、skill、ModelClient、shell |
