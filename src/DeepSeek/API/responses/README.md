# responses 目录说明文档

`/responses` 是 DeepSeek API 的一个 endpoint，本目录存放与该 endpoint 对应的数据契约（zod schema），包含两个文件：

- `RequestSchema.ts` — DeepSeek API 文档中的 request 部分
- `ResponsesSchema.ts` — DeepSeek API 文档中的 responses 部分

两个文件直接翻译官方 API 文档，是数据契约层，为上层（ModelClient / BaseAgent）提供强类型与运行时校验。

## RequestSchema.ts

对应 API 文档的 request 部分，定义了请求体所需的全部 schema，并导出类型供各层复用。

### 关键定义

| Schema | 说明 |
| ---- | ---- |
| `ModelSchema` | 模型枚举，可选 `deepseek-v4-flash` / `deepseek-v4-pro` |
| `MessageItemSchema` | 消息项，含 `type: "message"`、角色（user / assistant / system / developer）与内容 |
| `ReasoningItemSchema` | 推理项，内容为 `reasoning_text` 文本块数组 |
| `FunctionCallItemSchema` | 函数调用项，含 `call_id`、函数名与参数 |
| `FunctionCallOutputItemSchema` | 函数调用结果项，含 `call_id` 与输出 |
| `WebSearchCallItemSchema` | web 搜索调用项，使用 `.loose()` 允许未知字段 |
| `InputSchema` | 输入数组，为上述消息项类型的联合 |
| `InstructionsSchema` | 系统指令，可为 null |
| `ReasoningSchema` | 推理配置，`effort` 可选 none / low / high / max |
| `TextSchema` | 输出格式配置，支持 `text` 或 `json_schema` |
| `ToolsSchema` | 工具数组，支持 `function`（自定义函数）与 `web_search` 两类 |
| `RequestBodySchema` | 整体请求体，组合上述全部字段，可选字段通过 `.optional()` 标注 |

### 使用方式

```ts
// 请求前校验：ModelClient 中调用
RequestBodySchema.parse({ model, input, instructions, tools, user });

// 类型复用：BaseAgent / PlannerAgent 中导入
import type { InputType, ToolsType, ModelType } from "./API/responses/RequestSchema.ts";
```

## ResponsesSchema.ts

对应 API 文档的 responses 部分，定义了响应体所需的全部 schema。

### 关键定义

| Schema | 说明 |
| ---- | ---- |
| `OutputMessageItemSchema` | 输出的 assistant 消息项，内容为 `output_text` 文本块数组 |
| `OutputReasoningItemSchema` | 输出的推理项，内容为 `reasoning_text` 文本块数组 |
| `OutputFunctionCallItemSchema` | 输出的函数调用项，含 `call_id`、函数名与参数字符串 |
| `OutputWebSearchCallItemSchema` | 输出的 web 搜索调用项，`action` 使用 `.loose()` 允许未知字段 |
| `OutputItemSchema` | 输出项联合类型，覆盖上述四类 |
| `UsageSchema` | token 用量统计（输入 / 输出 / 缓存 / 推理 token） |
| `ResponsesSchema` | 整体响应体，含 `id`、`object`、`status`、`error`、`model`、`output`、`usage` |

四类输出项与 BaseAgent.loop() 的分支处理一一对应（message / reasoning / function_call / web_search_call）。

### 设计要点

- `error`、`incomplete_details`、`action` 等非核心字段使用 `.loose()` 或 `nullable`，允许 API 返回未知字段而不中断校验
- 状态字段使用 `z.enum` 严格约束（如 `status` 仅允许 in_progress / completed / incomplete / failed），保证下游分支判断的类型安全

### 使用方式

```ts
// 请求后解析：ModelClient 中调用
return ResponsesSchema.parse(responsesJSONed);
```
