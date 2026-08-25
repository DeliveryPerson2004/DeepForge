# Tools 目录说明文档

本目录存放 Agent 可调用的具体工具（tool）实现。工具是模型通过 `function_call` 触发、由 Agent 在本地执行并回填结果的函数单元。

当前包含：

| 工具 | 文件 | 说明 |
| ---- | ---- | ---- |
| shell 命令执行 | `shell-command/shell-execute.ts` | 在指定工作目录中执行 shell 命令（bash，禁用 sudo） |
| 目录查看 | `shell-command/shell-ls.ts` | 固定执行 `ls`，查看目录内容 |
| 工作目录输出 | `shell-command/shell-pwd.ts` | 固定执行 `pwd`，输出当前工作目录路径 |
| 询问开发者 | `ask-developer.ts` | 将 agent 的问题以 warn 日志形式转达给开发者 |

各工具的技术细节见 [shell-command/README.md](shell-command/README.md)。

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
按 name 分发到对应工具（如 execute_shell_command → shellExecute()）
        │
        ▼
工具执行完毕，通过 createFunctionCallOutputItemAndPush() 构造
function_call_output 输入项并追加进消息上下文
        │
        ▼
下一轮请求时，模型可见工具执行结果，继续推理直至无 function_call
```

## 工具注册与分发

- **注册**：具体 Agent（`PlannerAgent`）通过 `ToolsType` 声明工具列表，`function` 类工具在 `parameters` 中以 JSON Schema 声明参数形态，与 `responses.ts` 类型契约一一对应
- **分发**：`requestFunctionCall()` 按 `inputFunctionCallItem.name` 分发到对应工具，`arguments`（JSON 字符串）反序列化为工具入参（如 `shellExecuteInput` / `askDeveloperInput`）
- **回填**：工具执行完成后由 `createFunctionCallOutputItemAndPush()` 构造 `function_call_output` 输入项，使模型在下一轮推理中可见执行结果

## 与沙箱运行环境的关系

shell 命令工具的目标运行环境是 Docker Sandbox（`sbx`）提供的隔离沙箱，由 `../scripts/sandbox-init.sh` 初始化：宿主机只负责 agent 开发，`sbx cp` 将项目同步进沙箱机器（`shell-user-workspace`），shell 命令在沙箱内执行，防止注入影响宿主机。当前 `shellExecute()` 以本地 `exec` 实现，并先行通过 sudo 正则拦截（`\bsudo\b`，大小写不敏感）做第一道防护。
