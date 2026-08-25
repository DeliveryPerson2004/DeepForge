# deep-forge

基于 DeepSeek `/responses` API 的 AI Agent 框架示例。核心能力为**多轮对话循环 + 工具调用**：Agent 可调用 web 搜索、执行 shell 命令、在拿不准时主动询问开发者，工具结果回填对话上下文供模型继续推理。整体采用 TypeScript 编写，代码从 API 文档直接翻译出类型契约，全程编译期强类型。

## 特色特点

### 1. 工具调用闭环

模型通过 `function_call` 请求执行工具，Agent 在本地完成执行后把结果以 `function_call_output` 形式回填进消息上下文，下一轮请求时模型即可看到执行结果，继续推理直至不再发出 `function_call`。

当前 Planner Agent 注册了三个工具：

| 工具 | 说明 |
| ---- | ---- |
| `web_search` | DeepSeek 内建 web 搜索 |
| `execute_shell_command` | 在指定工作目录中执行 shell 命令（bash 环境，禁用 sudo） |
| `ask_developer` | 有疑问时主动向开发者提问（如用户要求调用一个并不存在的工具） |

### 2. shell 命令在 Docker Sandbox 中隔离执行

shell 命令的执行**不会直接接触宿主机**，而是运行在 **Docker 官方 Sandbox（`sbx` CLI）** 提供的隔离沙箱环境中：

- `sbx` 为每个沙箱提供独立的 microVM（独立文件系统、网络与 Docker daemon），agent 的 shell 命令全部在沙箱内完成
- **针对注入的防护**：即使模型被诱导执行恶意命令，影响范围也被限制在沙箱内，宿主开发机不受影响
- 运行环境与 agent 开发分离：宿主只负责 agent 代码的开发，`src/backend/scripts/sandbox-init.sh` 负责初始化沙箱运行环境

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

### 3. 编译期强类型数据契约

请求体 / 响应体类型定义于 `src/backend/DeepSeek/API/responses.ts`，直接从 DeepSeek API 文档翻译而来，编译期强类型、无运行时校验。开发者只需对照 API 文档即可开发，无需参考其他文件。

### 4. 指令与代码解耦

Agent 的系统指令存放在 `src/backend/DeepSeek/Agents/Planner/instructions.md`，通过文件读取加载，调整提示词无需改动代码。

### 5. 日志贯穿全流程

基于 pino + pino-pretty 的统一日志（`src/backend/logger.ts`），agent 实例化、对话循环、工具调用与结果均有记录，便于追踪整个对话与工具执行过程。

## 关键架构设计思想

### 分层依赖，自上而下

```
main.ts → Session
  └── PlannerAgent (Agents 层)
        ├── BaseAgent (Agent 基类：多轮对话循环 + 工具分发契约)
        │     └── ModelClient (网络层：封装 /responses API)
        │           └── responses.ts (数据契约层)
        │                 └── DeepSeek API
        └── Tools 层（工具实现：shell-command / ask-developer）
  └── logger.ts（日志，横切所有层）
```

各层各司其职：`Session` 管理一次会话与工作目录，`BaseAgent` 提供对话循环与工具回填机制，`ModelClient` 是唯一接触网络细节的类，工具层只负责具体执行。

### 工具分发与上下文回填循环

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

### 单一 provider 强绑的取舍

模型与 model-provider 天然强绑定（不同 provider 的 API 格式截然不同），且 API 文档即最佳公开资料——因此项目围绕 DeepSeek 单一 provider 开发：类型契约、client 与 agent 字段与文档一一对应，实现简单、便于维护。代价是更换 provider 可能需要重构。详见 [src/README.md](src/backend/README.md)。

### 开发环境与运行环境分离

借助 Docker Sandbox，agent 的 shell 执行环境与开发环境物理隔离：宿主上可以放心迭代 agent 代码，运行时通过 `sandbox-init.sh` 同步到沙箱，两边互不干扰。

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 在 .env 中填入 DEEPSEEK_API_KEY

# 3. 初始化 Docker Sandbox 运行环境（需已安装 sbx CLI）
bash src/sandbox-init.sh

# 4. 运行 Agent 对话（main.ts，含类型检查）
pnpm dev:main

# 5. 运行 shell 工具测试脚本（test.ts）
pnpm dev:test
```

## 文档导航

| 文档 | 定位 |
| ---- | ---- |
| [src/README.md](src/backend/README.md) | 技术细节：技术选型、分层架构、与 provider 耦合原因 |
| [src/DeepSeek/README.md](src/backend/DeepSeek/README.md) | ModelClient、BaseAgent 实现与设计说明 |
| [src/Tools/README.md](src/backend/Tools/README.md) | 工具调用链路与工具实现说明 |
| [src/Tools/shell-command/README.md](src/backend/Tools/shell-command/README.md) | shell 命令工具（shell-execute / ls / pwd）实现细节 |
| [src/DeepSeek/API/responses.ts](src/backend/DeepSeek/API/responses.ts) | 请求 / 响应 TypeScript 类型契约定义 |
