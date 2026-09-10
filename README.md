# GexepAgent

基于 DeepSeek `/responses` API，为个人开发者打造的最小 AI Agent 运行时。核心能力为**多轮对话循环 + 工具调用**：Agent 可调用 web 搜索、执行 shell 命令、在拿不准时主动询问开发者，工具结果回填对话上下文供模型继续推理。整体采用 TypeScript 编写，代码从 API 文档直接翻译出类型契约，全程编译期强类型。

## 快速认识

这是一个"Agent 运行时"的最小骨架，不是一个模型调用封装库。它帮你把"多轮对话 + 工具调用闭环 + 会话持久化"这件事跑通，代码量小、可读，适合作为你写自己的 Agent 的起点。

- **多轮对话循环 + 工具回填**：模型发 `function_call` → 本地执行工具 → 结果以 `function_call_output` 回填上下文 → 继续推理，直至模型不再要工具
- **已注册的工具**：`web_search`（内建搜索）、`execute_shell_command`（bash，禁 sudo）、`ask_developer`（拿不准时问开发者）
- **隔离执行**：shell 命令跑在 Docker Sandbox（`sbx`）microVM 中，不接触宿主机
- **会话持久化**：会话、日志、agent 历史输入落在本地 SQLite 单文件 `dev.db`
- **编译期强类型**：请求 / 响应契约直接来自 DeepSeek API 文档，无运行时校验

```bash
pnpm install
cp .env.example .env        # 填入 DEEPSEEK_API_KEY 与 DATABASE_URL="file:./dev.db"
sh init-prisma.sh           # 初始化数据库（幂等）
pnpm dev:backend:main       # 启动后端（先跑 tsc --noEmit 类型检查）
```

## 方向与取舍（thinking）

本项目的主要 **thinking**——围绕架构与产品形态的设计取舍与方向设想（其中**部分内容尚未在代码中实现**，只是思考的记录），已整理到 [THINKING.md](THINKING.md)。放在读代码之前，是希望你先理解这些"为什么这么做 / 为什么不那么做"的决定：既不至于把它们误当成缺陷，也别把未落地的设想当成已实现的能力。已实现的部分，以 [src/backend/README.md](src/backend/README.md) 的说明与代码为准。

## 文档导航

| 文档                                                                       | 定位                                                                          |
|----------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| [THINKING.md](THINKING.md)                                                 | 7 条核心 thinking：架构与产品形态的设计取舍、方向设想（部分尚未实现）         |
| [src/backend/README.md](src/backend/README.md)                             | 项目完整技术文档：特色、技术选型、架构、快速开始、测试说明、路线图、局限      |
| [src/backend/DeepSeek/README.md](src/backend/Agents/DeepSeek/README.md)           | ModelClient、BaseAgent 实现与设计说明                                         |
| [src/backend/Tools/README.md](src/backend/Tools/README.md)                 | 工具调用链路与工具实现说明                                                     |
| [src/backend/Tools/shell-command/README.md](src/backend/Tools/shellCommand/README.md) | shell 命令工具（shell-execute / ls / pwd）实现细节               |
| [src/backend/DeepSeek/API/responses.ts](src/backend/Agents/DeepSeek/API/responses.ts) | 请求 / 响应 TypeScript 类型契约定义                                          |
| [test/](test)                                                              | 测试套件：shell 工具、ModelClient、PlanAgent、AppServer / Session 测试         |
