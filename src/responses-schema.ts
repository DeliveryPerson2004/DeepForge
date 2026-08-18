import { z } from "zod"

const ModelSchema = z.enum([
    "deepseek-v4-flash",
]);

const TextInputSchema = z.string();

const InputTextBlockSchema = z.object({
    type: z.literal("input_text"),
    text: z.string(),
});

const OutputTextBlockSchema = z.object({
    type: z.literal("output_text"),
    text: z.string(),
});

const MessageItemSchema = z.object({
    type: z.literal("message"),
    role: z.enum(["user", "assistant", "system", "developer"]),
    content: z.union([
        z.string(),
        z.union([
            InputTextBlockSchema,
            OutputTextBlockSchema,
        ]),
        z.array(z.union([
            InputTextBlockSchema,
            OutputTextBlockSchema,
        ])),
    ])
});

const ReasoningTextBlockSchema = z.object({
    type: z.literal("reasoning_text"),
    text: z.string(),
});

const ReasoningItemSchema = z.object({
    type: z.literal("reasoning"),
    content: z.array(ReasoningTextBlockSchema),
});

const FunctionCallItemSchema = z.object({
    type: z.literal("function_call"),
    call_id: z.string(),
    name: z.string(),
    arguments: z.json()
});

const FunctionCallOutputItemSchema = z.object({
    type: z.literal("function_call_output"),
    call_id: z.string(),
    output: z.string(),
});

const WebSearchCallItemSchema = z.object({
    type: z.literal("web_search_call"),
}).loose();

const InputItemSchema = z.union([
        MessageItemSchema,
        ReasoningItemSchema,
        FunctionCallItemSchema,
        FunctionCallOutputItemSchema,
        WebSearchCallItemSchema,
]);

const InputItemListSchema = z.array(InputItemSchema);

const InputSchema = z.union([
    TextInputSchema,
    InputItemListSchema,
]).nullable();

const InstructionsSchema = z.string().nullable();

export const ReasoningAPISchema = z.object({
    effort: z.enum(["none", "low", "high", "max"]).nullable()
}).nullable();

const MaxOutputTokensSchema = z.number().nullable();

const StreamSchema = z.boolean().nullable();

const FormatTextSchema = z.object({
    type: z.literal("text"),
});

const FormatJsonSchema = z.object({
    type: z.literal("json_schema"),
    name: z.string(),
    schema: z.json(),
})

const TextAPISchema = z.object({
    format: z.union([FormatTextSchema, FormatJsonSchema])
}).nullable()

const ToolsFunctionItemSchema = z.object({
    type: z.literal("function"),
    name: z.string(),
    description: z.string(),
    parameters: z.json(),
}).nullable();

const ToolsWebSearchItemSchema = z.object({
    type: z.literal("web_search"),
}).loose();

const ToolsItemSchema = z.union([
    ToolsFunctionItemSchema, ToolsWebSearchItemSchema
]);

const ToolsAPISchema = z.array(ToolsItemSchema).nullable();

const UserSchema = z.string().nullable();

export const RequestBodySchema = z.object({
    model: ModelSchema,
    input: InputSchema,
    instructions: InstructionsSchema,
    reasoning: ReasoningAPISchema,
    max_output_tokens: MaxOutputTokensSchema.optional(),
    stream: StreamSchema,
    text: TextAPISchema,
    tools: ToolsAPISchema,
    user: UserSchema.optional(),
})

export type ToolsAPI = z.infer<typeof ToolsAPISchema>;
export type ReasoningAPI = z.infer<typeof ReasoningAPISchema>;
export type TextAPI = z.infer<typeof TextAPISchema>;
export type InputItem = z.infer<typeof InputItemSchema>;