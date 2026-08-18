# ModelClient.ts

## 该文件命名为"ModelClient.ts"而不是"DeepSeekModelClient.ts"



## model 与 model-provider 是强绑的

"model" 与 "model-provider" 显然是强绑定的，例如，OpenAI的model-client与Anthropic的是截然不同的。
从根本上说，是因为他们的API格式完全不同。国内大部分model-provider是兼容OpenAI或Anthropic的API格式的，
但在此后的模型训练范式中，国内模型厂商不排除有可能引领新的模型训练范式，因此API格式有可能会发生变化。

综上，model与model-provider强绑是恰当的。

## ModelClient是使用模型提供商模型的一个“入口”



## 成员变量

### 

## 该层级所使用的schema对上层（BaseAgent）而言应该是“透明”的