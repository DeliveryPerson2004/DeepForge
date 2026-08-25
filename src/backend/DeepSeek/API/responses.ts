export enum ModelType{
    DeepSeekV4Flash = "deepseek-v4-flash",
    DeepSeekV4Pro = "deepseek-v4-pro",
}

export type InputMessageItem = {
    type: "message",
    role: "user" | "assistant" | "system",
    content: string,
}

export type InputFunctionCallItem = {
    type: "function_call",
    call_id: string,
    name: string,
    arguments: string,
}

export type InputFunctionCallOutputItem = {
    type: "function_call_output",
    call_id: string,
    name: string,
    arguments: string,
    output: string,
}

type InputCustomToolCallItem = {

}

type InputCustomToolCallOutputItem = {

}

type InputReasoningItem = {
    type: "reasoning",
    content: string,
}

type InputWebSearchCallItem = {

}

export type InputItemType =
    InputMessageItem |
    InputFunctionCallItem |
    InputFunctionCallOutputItem |
    InputCustomToolCallItem |
    InputCustomToolCallOutputItem |
    InputReasoningItem |
    InputWebSearchCallItem;

export type InputType = InputItemType[] | string;

export enum EffortType{
    None = "none",
    Low = "low",
    High = "high",
    Max = "max",
}

interface ReasoningType{
    effort: EffortType,
}

interface TextFormatText{
    type: "text",
}

interface TextFormatJsonObject{
    type: "json_object",
}

interface TextFormatJsonSchema{
    type: "json_schema",
    name: string,
    schema: object,
}

type TextFormatType =
    TextFormatText |
    TextFormatJsonObject |
    TextFormatJsonSchema;

interface TextType{
    format: TextFormatType,
}

interface ToolsFunctionItem{
    type: "function",
    name: string,
    description: string,
    parameters: {
        "type": "object",
        "properties": object,
        "required": string[],
    }
}

interface ToolsWebSearchItem{
    type: "web_search",
}

type ToolsItemType = ToolsFunctionItem | ToolsWebSearchItem;

export type ToolsType = ToolsItemType[];

export interface RequestBody {
    model: ModelType,
    input: InputType,
    instructions?: string,
    reasoning?: ReasoningType,
    stream?: boolean,
    text?: TextType,
    tools?: ToolsType,
    user?: string,
}

interface ResponseSchemaOutputMessageItem{
    type: "message",
    id: string,
    status: "in_progress" | "completed" | "incomplete",
    role: "assistant",
    content: [{
        type: "output_text",
        text: string,
    }]
}

interface ResponseSchemaOutputReasoningItem{
    type: "reasoning",
    id: string,
    status: "in_progress" | "completed" | "incomplete",
    content: [{
        type: "reasoning_text",
        text: string,
    }]
}

interface ResponseSchemaOutputFunctionCallItem{
    type: "function_call",
    id: string,
    status: "in_progress" | "completed" | "incomplete",
    call_id: string,
    name: string,
    arguments: string,
}

interface ResponseSchemaOutputWebSearchCallItem{
    type: "web_search_call",
    id: string,
    status: "in_progress" | "completed" | "incomplete",
    action: object,
}

type ResponseSchemaOutputType =
    ResponseSchemaOutputMessageItem |
    ResponseSchemaOutputReasoningItem |
    ResponseSchemaOutputFunctionCallItem |
    ResponseSchemaOutputWebSearchCallItem;

export interface ResponseSchema {
    id: string,
    object: "response",
    created_at: number,
    status: "in_progress" | "completed" | "incomplete" | "failed",
    error: object,
    incomplete_details: object,
    model: string,
    output: ResponseSchemaOutputType[]
    usage: {
        input_tokens: number,
        input_tokens_details: object,
        output_tokens: number,
        output_tokens_details: object,
        total_tokens: number,
    }
}