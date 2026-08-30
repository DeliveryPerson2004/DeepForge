import pino, {type Level} from 'pino';

export type Log = {
    content: string,
    level: Level,
    createdAt: Date,
};

export const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

export function printLogAndReturnNewLogs(logs: Log[], log: string, logLevel: Level){
    const logRecord: Log = {
        content: log,
        level: logLevel,
        createdAt: new Date(),
    }

    logs.push(logRecord);

    if(logLevel === "info")
        logger.info(log);

    return logs;
}