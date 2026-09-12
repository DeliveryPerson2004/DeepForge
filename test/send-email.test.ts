import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {
    sendEmail,
    sendEmailInputSchema,
    type EmailConfig,
    type SendEmailDependencies,
} from "../src/backend/Tools/sendEmail.ts";


const validConfig: EmailConfig = {
    host: "smtp.example.com",
    port: 465,
    secure: true,
    user: "sender@example.com",
    pass: "app-password",
    from: "sender@example.com",
    to: "owner@example.com",
};

describe("sendEmailInputSchema", () => {
    it("接受纯文本邮件和可选 HTML", () => {
        assert.equal(sendEmailInputSchema.safeParse({
            senderName: "Gexep",
            subject: "测试主题",
            text: "测试正文",
            html: "<p>测试正文</p>",
        }).success, true);
    });

    it("拒绝空主题和空正文", () => {
        assert.equal(sendEmailInputSchema.safeParse({senderName: "Gexep", subject: "", text: "正文"}).success, false);
        assert.equal(sendEmailInputSchema.safeParse({senderName: "Gexep", subject: "主题", text: "  "}).success, false);
    });

    it("拒绝空的发件人显示名称", () => {
        assert.equal(sendEmailInputSchema.safeParse({
            senderName: "  ",
            subject: "主题",
            text: "正文",
        }).success, false);
    });
});

describe("sendEmail()", () => {
    it("始终发送到工具中配置的固定邮箱", async () => {
        let receivedOptions: unknown;
        let receivedMessage: unknown;
        let closed = false;

        const dependencies: SendEmailDependencies = {
            config: validConfig,
            createTransport: (options) => {
                receivedOptions = options;
                return {
                    async sendMail(message) {
                        receivedMessage = message;
                        return {messageId: "message-123"};
                    },
                    close() {
                        closed = true;
                    },
                };
            },
        };

        const result = await sendEmail({
            senderName: "Gexep",
            subject: "测试主题",
            text: "测试正文",
        }, dependencies);

        assert.deepEqual(receivedOptions, {
            host: "smtp.example.com",
            port: 465,
            secure: true,
            auth: {
                user: "sender@example.com",
                pass: "app-password",
            },
        });
        assert.deepEqual(receivedMessage, {
            from: {
                name: "Gexep",
                address: "sender@example.com",
            },
            to: "owner@example.com",
            subject: "测试主题",
            text: "测试正文",
        });
        assert.equal(result, "邮件已发送到配置的收件邮箱。messageId: message-123");
        assert.equal(closed, true);
    });

    it("配置无效时不创建 SMTP transport", async () => {
        let transportCreated = false;
        const result = await sendEmail({senderName: "Gexep", subject: "主题", text: "正文"}, {
            config: {} as EmailConfig,
            createTransport: () => {
                transportCreated = true;
                throw new Error("不应创建 transport");
            },
        });

        assert.match(result, /^发送邮件失败：SMTP 配置无效：/);
        assert.equal(transportCreated, false);
    });

    it("SMTP 发送失败时返回错误并关闭 transport", async () => {
        let closed = false;
        const result = await sendEmail({senderName: "Gexep", subject: "主题", text: "正文"}, {
            config: validConfig,
            createTransport: () => ({
                async sendMail() {
                    throw new Error("authentication failed");
                },
                close() {
                    closed = true;
                },
            }),
        });

        assert.equal(result, "发送邮件失败：authentication failed");
        assert.equal(closed, true);
    });

    it("SMTP transport 创建失败时返回错误而非抛异常", async () => {
        const result = await sendEmail({senderName: "Gexep", subject: "主题", text: "正文"}, {
            config: validConfig,
            createTransport: () => {
                throw new Error("invalid transport options");
            },
        });

        assert.equal(result, "发送邮件失败：invalid transport options");
    });
});
