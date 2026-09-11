import "dotenv/config";
import nodemailer from "nodemailer";
import {z} from "zod";
import {logger} from "../logger.ts";


export const sendEmailInputSchema = z.object({
    senderName: z.string().trim().min(1).max(100),
    subject: z.string().trim().min(1).max(200),
    text: z.string().trim().min(1).max(100_000),
    html: z.string().trim().min(1).max(200_000).optional(),
});

export type SendEmailInputType = z.infer<typeof sendEmailInputSchema>;

const emailConfigSchema = z.object({
    host: z.string().trim().min(1),
    port: z.number().int().min(1).max(65_535),
    secure: z.boolean(),
    user: z.string().trim().min(1),
    pass: z.string().min(1),
    from: z.string().trim().email(),
    to: z.string().trim().email(),
});

export type EmailConfig = z.infer<typeof emailConfigSchema>;

// 邮箱与 SMTP 服务固定在工具中；授权码只从 .env 的 SMTP_PASS 读取。
const EMAIL_CONFIG = {
    host: "smtp.qq.com",
    port: 465,
    secure: true,
    user: "2803801506@qq.com",
    pass: process.env.SMTP_PASS,
    from: "2803801506@qq.com",
    to: "2803801506@qq.com",
};

interface EmailTransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

interface EmailMessage {
    from: {
        name: string;
        address: string;
    };
    to: string;
    subject: string;
    text: string;
    html?: string;
}

interface EmailTransport {
    sendMail(message: EmailMessage): Promise<{messageId?: string}>;
    close(): void;
}

type CreateEmailTransport = (options: EmailTransportOptions) => EmailTransport;

export interface SendEmailDependencies {
    config?: EmailConfig;
    createTransport?: CreateEmailTransport;
}

const defaultCreateTransport: CreateEmailTransport = (options) => nodemailer.createTransport(options);

function formatZodError(error: z.ZodError): string {
    return error.issues
        .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
        .join("；");
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Send an email to the single recipient configured in EMAIL_CONFIG.
 *
 * The recipient is deliberately not accepted as tool input, preventing an Agent
 * from redirecting messages to an arbitrary address.
 */
export async function sendEmail(
    input: SendEmailInputType,
    dependencies: SendEmailDependencies = {},
): Promise<string> {
    const inputParseResult = sendEmailInputSchema.safeParse(input);
    if (!inputParseResult.success) {
        return `发送邮件失败：参数校验失败：${formatZodError(inputParseResult.error)}`;
    }

    const configParseResult = emailConfigSchema.safeParse(dependencies.config ?? EMAIL_CONFIG);
    if (!configParseResult.success) {
        return `发送邮件失败：SMTP 配置无效：${formatZodError(configParseResult.error)}`;
    }

    const config = configParseResult.data;
    const message: EmailMessage = {
        from: {
            name: inputParseResult.data.senderName,
            address: config.from,
        },
        to: config.to,
        subject: inputParseResult.data.subject,
        text: inputParseResult.data.text,
        ...(inputParseResult.data.html === undefined ? {} : {html: inputParseResult.data.html}),
    };

    const createTransport = dependencies.createTransport ?? defaultCreateTransport;
    let transport: EmailTransport | undefined;
    try {
        transport = createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });
        const info = await transport.sendMail(message);
        logger.info("Tool sendEmail() sent an email to the configured recipient.");
        return info.messageId === undefined
            ? "邮件已发送到配置的收件邮箱。"
            : `邮件已发送到配置的收件邮箱。messageId: ${info.messageId}`;
    } catch (error) {
        const messageText = formatError(error);
        logger.warn(`Tool sendEmail() failed: ${messageText}`);
        return `发送邮件失败：${messageText}`;
    } finally {
        try {
            transport?.close();
        } catch (error) {
            logger.warn(`Tool sendEmail() failed to close SMTP transport: ${formatError(error)}`);
        }
    }
}
