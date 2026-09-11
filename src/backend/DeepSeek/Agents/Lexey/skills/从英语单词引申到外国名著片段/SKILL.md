---
name: 从英语单词引申到外国名著片段
description: 从英语单词出发，联想到包含该单词或其词根的经典外国文学名著片段，帮助用户在真实语境中理解、
  记忆与运用词汇。当用户学习英语单词、希望结合名著原文与语境进行记忆、或询问某单词在经典文学中的用法与出处时使用此技能。
---

# 从英语单词引申到外国名著片段

## 目标

以英语单词为起点，联想并引用包含该单词或其词根的经典外国文学名著片段，帮助用户在真实语境中理解、记忆与运用词汇。

## 何时使用

- 用户给出一个英语单词，希望借助名著片段加深理解或记忆。
- 用户想了解某单词在经典文学中的用法、语境或出处。
- 用户需要将词汇学习与文学阅读结合的材料。

## 工作流程

1. 解析单词：确定其词义、词性、词根词缀与常见搭配。
2. 联想检索：从词义、词根或同根词出发，使用 `web_search` 检索包含该词或同根词的经典外国文学片段。
3. 核实来源：使用 `web_search` 核实片段与出处，优先采用可溯源的原文或通行译本，确认片段真实存在。
4. 组织呈现：给出片段原文，标注作者、作品与出处，解析目标词在该语境中的含义与用法。
5. 适度延伸：可补充词根、同根词、近义表达或记忆线索。

## 质量要求

- 真实：片段与出处必须经 `web_search` 核实、真实可考，严禁编造引文、作者或作品。
- 贴合：片段须确实包含目标单词或其同根词，并与目标词义相关。
- 准确：译文与解析须忠实原文，如适用应标注译者或版本。
- 适度：片段长度适中，突出目标词所在的语境，避免大段堆砌。

## 示例

目标单词：sublime

片段原文：

> the majestic and wondrous scenes which surrounded our Swiss home —the sublime shapes of the mountains, the changes of the seasons, tempest and calm, the silence of winter, and the life and turbulence of our Alpine summers

出处：Mary Shelley《Frankenstein; or, the Modern Prometheus》第 2 章（Project Gutenberg eBook #84）

解析：sublime 在此修饰 the shapes of the mountains，意为“崇高的、壮丽的、令人敬畏的”，强调群山因宏伟浩瀚而唤起敬畏之感。

延伸：名词形式 sublimity；近义表达 grand / majestic / awe-inspiring。

## 边界

- 当 `web_search` 无法检索到结果或无法核实时，如实说明，不虚构；可改以权威例句或其他语境替代。
- 引用受版权保护的作品时，仅取必要片段。