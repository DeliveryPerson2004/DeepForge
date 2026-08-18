# BaseAgent.ts

# DeepSeek dir

# 设计BaseAgent的开发人员也应该了解API文档中字段

在DeepSeek中设计的schema,BaseAgent开发人员不应该使用，区分开层级。
DeepSeek中相关类的开发人员应该使用schema校验传入的参数是否符合API规范，如果不符合，
因为使用了zod,那么会自动报错。