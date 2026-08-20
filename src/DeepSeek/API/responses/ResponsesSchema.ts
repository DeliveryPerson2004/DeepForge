import {z} from "zod"

const MessageItemContentItemSchema = z.object({
    type: z.literal("output_text"),
    text: z.string(),
})

const ReasoningItemContentItemSchema = z.object({
    type: z.literal("reasoning_text"),
    text: z.string(),
});

const OutputMessageItemSchema = z.object({
    type: z.literal("message"),
    id: z.string(),
    status: z.enum(["in_progress", "completed", "incomplete"]),
    role: z.literal("assistant"),
    content: z.array(MessageItemContentItemSchema),
})

const OutputReasoningItemSchema = z.object({
    type: z.literal("reasoning"),
    id: z.string(),
    status: z.enum(["in_progress", "completed", "incomplete"]),
    content: z.array(ReasoningItemContentItemSchema),
})

const OutputFunctionCallItemSchema = z.object({
    type: z.literal("function_call"),
    id: z.string(),
    status: z.enum(["in_progress", "completed", "incomplete"]),
    call_id: z.string(),
    name: z.string(),
    arguments: z.string(),
})

const OutputWebSearchCallItemSchema = z.object({
    type: z.literal("web_search_call"),
    id: z.string(),
    status: z.enum(["in_progress", "completed", "incomplete"]),
    action: z.object().loose(),
})

const OutputItemSchema = z.union([
    OutputMessageItemSchema,
    OutputReasoningItemSchema,
    OutputFunctionCallItemSchema,
    OutputWebSearchCallItemSchema,
]);

const UsageSchema = z.object({
    input_tokens: z.int(),
    input_tokens_details: z.object({
        cached_tokens: z.int(),
    }),
    output_tokens: z.int(),
    output_tokens_details: z.object({
        reasoning_tokens: z.int(),
    }),
    total_tokens: z.int(),
})

export const ResponsesSchema = z.object({
    id: z.string(),
    object: z.literal("response"),
    created_at: z.number().int(),
    status: z.enum(["in_progress", "completed", "incomplete", "failed"]),
    error: z.object().loose().nullable(),
    incomplete_details: z.object({
        reason: z.enum(["max_output_tokens", "content_filter"]),
    }).nullable(),
    model: z.string(),
    output: z.array(OutputItemSchema),
    usage: UsageSchema,
});