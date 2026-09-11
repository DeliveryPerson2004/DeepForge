# DeepSeek 目录说明文档

本目录封装与 DeepSeek 模型 provider 交互的核心能力：

- `ModelClient.ts` — 模型访问入口，负责与 `/responses` API 的 HTTP 通信
- `API/responses.ts` — 请求体 / 响应体 TypeScript 类型契约（编译期强类型）
- `Agents/BaseAgent.ts` — Agent 基类，实现基于 ModelClient 的多轮对话循环
- `Agents/Lexey` — 具体 Agent：语言 Agent（Lexicon）

## ModelClient.ts

### 职责

ModelClient 是"使用模型的一个入口"，是整个项目中唯一接触网络细节的类：

- 持有 provider 的 `baseURL`（`https://api.deepseek.com`）与 `DEEPSEEK_API_KEY`（读取自 `../../../.env`）
- 对外暴露 `requestResponsesAPI(model, input, instructions, tools, user)`，封装 `/responses` endpoint 的完整调用流程
- 上层（BaseAgent）只依赖该方法，无需关心 URL、鉴权头、序列化等实现细节

### 调用流程

```
组装 payload（model / input / instructions / tools / user）
        │
        ▼
JSON.stringify 序列化    ← 类型契约保证字段形态（编译期）
        │
        ▼
原生 fetch POST /responses   ← 携带 Bearer Token
        │
        ▼
返回 JSON（上层按 ResponseSchema 消费）
```

请求与响应两侧均受 `API/responses.ts` 类型契约约束，编译期强类型；运行时不做校验。

请求 URL / 请求头 / 请求体结构与响应解析由 `../../../test/model-client.test.ts` 覆盖：该测试通过 `mock.method(globalThis, "fetch", ...)` 模拟网络层，断言请求构造正确且不发起真实网络请求。

## BaseAgent.ts

### 职责

BaseAgent 是通用 Agent 基类，为具体 Agent（如 `LexeyAgent`）提供对话能力：

- 通过构造函数接收 `model`、`instructions`、`agentId`、`agentName`、`functionTools`、`turn`、`input` 完成定制
- 内部持有一个 `ModelClient` 实例和消息上下文 `input`（数组，累积全部历史消息）
- 实现 `ask()` 多轮对话循环，并把每轮增量持久化进 `message` 表

### 多轮循环机制

1. `createInputMessageItemAndPush()` 将用户输入构造为 `message` 消息项（`InputMessageItem`），追加进上下文
2. 调用 `requestResponsesAPI()` 获取模型响应
3. 逐条处理输出项：
   - `message`：记录文本回复，追加进上下文
   - `reasoning`：记录推理过程，追加进上下文
   - `function_call`：记录调用信息，追加进上下文，置 `hasFunctionCall = true`，并调用抽象方法 `requestFunctionCall()` 交由子类执行对应工具
   - `web_search_call`：记录 web 搜索日志
4. 当一轮响应中不再包含 `function_call` 时循环终止
5. 通过 `insertIntoMessageTableStmt` 把本轮新增上下文（`input.slice(inputLengthBeforeLoop)`）序列化为 JSON 写入 `message` 表

### 工具调用的抽象契约

`requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem)` 是抽象方法，工具的具体执行由子类实现：

- 子类按 `inputFunctionCallItem.name` 分发到 `Tools/` 目录下的对应工具实现
- 工具执行完成后，调用受保护的 `createFunctionCallOutputItemAndPush()`，将结果构造为 `function_call_output` 输入项（`InputFunctionCallOutputItem`）追加进上下文
- 下一轮请求时，模型即可看到工具执行结果，继续推理直至不再发出 `function_call`

## Agents/Lexey/LexeyAgent.ts

具体 Agent 示例，负责"定制"而非"驱动"：

- 用 `loadInstructions(dirPath)` 加载 `instructions.md` 并注入同级 `skills/` 的元数据
- 从 `agent` 表按 `name = "Lexey"` 读取 `agentId` 与 `max_turn`
- 用 `selectMessageFromMessageTableStmt` 取出 `is_activated = 1` 的历史 `message` 行，`JSON.parse` 后恢复 `input`
- 通过 `ToolsType` 注册 `web_search` 与 `load_skill`
- 实现 `requestFunctionCall()`：`load_skill` 的 `arguments` 反序列化后用 zod `safeParse` 校验，命中则 `loadSkill()` 返回正文并回填；解析或校验失败则回填错误信息

分发与回填行为由 `../../../test/lexey-agent.test.ts` 覆盖：测试以 `TestableLexeyAgent` 子类暴露受保护的 `requestFunctionCall()`，验证 `load_skill` 的正常 / 解析失败 / 校验失败 / 未知工具名场景，以及 `ask()` 全链路。

## 与 model provider 的耦合

该目录中的字段与某一 model provider 的 API 请求字段强绑（`user`、`funcTools`、`model`、`instructions` 与请求字段一一对应）。

- **为什么这样设计**：API 文档是最好的公开资料，围绕这份资料开发无需参考其他文件或代码。BaseAgent 的代码与 provider 的 API 文档字段强绑，便于调用 ModelClient 的相关方法，实现相对简单。
- **代价**：耦合了 provider，如需更换模型，可能需要对类型契约、client 与 agent 字段做重构。

"model" 与 "model-provider" 显然是强绑定的，例如 OpenAI 的 model-client 与 Anthropic 的截然不同，根本原因是 API 格式完全不同。国内大部分 provider 兼容 OpenAI 或 Anthropic 的 API 格式，但后续模型训练范式可能变化，API 格式也可能改变。因此围绕单一 provider 开发是可以理解的。更完整的论证见 [../../README.md](../README.md) 与 [../../THINKING.md](../THINKING.md)。
