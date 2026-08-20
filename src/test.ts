import {ModelClient} from "./DeepSeek/ModelClient.ts";
import type {InputType} from "./DeepSeek/API/responses/RequestSchema.ts";
import {ResponsesSchema} from "./DeepSeek/API/responses/ResponsesSchema.ts";

const modelClient = new ModelClient();
// console.log(typeof modelClient)