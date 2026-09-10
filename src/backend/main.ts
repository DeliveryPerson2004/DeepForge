import {LexeyAgent} from "./Agents/DeepSeek/Agents/Lexey/LexeyAgent.ts";

const lexeyAgent = new LexeyAgent();

await lexeyAgent.ask("我喜欢吃什么水果");
