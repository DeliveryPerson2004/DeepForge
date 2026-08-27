# shell-command 目录说明文档

本目录存放 shell 命令相关工具的实现，包含三个文件：

| 文件 | 职责 |
| ---- | ---- |
| `shell-execute.ts` | 核心执行器：在指定工作目录中执行 shell 命令并返回结果 |
| `shell-ls.ts` | 薄封装：固定执行 `ls`，查看目录内容 |
| `shell-pwd.ts` | 薄封装：固定执行 `pwd`，输出当前工作目录路径 |

依赖关系：`shell-ls.ts` 与 `shell-pwd.ts` 均调用 `shell-execute.ts` 的 `shellExecute()`，三层共享同一套执行与安全逻辑。

## shell-execute.ts

### 职责

在指定的工作目录（`cwd`）中执行 shell 命令字符串，返回标准输出（stdout）作为结果；执行失败时返回错误信息（stderr / message），不会向上抛异常。设计目标是让 `execute_shell_command` 这一 function_call 工具安全、可控地落地。

### 函数签名

```typescript
export async function shellExecute(
    command: string,
    cwd: string
): Promise<string>{}
```

- `command` — 要执行的 shell 命令字符串
- `cwd` — 命令执行所在的工作目录
- 返回值 — 成功时为 `stdout`（已 `trim()`）；失败时为 `stderr || stdout || message`（已 `trim()`）；被安全校验拦截时返回拒绝原因

### 安全校验（sudo 拦截）

函数体在最前面（try 之前）校验命令中是否包含 sudo：

```typescript
if (/\bsudo\b/i.test(command)) {
    const errorMsg = '不允许使用sudo权限';
    logger.warn(`Tool ExecuteCommand() Rejected: ${errorMsg}`);
    return errorMsg;
}
```

- 使用单词边界正则 `\bsudo\b`，只匹配独立单词，避免误伤如 `csudo` 之类的字符串
- 大小写不敏感（`/i`），`SUDO`、`Sudo` 同样被拦截
- 拦截后直接返回拒绝信息（而不是执行），并以 `logger.warn` 记录

### 执行细节

- 基于 Node.js `child_process` 的 `exec` 并 `promisify` 为异步调用，无第三方依赖
- 使用 `shell: '/bin/bash'`，命令在 bash 环境下执行
- `maxBuffer: 10MB`，防止大量输出撑爆内存
- 输出编码为 `utf-8`
- 执行前通过 pino logger 记录输入命令，执行后记录 stdout 结果与 stderr（如有），方便追踪每次工具调用

### 错误处理约定

失败时函数**不抛异常**，而是将错误信息作为字符串返回，由模型在下一次推理中自行解读。这样保证了上层 `requestFunctionCall()` 永远可以继续回填上下文，不中断对话循环。

### 与响应契约的关联

`shellExecuteInput` 接口对应 `function_call` 输出的 `arguments` 字段（JSON 字符串），由具体 Agent 反序列化后传入工具：

```typescript
export interface shellExecuteInput {
    command: string,
}
```

工具参数由 `responses.ts` 中 `ToolsFunctionItem.parameters` 的 JSON Schema 声明，工具实现与类型契约一一对应。

## shell-ls.ts

固定命令的薄封装，用于查看指定目录内容：

```typescript
export async function executeShellCommandLs(
    cwd: string
): Promise<string>{}
```

内部直接调用 `shellExecute("ls", cwd)`，入参仅需工作目录。调用前记录输入 `cwd` 日志。

## shell-pwd.ts

固定命令的薄封装，用于获取当前工作目录路径：

```typescript
export async function executeShellCommandPWD(
    cwd: string
): Promise<string>{}
```

内部直接调用 `shellExecute("pwd", cwd)`，入参仅需工作目录。调用前记录输入 `cwd` 日志。

## 调用链路

```
模型响应中的 function_call（name = "execute_shell_command"）
        │
        ▼
BaseAgent.loop() 识别 item.type === "function_call"
        │
        ▼
requestFunctionCall()（由具体 Agent 实现，如 PlannerAgent）
        │
        ▼
JSON.parse(arguments) → shellExecuteInput → shellExecute(command, workspacePath)
        │
        ├─ sudo 拦截 → 返回拒绝信息
        └─ 正常执行 → 返回 stdout / 错误信息
        │
        ▼
createFunctionCallOutputItemAndPush() 构造 function_call_output 回填上下文
        │
        ▼
下一轮请求时，模型可见工具执行结果，继续推理直至无 function_call
```

## 测试

对应测试位于根目录 `test/`，运行 `pnpm test`：

| 测试文件 | 覆盖内容 |
| ---- | ---- |
| `test/shell-execute.test.ts` | `shellExecute()`：sudo 拦截（开头 / 嵌入 / 管道 / 大写 / 引号包裹，`csudo` 不误伤）、成功执行与输出 trim、指定 cwd、失败返回错误信息而非抛异常 |
| `test/shell-pwd.test.ts` | `executeShellCommandPWD()`：返回指定 cwd 的绝对路径 |
| `test/shell-ls.test.ts` | `executeShellCommandLs()`：列出目录内容，空目录返回空字符串 |

测试使用 `fs.mkdtempSync` 创建临时目录并在 `after()` 中清理，不污染宿主机工作区。
