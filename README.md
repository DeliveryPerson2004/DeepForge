# deep-forge

基于 DeepSeek `/responses` API，为个人开发者打造的最小 AI Agent 运行时。核心能力为**多轮对话循环 + 工具调用**：Agent 可调用 web 搜索、执行 shell 命令、在拿不准时主动询问开发者，工具结果回填对话上下文供模型继续推理。整体采用 TypeScript 编写，代码从 API 文档直接翻译出类型契约，全程编译期强类型。

## 快速认识

这是一个"Agent 运行时"的最小骨架，不是一个模型调用封装库。它帮你把"多轮对话 + 工具调用闭环 + 会话持久化"这件事跑通，代码量小、可读，适合作为你写自己的 Agent 的起点。

- **多轮对话循环 + 工具回填**：模型发 `function_call` → 本地执行工具 → 结果以 `function_call_output` 回填上下文 → 继续推理，直至模型不再要工具
- **已注册的工具**：`web_search`（内建搜索）、`execute_shell_command`（bash，禁 sudo）、`ask_developer`（拿不准时问开发者）
- **隔离执行**：shell 命令跑在 Docker Sandbox（`sbx`）microVM 中，不接触宿主机
- **会话持久化**：会话、日志、agent 历史输入落在本地 SQLite 单文件 `dev.db`
- **编译期强类型**：请求 / 响应契约直接来自 DeepSeek API 文档，无运行时校验

```bash
pnpm install
cp .env.example .env        # 填入 DEEPSEEK_API_KEY 与 DATABASE_URL="file:./dev.db"
sh init-prisma.sh           # 初始化数据库（幂等）
pnpm dev:backend:main       # 启动后端（先跑 tsc --noEmit 类型检查）
```

## 方向与取舍（thinking）

下面六节是本项目的主要 **thinking**——围绕架构与产品形态的设计取舍与方向设想，其中**部分内容尚未在代码中实现**，只是思考的记录。放在最前面，是希望你在读代码前先理解这些"为什么这么做 / 为什么不那么做"的决定：既不至于把它们误当成缺陷，也别把未落地的设想当成已实现的能力。已实现的部分，以 [src/backend/README.md](src/backend/README.md) 的说明与代码为准。

### 不用 SDK，才能留住每个模型自己的特色

初次打开本项目的读者可能好奇：为什么放着官方 SDK 不用，却自己用 `fetch` 裸调 HTTP？答案是——本项目是一个**由输出项驱动的 Agent 运行时**，而不是一个"消费一段文本"的客户端；而一个模型区别于其他模型的特色，恰好都藏在那些输出项与请求参数里。

- 如果只把 SDK 当 `chat.completions` 用，你拿到的大概率是 text + tool_calls 这个被抹平后的"最小公约数"。SDK 面向"能用"而抽象，会天然把各家特有的能力收敛成其原作者模型的假设，你的代码里再也见不到它们。
- 本项目绕开了这一层：`src/backend/DeepSeek/ModelClient.ts` 用 Node 原生 `fetch` 直连 `POST https://api.deepseek.com/responses`，请求体按 `RequestBody` 手写，类型全部由 `src/backend/DeepSeek/API/responses.ts` 约束，`package.json` 里没有任何 openai 依赖。
- 而 DeepSeek `/responses` 的特色在这套类型契约里全是"一等公民"：
  - 响应输出项远不止 `message`：还有 `reasoning`（推理过程）、`web_search_call`（内建搜索调用）、`function_call`。`BaseAgent.loop()` 正是按这四类 item 分别处理、回填与判定终止的（见 `BaseAgent.ts`）。
  - 请求侧 `text.format` 支持 `json_schema` 结构化输出——`Session.ts` 的 `updateSessionName()` 就靠它把"生成会话名"约束成固定 JSON 形态。
  - 内建 `web_search` 工具、预留的 `custom_tool_call` 输入 / 输出项、`reasoning` 的 effort 档位……这些一旦改走 SDK，大多只能靠 `as any` 逃生，编译期契约当场失效。
- 若目标只是"拿到一段文本"，SDK 是更短的路；但当你需要模型"边推理边搜、边搜边调工具、且把每一步都回填进上下文"时，SDK 替你省掉的细节恰恰是你不能丢的细节。这正是本项目选择"直连 API + 手写类型契约"、并接受与单一 provider 强绑的原因，详见 [src/backend/README.md](src/backend/README.md) 中"与模型 provider 耦合的取舍"一节。

### 不引入 ORM，三张表 + 单文件 SQLite 才是项目本来的复杂度

这句话不是否定 ORM，而是对照本项目的数据形态说的——当你的持久化只有三张表、单文件 SQLite、几条简单查询时，ORM 提供的便捷和它索取的成本会失衡。

- **便捷确实存在**：`prisma/schema.prisma` 一处声明即得表结构与类型化 client；开发期 `prisma migrate dev` 起步建表很快。
- **但真实数据面很小**：全项目只有 `Session` / `Log` / `AgentInput` 三张表，其中 `AgentInput.input` 只是整段 JSON 存取；迁移 SQL 就是三条普通 `CREATE TABLE`。运行期用法无非 `session.findMany/create`、`log.findMany/createMany`、`agentInput.findMany/create`（见 `Session.ts`、`AppServer.ts`），没有任何需要查询构建器或复杂关系导航的场合。
- **为这份便捷付出的额外抽象**：
  - schema DSL + generator 把构建产物生成到被 gitignore 的 `generated/prisma`（`prisma-client.ts` 从 `../../generated/prisma/client.ts` 导入），克隆后必须先跑 `init-prisma.sh`（migrate + generate）才能启动
  - CI（`.github/workflows/main.yml`）为此多出 `prisma migrate deploy` → `prisma generate` 两步
  - SQLite 还要经由 `@prisma/adapter-better-sqlite3` 适配器注入连接串，绕了一道间接层
  - 生成的 `LogLevel` 枚举与应用层需手工桥接（`Session.ts` 里的 `log.level as LogLevel`）
- 一个单文件数据库 + 三张表 + 少量 CRUD，用 `better-sqlite3` 加几条 SQL 即可完整覆盖；上述抽象里的大多数维度（多数据库、多环境迁移、关系型对象导航）在本项目中根本用不到。
- 所以：ORM 让项目"起步快"，但数据模型稳定后，它就从便捷变成了纯维护负担——这正是 [src/backend/README.md](src/backend/README.md) 路线图第 1 条（改用 `better-sqlite3` 直接管理 `dev.db`、去掉 migrate/generate 步骤）要解决的问题，记在这里与路线图互相印证。

### Agent Loop 与 model 的耦合不是缺陷，而是协议本身

Agent Loop 指 `BaseAgent.loop()` 那段"把用户输入追加进上下文 → 循环请求模型 → 处理输出 → 直到模型不再发 `function_call`"的驱动循环。说它与 model 耦合，是因为它消费、回填的字段与某一 provider 的请求 / 响应格式一一对应。

- **为什么初看像缺点**：通用 Agent 框架通常把 loop 从具体 provider 中抽象出来，宣称"换模型不改循环"。但这需要先发明一层中间表示（IR），再为每个 provider 翻译来翻译去。
- **但这里的耦合是协议本身，不是实现债**：
  - 循环的终止与回填语义依赖具体输出项：`reasoning` 与 `message` 可并存且要分别回填；`function_call` 出现则本地执行并回填 `function_call_output`；`web_search_call` 由模型内建完成、无需本地动作；`ask_developer` 命中即打断本轮（见 `BaseAgent.ts` 中逐条 `item.type` 分支）。
  - 若强行抽象成通用 loop，这些"模型行为差异"不会消失，只会变成中间 IR 上的特性开关或泄漏点——抽象净收益为负。
- **关键点：耦合被圈在一条很窄的协议链上**：`BaseAgent ⇄ ModelClient ⇄ responses.ts`（`ModelClient.requestResponsesAPI()` 的形参与 `BaseAgent.loop()` 每次要带的东西一一对应）。链条之上全部是模型无关的：`Session` 管会话 / 工作目录 / 持久化，`PlanAgent` 只做工具注册与 `requestFunctionCall()` 分发，`Tools/` 层实现工具本身。真要换 provider 时，需要动的是这条链（类型契约、client、agent 请求字段）——一次范围被圈定、结果可预期的重构，而不是全架构推倒。
- 对"为某一模型写运行时"的项目，让 Agent Loop 直接贴着模型协议，比预先支付一层通用抽象更务实。这与 [src/backend/README.md](src/backend/README.md) 中"与模型 provider 耦合的取舍"一节的判断一致。

### MCP 只该用于外部服务，不该复刻一台电脑上本有的 bash

初次接触 MCP 的人容易形成一个直觉：既然 MCP 是 Agent 工具的标准协议，那我所有能力都应该包一层 MCP server。本节想厘清一个分界——**MCP 真正解决的是"工具实现不在 Agent 手里"时的标准化问题**；而像 bash 这种"每台电脑上都有"的普适能力，直接注册成本地 function 工具就有同等效果。结论不是"不用 MCP"，而是把它用在本质所在之处：把**外部服务 API** 标准化成"一组工具"。

- **MCP 解决了什么**：一套协议把"能力的发现与调用"标准化（tool 的 list / call + 参数 schema），让任意 MCP client 都能消费任意 MCP server。但它的价值前提是双方之间存在边界——工具跨进程、跨机器、跨组织。没有这道边界时，协议就是纯开销。
- **有一大类能力没有这道边界**：文件、shell、目录——"bash 每个电脑都有"。本项目的做法正是如此：`execute_shell_command` 以及 `Tools/` 下的 shell 封装（`shell-execute` / `shell-ls` / `shell-pwd`）、`ask_developer`，都是本地实现，由 `requestFunctionCall()` 按 `name` 直接分发（见 `PlanAgent.ts` 的 `ToolsType` 注册与 `Tools/README.md`），全程不出进程、不碰网络，还已有 Docker Sandbox 隔离。对这类能力再套一层 MCP server，等于在"最该零成本复用"的普适能力上引入最多的接入成本——用协议的地方恰恰没有需要跨越的边界。
- **MCP 的真正落点：外部第三方 API**。当能力由另一方提供、而你不打算在自己的进程里维护它的实现时，协议才产生价值。以"高德地图"为例：地理编码、路径规划、POI 搜索，是内建搜索和本地 bash 都给不了的领域能力；由高德（或第三方）以 MCP server 形式把自己家的 HTTP API 暴露成**一组标准化工具**，任何 MCP-capable 的 Agent 就能用同一套 list/call 方式消费，而不必为每个外部 API 手写一遍集成代码。
- **所以判断"用不用 MCP"的分界，不在工具形态，而在实现归谁所有**：实现与 Agent 同进程、同信任域 → 本地 function 工具；实现属于外部服务、要跨网络调用 → 用 MCP 把调用标准化。本地能做的，就让它保持本地。

落到本项目上：当前所有工具都是本地 function 分发，正是"能本地就不上协议"的体现；而 [src/backend/README.md](src/backend/README.md) 路线图第 2 条"实现 MCP client 模块"的价值边界也因此清晰——它不是为了给 Agent 的每个能力都加一层 server，而是让 Agent 能以标准协议接入**外部工具与数据源（第三方服务）**。MCP 应聚焦于"一组外部工具 + 标准化调用"，而不是复刻一个运行在每台电脑上的 bash。

### 工具安全：Sandbox 替代逐条 approve，最小权限决定工具归属

许多 Agent 框架把"工具安全"做成**每次调用弹一次 approve**。本节想说明这是错的层级：真正要回答的是两个不同的问题——**执行边界**（用 Sandbox 兜住，于是无需逐条 approve）与**工具归属**（按最小权限切分，把 git 这类"checkpoint"留给审核 Agent）。

- **为什么答案不是 approve**：approve 的隐含假设是"工具调用本身就是危险源"，于是把人工塞进每一次调用。可一旦 shell 执行落在 Docker Sandbox（microVM 隔离、禁 sudo）里，单次调用的破坏半径已被环境封死——宿主不受损、沙箱随时可丢弃重建（`sandbox-init.sh` 每次清空并重新同步）。此时真正需要人判断的不再是"这条命令能不能跑"，而是"该不该把这批改动固化下来"。逐条 approve 只是把人工变成吞吐瓶颈，却挡不住沙箱内被允许的破坏。本项目对 shell 的执行设想即沙箱隔离（`sandbox-init.sh`、`Tools/README.md`），即便当前以本地 `exec` 过渡，也保留了 sudo 正则拦截与对应测试。
- **工具归属按最小权限，把"裁判权"与"执行权"分开**：不要造一个全能 Agent 再逐条审，而是按 Agent 的角色切工具集，让它只拥有完成任务所需的最小工具。机制在路线图第 5 条已写明：在沙箱里，不想让某个 Agent 用的工具，**就不装、不暴露**——权限不是靠运行时询问，而是靠环境里"根本没有"。
- **git 应在审核 Agent 手里，而非执行 Agent 手里**：执行 Agent 的职责是"产出修改"，它的世界里不该有"哪些修改值得沉淀为历史"的决定权。git 是强大的 checkpoint 工具——能提交、回滚、对比、合并；若执行 Agent 同时握着它，就等于既当选手又当裁判：它可自行决定哪些改动成为历史、甚至掩盖中间过程。正确的切分是：执行 Agent 只在沙箱的工作副本里改（即使副本里有 git，它操作的也只是可丢弃的复本，提交不触碰宿主历史）；审核 Agent 才持有真正的 git——检查产出、以 commit 生成 checkpoint、diff 后决定合并或回滚。于是"修改由谁批准"的答案也顺带清楚了：审批者是**审核 Agent**，而不是人类逐条 confirm，git 为这种审批提供了可回退的载体。
- 这正对应路线图第 4 条（A2A：执行 / 审核作为独立 Agent 相互协商）与第 5 条（沙箱按 Agent 粒度控制工具，最小权限）。本项目当前是单 Agent、尚无"审核者"，但地基已经铺好：shell 进沙箱（先隔离、后授权）+ 工具由 `PlanAgent` 的 `ToolsType` 显式注册。把"修改型"工具与 git 这类"checkpoint 型"工具拆给不同 Agent，体系会自然长成最小权限的审核协作，而不是退化回逐条 approve。

### 会话是单 Agent 时代的产物：隔离该交给路由，而不是用户手动"新开一个"

本项目目前确实有"会话"：`Session.ts` 负责创建 / 续接一个会话、自动起名，并把日志与 agent 输入按会话持久化进 `dev.db`。会话解决的是真问题——**上下文隔离**，防止不相关的内容互相污染。问题在于，它把隔离外包给了用户：由人来判断"这属于新话题、该另开一个"，就像对员工说"我们现在重新开一个会话"一样，既不自然，也打断思路。

- **现实世界从不靠"新开会话"隔离上下文**：你不会和公交车司机谈论天体物理，不会向餐厅厨师查询快递信息，不会向老板倾诉自己的 happy everything。不是因为谁替你做了隔离，而是**你找对了人**——司机、厨师、老板各自只持有属于自己职责的上下文，无关内容天然到不了他们那里。隔离是"角色边界"的副产物，而不是一次显式操作。
- **把"找对人"这件事实名化：通用路由 Agent**。用户不该决定"这段对话属于哪个会话"，而该由入口处一个**通用路由 Agent** 判断"这次请求该交给哪个专属 Agent"（写代码的、查地图的、生活助理的……），然后由用户与那个专属 Agent 直接对话。每个专属 Agent 只持有与自身职责相关的工具、数据与历史，上下文随职责天然隔离——用户从头到尾只需说话，不必说出"新开一个会话"。
- 会话随之从"用户可见、用户维护的开关"，退回为**各专属 Agent 内部的局部状态**——它仍可以存在（某个专属 Agent 内部的长任务仍需续接），但不再是横跨所有话题的全局容器；隔离不再由用户管理，而由路由层无状态地"把人送对地方"完成。极端情况下，路由层甚至可以是完全无状态的：它只做一次转发决策。
- 落到本项目：当前只有一个通用 `PlanAgent` + 一个工作区，能用的隔离轴只剩手动会话——这是它此刻存在的合理性，也正是它显得"无聊"的根源。当出现多个按角色分工的专属 Agent（路线图第 4 条的 A2A 封装、第 5 条按 Agent 切工具与沙箱）之后，会话边界就该由路由接管：你只管聊，"等下，我新开一个会话"这句话，应当由 Agent 替你说完。

## 文档导航

| 文档                                                                       | 定位                                                                          |
|----------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| [src/backend/README.md](src/backend/README.md)                             | 项目完整技术文档：特色、技术选型、架构、快速开始、测试说明、路线图、局限      |
| [src/backend/DeepSeek/README.md](src/backend/DeepSeek/README.md)           | ModelClient、BaseAgent 实现与设计说明                                         |
| [src/backend/Tools/README.md](src/backend/Tools/README.md)                 | 工具调用链路与工具实现说明                                                     |
| [src/backend/Tools/shell-command/README.md](src/backend/Tools/shell-command/README.md) | shell 命令工具（shell-execute / ls / pwd）实现细节               |
| [src/backend/DeepSeek/API/responses.ts](src/backend/DeepSeek/API/responses.ts) | 请求 / 响应 TypeScript 类型契约定义                                          |
| [test/](test)                                                              | 测试套件：shell 工具、ModelClient、PlanAgent、AppServer / Session 测试         |
