# Tools 目录说明文档

本目录存放 Agent 可调用的具体工具（tool）实现。工具是模型通过 `function_call` 触发、由 Agent 在本地执行并回填结果的函数单元。

| 文件 / 目录 | 工具 | 说明 | 注册状态 |
| ----------- | ---- | ---- | -------- |
| `loadSkill.ts` | `load_skill` | 按 frontmatter 的 `name` 加载 `SKILL.md` 正文 | 已注册到 `LexeyAgent` |
| `loadInstructions.ts` | —（启动时调用） | 读取 `instructions.md` 并追加 skills 元数据 | 构造时调用 |
| `askDeveloper.ts` | `ask_developer` | 将 Agent 的问题以 warn 日志形式转达给开发者 | 已实现，未注册 |
| `sendEmail.ts` | `send_email` | 通过 QQ SMTP 向工具中配置的固定邮箱发送邮件 | 已注册到 `GexepAgent` |
| `downloadMemo.ts` | `download_memo` | 从 Jezeh 的 E2B Sandbox 下载 Markdown 备忘录到固定宿主机目录 | 已注册到 `JezehAgent` |
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

工具只返回发送结果或错误信息，不会记录邮件正文和授权码。`.env` 已被 Git 忽略，不应将真实授权码复制到 `.env.example` 或其他受版本控制的文件中。当前已注册到 `GexepAgent`。

## downloadMemo.ts

`downloadMemo()` 从 Jezeh 当前使用的 E2B Sandbox 读取 `memos/` 下的 Markdown 文件，并把它写入工具中固定的宿主机目录 `/home/gxp/Projects/MyMemo`。模型参数只有 `memoPath`，不能指定或更改宿主机路径。工具会保留备忘录相对于 `memos/` 的路径层级。

工具只创建新文件，不覆盖已有文件；它只会在固定根目录内部创建缺失的子目录，并拒绝非 Markdown 文件、离开 `memos/` 的云端路径及经过符号链接的宿主路径。宿主文件默认以 `0600` 权限创建，单个备忘录最大为 5 MiB。

E2B 配置从环境变量读取：

- `E2B_API_KEY`：E2B API 密钥。
- `E2B_MEMO_SANDBOX_ID`：可选的 Sandbox ID，可用于连接仍在运行或已暂停的 Sandbox；未设置时会创建一个禁用网络的新 Sandbox。

当前 Jezeh 不再注册本地 `shell_execute`。后续的创建、读取、更新、整理与删除能力也应实现为限定在该 Sandbox 的结构化工具，而不是恢复通用 Shell。

## 与沙箱运行环境的关系

旧的 shell 命令工具仍保留供其他开发用途，但不会注册给 Jezeh。Jezeh 在 E2B Sandbox 中隔离处理备忘录，仅由职责单一的结构化工具访问；`download_memo` 是受限的导出通道，只能在固定宿主机根目录内新建 Markdown 文件。Sandbox 默认是临时工作区，不能冒充持久化存储。
