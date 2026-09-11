# Agents 名册与命名约定

本项目是一个多智能体运行时——**Pantheon of Confidants**。每个 Agent 都是现实中一位好友的化身，各司其职、协同完成任务。本文件记录 Agent 名册、命名规则与协作设想。

## 命名规则

- **名字来源**：取好友中文名的拼音首字母 `C1C2C3`，在字母之间插入两个 `e`，得到 `C1eC2eC3`。例如 `gxp → Gexep`、`lxy → Lexey`、`jyh → Jeyeh`。名字本身是一层只有懂的人才读得懂的暗号。
- **职责联想**：再为每个名字联想一个英文单词，作为该 Agent 的职责主题。例如 `Jeyeh` 中的 `eye` → 视觉 / 多模态；`Lexey` 中的 `lex` → lexicon（语言）。
- **项目名呼应**：`Pantheon`（万神殿）是众 Agent 的群像，`Confidant`（挚友）既是每个 Agent 的身份，也是 Persona 里"与挚友建立羁绊、以 Coop 等级累积协作"的系统。

## 名册

| Agent | 职责 | 联想词 | 状态 |
| ----- | ---- | ------ | ---- |
| **Lexey** | 语言 Agent（Lexicon）：多语言学习辅导与文本处理（翻译、润色、校对、摘要、术语规范化） | `lex`（lexicon 词汇 / 词典） | 已实现 |
| **Gexep** | 入口与协调 Agent（Gateway）：理解用户需求、协调专属 Agent，并统一验收和交付结果 | `exe`（execute 执行）、`ex`（former） | 部分实现（A2A 待接入） |
| **Jeyeh** | 视觉与多模态 Agent（Vision）：图像 / 视频 / 截图的画面理解、OCR、图表解析与界面元素识别 | `eye`（眼睛） | 规划中 |
| **Jezeh** | 日常与轻量任务 Agent（Easy）：备忘、查询、格式转换等低复杂度高频请求，最短路径快速响应 | `ez`（easy / EZ）、`Zen`（禅 / 专注） | 规划中 |
| **Weseh** | 规划与决策 Agent（Wise）：任务拆解、规划与策略判断，为执行类 Agent 输出计划与优先级 | `wise`（智慧）、`web` / `search`（备选） | 规划中 |
| **Xedec** | 待定 | — | TODO |
| **Celey** | 待定 | — | TODO |
| **Zebeh** | 测试与验证 Agent（Behavior）：编写 / 运行测试、断言行为、回归验证 | `beh`（behavior 行为） | 规划中 |

> `Gexep` 去掉两个 `e` 得到 `gxp`，既是好友中文名的首字母，也曾是本项目的旧代号（`GexepAgent`）。

## 协作设想

- **Gexep** 是面向用户的统一入口；其余 Agent 计划实现 A2A（Agent-to-Agent）协议，由 Gexep 根据用户需求调用。当前 A2A 尚未实现。
- 隔离交给路由而非用户手动"新开会话"：由入口处的通用路由 Agent 判断"这次请求该交给哪个专属 Agent"，每个专属 Agent 只持有与自身职责相关的工具、数据与历史。详见 [../THINKING.md](../../THINKING.md)。
- 工具按最小权限切分：执行类 Agent 只拥有产出修改所需的最小工具，git 等"checkpoint 型"工具留给审核 Agent。详见 [../THINKING.md](../../THINKING.md) 与 [../README.md](../../README.md) 路线图。
