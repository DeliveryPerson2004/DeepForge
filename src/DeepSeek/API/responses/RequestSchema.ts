import { z } from "zod"

export const ModelSchema = z.enum([
    "deepseek-v4-flash",
    "deepseek-v4-pro"
]);
export type ModelType = z.infer<typeof ModelSchema>;

const TextInputSchema = z.string();

const InputTextBlockSchema = z.object({
    type: z.literal("input_text"),
    text: z.string(),
});

const OutputTextBlockSchema = z.object({
    type: z.literal("output_text"),
    text: z.string(),
});

export const MessageItemSchema = z.object({
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

export const InputSchema = z.array(InputItemSchema);

// export const InputSchema = z.union([
//     InputItemListSchema,
// ]).nullable();
export type InputType = z.infer<typeof InputSchema>;

export const InstructionsSchema = z.string().nullable();
export type InstructionsType = z.infer<typeof InstructionsSchema>;

export const ReasoningSchema = z.object({
    effort: z.enum(["none", "low", "high", "max"]).nullable()
}).nullable();
export type ReasoningType = z.infer<typeof ReasoningSchema>;

const MaxOutputTokensSchema = z.number().nullable();

export const StreamSchema = z.boolean().nullable();
export type StreamType = z.infer<typeof StreamSchema>;

const FormatTextSchema = z.object({
    type: z.literal("text"),
});

const FormatJsonSchema = z.object({
    type: z.literal("json_schema"),
    name: z.string(),
    schema: z.json(),
})

export const TextSchema = z.object({
    format: z.union([FormatTextSchema, FormatJsonSchema])
}).nullable()
export type TextType = z.infer<typeof TextSchema>;

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

export const ToolsSchema = z.array(ToolsItemSchema).nullable();
export type ToolsType = z.infer<typeof ToolsSchema>;

export const UserSchema = z.string().nullable();
export type UserType = z.infer<typeof UserSchema>;

export const RequestBodySchema = z.object({
    model: ModelSchema,
    input: InputSchema,
    instructions: InstructionsSchema,
    reasoning: ReasoningSchema.optional(),
    max_output_tokens: MaxOutputTokensSchema.optional(),
    stream: StreamSchema.optional(),
    text: TextSchema.optional(),
    tools: ToolsSchema,
    user: UserSchema,
});