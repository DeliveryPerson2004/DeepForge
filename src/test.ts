import {ModelClient} from "./DeepSeek/ModelClient.ts";
import type {InputType} from "./DeepSeek/API/responses/RequestSchema.ts";
import {ResponsesSchema} from "./DeepSeek/API/responses/ResponsesSchema.ts";

const modelClient = new ModelClient();
console.log(typeof modelClient)

// const input: InputType = "你好，你能帮我做什么？"
//
// const responses = await modelClient.requestResponsesAPI(
//     "deepseek-v4-flash",
//     input,
//     "你是智能助手。",
// )
//
// // const responsesParsed = ResponsesSchema.parse(responses);
//
// // console.log(responsesParsed);
// for(const item of responses.output){
//     if(item.type == "message" || item.type == "reasoning"){
//         console.log(item.content);
//     }
// }