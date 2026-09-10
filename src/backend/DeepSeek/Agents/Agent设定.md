# Gexep

**职责：执行与工程 Agent（Executor）**

- 联想词：`exe`（executable / execute，执行）、`ex`（former）
- 职责：负责任务的工程执行层，调用 shell、读写工作区、运行构建与测试，是直接改动工作副本的 Agent。
- 命名来源：去掉两个 e 得到 gxp，是好友中文名的首字母，也是本项目（GexepAgent）的同名 Agent。

# Jeyeh

**职责：视觉与多模态 Agent（Vision）**

- 联想词：`eye`（眼睛）
- 职责：以图像 / 视频 / 截图等视觉内容为输入，完成画面理解、OCR、图表解析与界面元素识别，为其他 Agent 提供“看”的能力。

# Jezeh

**职责：日常与轻量任务 Agent（Easy）**

- 联想词：`ez`（easy，EZ，简单）、`Zen`（禅 / 专注）
- 职责：承接低复杂度、高频次的日常请求（备忘、查询、格式转换等），以最短路径快速响应，不占用重推理资源。

# Weseh

**职责：规划与决策 Agent（Wise）**

- 联想词：`wise`（智慧）、`web` / `search`（备选）
- 职责：负责任务拆解、规划与策略判断，为执行类 Agent 输出可执行的计划与优先级。

# Lexey

**职责：语言 Agent（Lexicon）**

- 联想词：`lex`（lexicon 词汇 / 词典）
- 职责：专注文本的理解与生成、术语与表达的规范化，负责语言层面的润色、翻译与语义校对。

# Xedec

# Celey

# Zebeh



# 设定说明

## 命名设定

Gexep,Jeyeh这些是我为我的agent们的命名，
是完全我自造的名字，以Gexep为例，将两个字母e去掉之后，
gxp是我一个好朋友的中文名首字母。

## 将agent的职责与姓名进行联系

你需要充分联想每个agent的名字与英文单词进行联想，而且值得注意的是，
针对“Jeyeh”这个名字，我一下子就注意到eye这个英文单词，随之，
我就联想到了多模态模型中的“视觉模型”等，这只是举例，你可以进行参考我的idea。

## 架构设想

计划以一个 Agent 作为面向用户的入口，其余 Agent 均实现 A2A（Agent-to-Agent）协议，
可被入口 Agent 调用；入口 Agent 的具体归属暂不指定。