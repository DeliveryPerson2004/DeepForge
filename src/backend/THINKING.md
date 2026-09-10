# 方向与取舍（thinking）

下面七节是本项目的主要 **thinking**——围绕架构与产品形态的设计取舍与方向设想，其中**部分内容尚未在代码中实现**，只是思考的记录。放在读代码之前，是希望你先理解这些"为什么这么做 / 为什么不那么做"的决定：既不至于把它们误当成缺陷，也别把未落地的设想当成已实现的能力。已实现的部分，以 [README.md](README.md) 的说明与代码为准。

## 不用 SDK，才能留住每个模型自己的特色

初次打开本项目的读者可能好奇：为什么放着官方 SDK 不用，却自己用 `fetch` 裸调 HTTP？答案是——本项目是一个**由输出项驱动的 Agent 运行时**，而不是一个"消费一段文本"的客户端；而一个模型区别于其他模型的特色，恰好都藏在那些输出项与请求参数里。

- 如果只把 SDK 当 `chat.completions` 用，你拿到的大概率是 text + tool_calls 这个被抹平后的"最小公约数"。SDK 面向"能用"而抽象，会天然把各家特有的能力收敛成其原作者模型的假设，你的代码里再也见不到它们。
- 本项目绕开了这一层：`Agents/DeepSeek` 用 Node 原生 `fetch` 直连 `POST https://api.deepseek.com/responses`，请求体按 `RequestBody` 手写，类型全部由 `Agents/DeepSeek/API/responses.ts` 约束，`package.json` 里没有任何 openai 依赖。
- 而 DeepSeek `/responses` 的特色在这套类型契约里全是"一等公民"：
  - 响应输出项远不止 `message`：还有 `reasoning`（推理过程）、`web_search_call`（内建搜索调用）、`function_call`。`BaseAgent.ask()` 正是按这四类 item 分别处理、回填与判定终止的（见 `Agents/DeepSeek/Agents/BaseAgent.ts`）。
  - 请求侧 `text.format` 支持 `json_schema` 结构化输出（`API/responses.ts` 中的 `TextFormatJsonSchema`），可用于把模型输出约束成固定 JSON 形态。
  - 内建 `web_search` 工具、预留的 `custom_tool_call` 输入 / 输出项、`reasoning` 的 effort 档位……这些一旦改走 SDK，大多只能靠 `as any` 逃生，编译期契约当场失效。
- 若目标只是"拿到一段文本"，SDK 是更短的路；但当你需要模型"边推理边搜、边搜边调工具、且把每一步都回填进上下文"时，SDK 替你省掉的细节恰恰是你不能丢的细节。这正是本项目选择"直连 API + 手写类型契约"、并接受与单一 provider 强绑的原因，详见 [README.md](README.md) 中"与模型 provider 耦合的取舍"一节。

## 不引入 ORM，单文件 SQLite + 两张表才是项目本来的复杂度

这句话不是否定 ORM，而是对照本项目的数据形态说的——当你的持久化只有两张表、单文件 SQLite、几条简单查询时，ORM 提供的便捷和它索取的成本会失衡。

- **便捷确实存在**：`schema.prisma` 一处声明即得表结构与类型化 client；开发期 `prisma migrate dev` 起步建表很快。
- **但真实数据面很小**：全项目只有 `agent` / `message` 两张表，其中 `message.content` 只是整段 JSON 存取；运行期用法无非 `selectIdFromAgentTableStmt` / `selectMaxTurnFromAgentTableStmt` / `insertIntoMessageTableStmt` / `selectMessageFromMessageTableStmt` 几条 prepared statement（见 `database/stmt.ts`），没有任何需要查询构建器或复杂关系导航的场合。
- **为这份便捷付出的额外抽象**：schema DSL + generator 把构建产物生成到被 gitignore 的 `generated/prisma`；克隆后必须先跑 `init-prisma.sh`（migrate + generate）才能启动；SQLite 还要经由 `@prisma/adapter-better-sqlite3` 适配器注入连接串，绕了一道间接层；生成的 `LogLevel` 枚举与应用层需手工桥接。
- 本项目已按此判断**移除了 Prisma**：改用 `better-sqlite3` 直接管理 `./database.db`，表结构由 `database/initDatabase.ts` 的 `CREATE TABLE IF NOT EXISTS` 建立，去掉了 migrate / generate 与适配层。ORM 让项目"起步快"，但数据模型稳定后，它就从便捷变成了纯维护负担——这条取舍现已落地。

## Agent Loop 与 model 的耦合不是缺陷，而是协议本身

Agent Loop 指 `BaseAgent.ask()` 那段"把用户输入追加进上下文 → 循环请求模型 → 处理输出 → 直到模型不再发 `function_call`"的驱动循环。说它与 model 耦合，是因为它消费、回填的字段与某一 provider 的请求 / 响应格式一一对应。

- **为什么初看像缺点**：通用 Agent 框架通常把 loop 从具体 provider 中抽象出来，宣称"换模型不改循环"。但这需要先发明一层中间表示（IR），再为每个 provider 翻译来翻译去。
- **但这里的耦合是协议本身，不是实现债**：
  - 循环的终止与回填语义依赖具体输出项：`reasoning` 与 `message` 可并存且要分别回填；`function_call` 出现则本地执行并回填 `function_call_output`；`web_search_call` 由模型内建完成、无需本地动作；命中"向开发者提问"类工具即打断本轮（见 `Agents/DeepSeek/Agents/BaseAgent.ts` 中逐条 `item.type` 分支）。
  - 若强行抽象成通用 loop，这些"模型行为差异"不会消失，只会变成中间 IR 上的特性开关或泄漏点——抽象净收益为负。
- **关键点：耦合被圈在一条很窄的协议链上**：`BaseAgent ⇄ ModelClient ⇄ responses.ts`（`ModelClient.requestResponsesAPI()` 的形参与 `BaseAgent.ask()` 每次要带的东西一一对应）。链条之上全部是模型无关的：`BaseAgent` 管对话循环与持久化回填，`LexeyAgent` 只做工具注册与 `requestFunctionCall()` 分发，`Tools/` 层实现工具本身。真要换 provider 时，需要动的是这条链（类型契约、client、agent 请求字段）——一次范围被圈定、结果可预期的重构，而不是全架构推倒。
- 对"为某一模型写运行时"的项目，让 Agent Loop 直接贴着模型协议，比预先支付一层通用抽象更务实。这与 [README.md](README.md) 中"与模型 provider 耦合的取舍"一节的判断一致。

## MCP 只该用于外部服务，不该复刻一台电脑上本有的 bash

初次接触 MCP 的人容易形成一个直觉：既然 MCP 是 Agent 工具的标准协议，那我所有能力都应该包一层 MCP server。本节想厘清一个分界——**MCP 真正解决的是"工具实现不在 Agent 手里"时的标准化问题**；而像 bash 这种"每台电脑上都有"的普适能力，直接注册成本地 function 工具就有同等效果。结论不是"不用 MCP"，而是把它用在本质所在之处：把**外部服务 API** 标准化成"一组工具"。

- **MCP 解决了什么**：一套协议把"能力的发现与调用"标准化（tool 的 list / call + 参数 schema），让任意 MCP client 都能消费任意 MCP server。但它的价值前提是双方之间存在边界——工具跨进程、跨机器、跨组织。没有这道边界时，协议就是纯开销。
- **有一大类能力没有这道边界**：文件、shell、目录——"bash 每个电脑都有"。本项目的做法正是如此：`Tools/shellCommand` 下的 shell 封装（`shell-execute` / `shell-ls` / `shell-pwd`）与 `Tools/askDeveloper.ts`，都是本地实现，由 `requestFunctionCall()` 按 `name` 直接分发（见 `Agents/DeepSeek/Agents/Lexey/LexeyAgent.ts` 的 `ToolsType` 注册与 [Tools/README.md](Tools/README.md)），全程不出进程、不碰网络。对这类能力再套一层 MCP server，等于在"最该零成本复用"的普适能力上引入最多的接入成本——用协议的地方恰恰没有需要跨越的边界。
- **MCP 的真正落点：外部第三方 API**。当能力由另一方提供、而你不打算在自己的进程里维护它的实现时，协议才产生价值。以"高德地图"为例：地理编码、路径规划、POI 搜索，是内建搜索和本地 bash 都给不了的领域能力；由高德（或第三方）以 MCP server 形式把自己家的 HTTP API 暴露成**一组标准化工具**，任何 MCP-capable 的 Agent 就能用同一套 list/call 方式消费，而不必为每个外部 API 手写一遍集成代码。
- **所以判断"用不用 MCP"的分界，不在工具形态，而在实现归谁所有**：实现与 Agent 同进程、同信任域 → 本地 function 工具；实现属于外部服务、要跨网络调用 → 用 MCP 把调用标准化。本地能做的，就让它保持本地。

落到本项目上：当前所有工具都是本地 function 分发，正是"能本地就不上协议"的体现；而 [README.md](README.md) 路线图中"实现 MCP client 模块"的价值边界也因此清晰——它不是为了给 Agent 的每个能力都加一层 server，而是让 Agent 能以标准协议接入**外部工具与数据源（第三方服务）**。MCP 应聚焦于"一组外部工具 + 标准化调用"，而不是复刻一个运行在每台电脑上的 bash。

## 工具安全：Sandbox 替代逐条 approve，最小权限决定工具归属

许多 Agent 框架把"工具安全"做成**每次调用弹一次 approve**。本节想说明这是错的层级：真正要回答的是两个不同的问题——**执行边界**（用 Sandbox 兜住，于是无需逐条 approve）与**工具归属**（按最小权限切分，把 git 这类"checkpoint"留给审核 Agent）。

- **为什么答案不是 approve**：approve 的隐含假设是"工具调用本身就是危险源"，于是把人工塞进每一次调用。可一旦 shell 执行落在 Docker Sandbox（microVM 隔离、禁 sudo）里，单次调用的破坏半径已被环境封死——宿主不受损、沙箱随时可丢弃重建。此时真正需要人判断的不再是"这条命令能不能跑"，而是"该不该把这批改动固化下来"。逐条 approve 只是把人工变成吞吐瓶颈，却挡不住沙箱内被允许的破坏。本项目对 shell 的执行设想即沙箱隔离：`Tools/shellCommand/shell-execute.ts` 目前以本地 `exec` 过渡，但已保留 sudo 正则拦截与对应测试，作为进沙箱前的第一道防护。
- **工具归属按最小权限，把"裁判权"与"执行权"分开**：不要造一个全能 Agent 再逐条审，而是按 Agent 的角色切工具集，让它只拥有完成任务所需的最小工具。机制见 [README.md](README.md) 路线图：在沙箱里，不想让某个 Agent 用的工具，**就不装、不暴露**——权限不是靠运行时询问，而是靠环境里"根本没有"。
- **git 应在审核 Agent 手里，而非执行 Agent 手里**：执行 Agent 的职责是"产出修改"，它的世界里不该有"哪些修改值得沉淀为历史"的决定权。git 是强大的 checkpoint 工具——能提交、回滚、对比、合并；若执行 Agent 同时握着它，就等于既当选手又当裁判：它可自行决定哪些改动成为历史、甚至掩盖中间过程。正确的切分是：执行 Agent 只在沙箱的工作副本里改（即使副本里有 git，它操作的也只是可丢弃的复本，提交不触碰宿主历史）；审核 Agent 才持有真正的 git——检查产出、以 commit 生成 checkpoint、diff 后决定合并或回滚。于是"修改由谁批准"的答案也顺带清楚了：审批者是**审核 Agent**，而不是人类逐条 confirm，git 为这种审批提供了可回退的载体。
- 这正对应 [README.md](README.md) 路线图中的 A2A（执行 / 审核作为独立 Agent 相互协商）与"沙箱按 Agent 粒度控制工具，最小权限"。本项目当前是单 Agent、尚无"审核者"，但地基已经铺好：工具由 `LexeyAgent` 的 `ToolsType` 显式注册、shell 以 sudo 拦截先行防护。把"修改型"工具与 git 这类"checkpoint 型"工具拆给不同 Agent，体系会自然长成最小权限的审核协作，而不是退化回逐条 approve。

## 会话是单 Agent 时代的产物：隔离该交给路由，而不是用户手动"新开一个"

本项目目前确实有"会话"的雏形：`agent` 表为每个 Agent 建档（`name` / `max_turn`），`message` 表按 `agent_id` 持久化历史输入，`BaseAgent.ask()` 每轮把增量写回 `message`，启动时再由 `LexeyAgent` 从 `message` 表恢复上下文（见 `database/` 与 `Agents/DeepSeek/Agents/Lexey/LexeyAgent.ts`）。它解决的是真问题——**上下文隔离**，防止不相关的内容互相污染。问题在于，它把隔离外包给了用户：由人来判断"这属于新话题、该另开一个"，既不自然，也打断思路。

- **现实世界从不靠"新开会话"隔离上下文**：你不会和公交车司机谈论天体物理，不会向餐厅厨师查询快递信息。不是因为谁替你做了隔离，而是**你找对了人**——司机、厨师、老板各自只持有属于自己职责的上下文，无关内容天然到不了他们那里。隔离是"角色边界"的副产物，而不是一次显式操作。
- **把"找对人"这件事实名化：通用路由 Agent**。用户不该决定"这段对话属于哪个会话"，而该由入口处一个**通用路由 Agent** 判断"这次请求该交给哪个专属 Agent"（写代码的、查地图的、生活助理的……），然后由用户与那个专属 Agent 直接对话。每个专属 Agent 只持有与自身职责相关的工具、数据与历史，上下文随职责天然隔离——用户从头到尾只需说话，不必说出"新开一个会话"。
- 会话随之从"用户可见、用户维护的开关"，退回为**各专属 Agent 内部的局部状态**——它仍可以存在（某个专属 Agent 内部的长任务仍需续接），但不再是横跨所有话题的全局容器；隔离不再由用户管理，而由路由层无状态地"把人送对地方"完成。极端情况下，路由层甚至可以是完全无状态的：它只做一次转发决策。
- 落到本项目：当前只有一个 `LexeyAgent` + 一份历史，能用的隔离轴只剩"手动清空 / 另起"，这正是它此刻存在的合理性，也是它显得"无聊"的根源。当出现多个按角色分工的专属 Agent（路线图中的 A2A 封装、按 Agent 切工具与沙箱）之后，会话边界就该由路由接管：你只管聊，"等下，我新开一个会话"这句话，应当由 Agent 替你说完。

## 上下文窗口再长也只是"短期记忆"，而更宝贵的是长期记忆的设计

如果预估上下文窗口的空余容量能完成某个任务，便可以继续使用该窗口完成任务，尽管在这个窗口中有不同的任务。
你询问一个天气 Agent 北京的天气如何，等到第二天你又问了他一个有关纽约天气的问题，这都是符合天气 Agent 职责的问题。
当预估窗口余量无法完成某一项任务时，能否考虑直接清空所有的"短期记忆"？
我们尝试假定长期记忆在任务执行过程中已经通过比如 GraphRAG 的方式固化下来了。
每次用户提出了一个新任务时，在我们的假设下，Agent 应该都能够通过检索长期记忆的方式，找回被我们"删掉的短期记忆"中的细节。
