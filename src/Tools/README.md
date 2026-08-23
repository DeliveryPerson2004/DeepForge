# Tools 目录说明文档

本目录存放 Agent 可调用的具体工具（tool）实现。工具是模型通过 `function_call` 触发、由 Agent 在本地执行并回填结果的函数单元。

当前包含一个工具：

- `execute-shell-command.ts` — 在指定目录中执行 Shell 命令并返回结果

## 工具调用链路

工具并非直接被模型远程调用，而是走完整的本地执行 + 上下文回填流程：

```
模型响应中的 function_call 输出项
        │
        ▼
BaseAgent.loop() 识别 item.type === "function_call"
        │
        ▼
调用抽象方法 requestFunctionCall()（由具体 Agent 实现，如 PlannerAgent）
        │
        ▼
按 name 分发到对应工具（如 execute_shell_command → executeShellCommand()）
        │
        ▼
工具执行完毕，通过 createFunctionCallOutputItemAndPush() 构造
function_call_output 输入项并追加进消息上下文
        │
        ▼
下一轮请求时，模型可见工具执行结果，继续推理直至无 function_call
```

## execute-shell-command.ts

### 职责

在指定的工作目录（`cwd`）中执行 Shell 命令字符串，返回标准输出（stdout）作为结果；执行失败时返回错误信息（stderr / message），不会向上抛异常。

### 函数签名

```typescript
export async function executeShellCommand(
    command: string,
    cwd: string
): Promise<string>
```

- `command` — 要执行的 Shell 命令字符串
- `cwd` — 命令执行所在的工作目录
- 返回值 — 成功时为 `stdout`（已 `trim()`）；失败时为 `stderr || stdout || message`（已 `trim()`）

### 执行细节

- 基于 Node.js `child_process` 的 `exec` 并 `promisify` 为异步调用，无第三方依赖
- 使用 `shell: '/bin/zsh'`，命令在 zsh 环境下执行（与项目运行环境一致）
- `maxBuffer: 10MB`，防止大量输出撑爆内存
- 输出编码为 `utf-8`
- 结果通过 pino logger 打印（`src/logger.ts`），方便追踪工具调用与结果

### 错误处理约定

失败时函数**不抛异常**，而是将错误信息作为字符串返回，由模型在下一次推理中自行解读。这样保证了 `requestFunctionCall()` 永远可以继续回填上下文，不中断对话循环。

### 与响应契约的关联

`executeShellCommandInput` 接口对应 `function_call` 输出的 `arguments` 字段（JSON 字符串），由具体 Agent 反序列化后传入工具：

```typescript
export interface executeShellCommandInput {
    command: string,
}
```

工具参数由 `responses.ts` 中 `ToolsFunctionItem.parameters` 的 JSON Schema 声明，工具实现与类型契约一一对应。
