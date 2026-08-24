import pino, {type Level} from 'pino';
import {ContentLevel} from "../generated/prisma/enums.ts";
import {prisma} from "./database/prisma-client.ts";

export async function logAndInsertDataToDB(content: string, logLevel: Level, sessionId: number) {
    let contentLevel: ContentLevel = "info";
    if (logLevel === "info") {
        logger.info(content);
        contentLevel = ContentLevel.info;
    } else if (logLevel === "warn") {
        logger.warn(content);
        contentLevel = ContentLevel.warn;
    }

    await prisma.log.create({data: {
            content: content,
            content_level: contentLevel,
            session_id: sessionId,
        }});
}

export const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});