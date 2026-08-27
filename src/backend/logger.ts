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