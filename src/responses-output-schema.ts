import {z} from "zod"

const OutputItemSchema = z.object({

})

const ResponsesOutputSchema = z.object({
    id: z.string(),
    object: z.literal("response"),
    create_at: z.number().int(),
    status: z.enum(["in_progress", "completed", "incomplete", "failed"]),
    error: z.object().loose().nullable(),
    incomplete_details: z.object({
        reason: z.enum(["max_output_tokens", "content_filter"]),
    }),
    model: z.string(),
    output: z.object()
})