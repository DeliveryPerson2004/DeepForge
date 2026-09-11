# Tools 目录说明文档

本目录存放 Agent 可调用的具体工具（tool）实现。工具是模型通过 `function_call` 触发、由 Agent 在本地执行并回填结果的函数单元。

| 文件 / 目录 | 工具 | 说明 | 注册状态 |
| ----------- | ---- | ---- | -------- |
| `loadSkill.ts` | `load_skill` | 按 frontmatter 的 `name` 加载 `SKILL.md` 正文 | 已注册到 `LexeyAgent` |
| `loadInstructions.ts` | —（启动时调用） | 读取 `instructions.md` 并追加 skills 元数据 | 构造时调用 |
| `askDeveloper.ts` | `ask_developer` | 将 Agent 的问题以 warn 日志形式转达给开发者 | 已实现，未注册 |
| `sendEmail.ts` | `send_email` | 通过 QQ SMTP 向工具中配置的固定邮箱发送邮件 | 已实现，未注册 |
| `shellCommand/` | `execute_shell_command` / `ls` / `pwd` | 在指定工作目录执行 shell 命令（bash，禁用 sudo） | 已实现，未注册 |

shell 命令相关工具的技术细节见 [shellCommand/README.md](shellCommand/README.md)。

## 工具调用链路

工具并非被模型远程调用，而是走完整的本地执行 + 上下文回填流程：

```
模型响应中的 function_call 输出项
        │
        ▼
BaseAgent.ask() 识别 item.type === "function_call"
        │
        ▼
调用抽象方法 requestFunctionCall()（由具体 Agent 实现，如 LexeyAgent）
        │
        ▼
按 name 分发到对应工具（如 load_skill → loadSkill()）
        │
        ▼
工具执行完毕，通过 createFunctionCallOutputItemAndPush() 构造
function_call_output 输入项并追加进消息上下文
        │
        ▼
下一轮请求时，模型可见工具执行结果，继续推理直至无 function_call
```

## 工具注册与分发

- **注册**：具体 Agent（`LexeyAgent`）通过 `ToolsType` 声明工具列表；`function` 类工具在 `parameters` 中以 JSON Schema 声明参数形态，与 `API/responses.ts` 类型契约对应
- **分发**：`requestFunctionCall()` 按 `inputFunctionCallItem.name` 分发；`arguments`（JSON 字符串）反序列化为工具入参，并经 zod 校验
- **回填**：工具执行完成后由 `createFunctionCallOutputItemAndPush()` 构造 `function_call_output` 输入项，使模型在下一轮推理中可见执行结果

## loadSkill.ts 与 loadInstructions.ts

这两个文件共同支撑 skills 机制：

- `loadInstructions(dirPath)`：读取 Agent 的 `instructions.md`，扫描同级 `skills/` 下每个 `SKILL.md` 的 frontmatter，把 `name` / `description` 追加为指令末尾的能力清单
- `loadSkill(skillsDirPath, skillName)`：按 frontmatter 的 `name` 命中文件，剥离 frontmatter 后返回正文；未找到或目录不可读时返回提示信息而非抛异常

## sendEmail.ts

`sendEmail()` 使用 QQ SMTP 发送纯文本邮件，并可附带 HTML 正文。模型调用参数包含发件人显示名称 `senderName`、主题 `subject`、纯文本正文 `text` 与可选的 HTML 正文 `html`。SMTP 主机、实际发件邮箱与收件人固定写在 `sendEmail.ts` 顶部的 `EMAIL_CONFIG` 中，Agent 无法在调用时把邮件改发到任意地址。

`senderName` 只控制收件箱中显示的发件人名称，例如 `Gexep`；实际发件地址仍是通过 QQ SMTP 认证的固定邮箱。

授权码不写入源码，而是从项目根目录 `.env` 的以下变量读取：

- `SMTP_PASS`：QQ 邮箱生成的 SMTP 授权码

工具只返回发送结果或错误信息，不会记录邮件正文和授权码。`.env` 已被 Git 忽略，不应将真实授权码复制到 `.env.example` 或其他受版本控制的文件中。当前尚未注册到具体 Agent。

## 与沙箱运行环境的关系

shell 命令工具的**目标**运行环境是 Docker Sandbox（`sbx`）提供的隔离沙箱：宿主机只负责 Agent 开发，项目同步进沙箱后命令在沙箱内执行，防止注入影响宿主机。当前 `shellExecute()` 以本地 `exec` 实现，并先行通过 sudo 正则拦截（`\bsudo\b`，大小写不敏感）做第一道防护；沙箱接入见 [../README.md](../README.md) 路线图。
