# DeepSeek 目录说明文档

本目录封装了与 DeepSeek 模型 provider 交互的核心能力，包含两个文件：

- `ModelClient.ts` — 模型访问入口，负责与 `/responses` API 的 HTTP 通信
- `BaseAgent.ts` — Agent 基类，实现基于 ModelClient 的多轮对话循环

## ModelClient.ts

### 职责

ModelClient 是"使用模型的一个入口"，是整个项目中唯一接触网络细节的类：

- 持有 provider 的 `baseURL`（`https://api.deepseek.com`）与 `DEEPSEEK_API_KEY`（读取自 `.env`）
- 对外暴露 `requestResponsesAPI()` 方法，封装 `/responses` endpoint 的完整调用流程
- 上层（BaseAgent）只依赖该方法，无需关心 URL、鉴权头、序列化等实现细节

### 调用流程

```
组装 payload（model / input / instructions / tools / user）
        │
        ▼
RequestBodySchema.parse()    ← 发送前校验请求体
        │
        ▼
原生 fetch POST /responses   ← 携带 Bearer Token
        │
        ▼
ResponsesSchema.parse()      ← 解析并强类型化响应体
        │
        ▼
返回校验后的响应对象
```

请求与响应两侧均经过 zod 运行时校验，保证数据契约可靠。

## BaseAgent.ts

### 职责

BaseAgent 是通用 Agent 基类，为具体 Agent（如 `PlannerAgent`）提供对话能力：

- 通过构造函数接收 `user`、`funcTools`、`model`、`instructions` 完成定制
- 内部持有一个 `ModelClient` 实例和消息上下文 `input`（数组，累积全部历史消息）
- 实现 `loop()` 多轮对话循环

### 多轮循环机制

1. `createInputMessageItem()` 将用户输入构造为 `message` 消息项，经 `MessageItemSchema` 校验后追加进上下文
2. 调用 `requestResponsesAPI()` 获取模型响应
3. 逐条处理输出项：
   - `message`：打印文本回复，追加进上下文
   - `reasoning`：打印推理过程，追加进上下文
   - `function_call`：打印调用信息，追加进上下文，置 `hasFunctionCall = true`
   - `web_search_call`：打印 web 搜索日志
4. 当一轮响应中不再包含 `function_call` 时循环终止

### 与 model provider 的耦合

该文件中的字段是与某一 model provider 的 API 请求字段强绑的（`user`、`funcTools`、`model`、`instructions` 与请求字段一一对应）。

- **为什么这样设计**：API 文档是最好的公开资料，所有人围绕这份资料进行开发就无需参考任何其他文件或代码。BaseAgent 的代码与 model provider 的 API 文档字段强绑，本质上是便于调用 model client 的相关方法，因此该开发实现方法相对简单。
- **代价**：耦合了 model provider，因此如果需要更换模型，有可能需要重构代码（schema、client 与 agent 字段均受影响）。

## model 与 model-provider 强绑的原因

"model" 与 "model-provider" 显然是强绑定的，例如 OpenAI 的 model-client 与 Anthropic 的是截然不同的。从根本上说，是因为他们的 API 格式完全不同。国内大部分 model-provider 是兼容 OpenAI 或 Anthropic 的 API 格式的，但在此后的模型训练范式中，国内模型厂商不排除有可能引领新的模型训练范式，因此 API 格式有可能会发生变化。

综上，model 与 model-provider 强绑是可以理解的。
