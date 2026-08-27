import pino, {type Level} from 'pino';

export type Log = {
    content: string,
    level: Level,
    createdAt: Date,
};

// export async function printLogAndSaveToDB(
//     content: string,
//     logLevel: Level,
//     sessionId: number,
//     turn: number
// ) {
//     let contentLevel: ContentLevel = "info";
//     if (logLevel === "info") {
//         logger.info(content);
//         contentLevel = ContentLevel.info;
//     } else if (logLevel === "warn") {
//         logger.warn(content);
//         contentLevel = ContentLevel.warn;
//     }
//
//     await prisma.log.create({
//         data: {
//             content: content,
//             content_level: contentLevel,
//             session_id: sessionId,
//             turn: turn,
//         }});
// }

export const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});