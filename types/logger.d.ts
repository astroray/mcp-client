import 'winston';

declare module 'winston' {
    interface Logger {
        error(message: string, meta?: any): Logger;
        warn(message: string, meta?: any): Logger;
        info(message: string, meta?: any): Logger;
        debug(message: string, meta?: any): Logger;
        success(message: string, meta?: any): Logger;
        network(message: string, meta?: any): Logger;
        tool(message: string, meta?: any): Logger;
        data(message: string, meta?: any): Logger;
    }

    interface LoggerOptions {
        levels: {
            error: number;
            warn: number;
            info: number;
            debug: number;
            success: number;
            network: number;
            tool: number;
            data: number;
        };
    }
} 