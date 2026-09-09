# deep-forge

基于 DeepSeek `/responses` API，为个人开发者打造的最小 AI Agent 运行时。核心能力为**多轮对话循环 + 工具调用**：Agent 可调用 web 搜索、执行 shell 命令、在拿不准时主动询问开发者，工具结果回填对话上下文供模型继续推理。整体采用 TypeScript 编写，代码从 API 文档直接翻译出类型契约，全程编译期强类型。

> 完整项目文档（特色 / 技术选型 / 架构 / 快速开始 / 测试 / 路线图等）已整合至 [src/backend/README.md](src/backend/README.md)，本文件仅作项目简介与文档导航入口。

## 文档导航

| 文档                                                                       | 定位                                                                          |
|----------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| [src/backend/README.md](src/backend/README.md)                             | 项目完整技术文档：特色、技术选型、架构、快速开始、测试说明、路线图、局限      |
| [src/backend/DeepSeek/README.md](src/backend/DeepSeek/README.md)           | ModelClient、BaseAgent 实现与设计说明                                         |
| [src/backend/Tools/README.md](src/backend/Tools/README.md)                 | 工具调用链路与工具实现说明                                                     |
| [src/backend/Tools/shell-command/README.md](src/backend/Tools/shell-command/README.md) | shell 命令工具（shell-execute / ls / pwd）实现细节               |
| [src/backend/DeepSeek/API/responses.ts](src/backend/DeepSeek/API/responses.ts) | 请求 / 响应 TypeScript 类型契约定义                                          |
| [test/](test)                                                              | 测试套件：shell 工具、ModelClient、PlanAgent、AppServer / Session 测试         |
