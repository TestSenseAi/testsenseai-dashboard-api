type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
    organizationId?: string;
    userId?: string;
    correlationId?: string;
    [key: string]: unknown;
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
    error?: Error;
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = 'info';

    constructor() {
        // Set log level from environment variable
        const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
        if (envLogLevel && ['error', 'warn', 'info', 'debug'].includes(envLogLevel)) {
            this.logLevel = envLogLevel;
        }
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: Record<LogLevel, number> = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
        };
        return levels[level] <= levels[this.logLevel];
    }

    private formatLog(entry: LogEntry): string {
        return JSON.stringify({
            ...entry,
            error: entry.error
                ? {
                      name: entry.error.name,
                      message: entry.error.message,
                      stack: entry.error.stack,
                  }
                : undefined,
        });
    }

    public error(message: string, context?: LogContext, error?: Error): void {
        if (this.shouldLog('error')) {
            console.error(
                this.formatLog({
                    level: 'error',
                    message,
                    timestamp: new Date().toISOString(),
                    context,
                    error,
                })
            );
        }
    }

    public warn(message: string, context?: LogContext): void {
        if (this.shouldLog('warn')) {
            console.warn(
                this.formatLog({
                    level: 'warn',
                    message,
                    timestamp: new Date().toISOString(),
                    context,
                })
            );
        }
    }

    public info(message: string, context?: LogContext): void {
        if (this.shouldLog('info')) {
            console.info(
                this.formatLog({
                    level: 'info',
                    message,
                    timestamp: new Date().toISOString(),
                    context,
                })
            );
        }
    }

    public debug(message: string, context?: LogContext): void {
        if (this.shouldLog('debug')) {
            console.debug(
                this.formatLog({
                    level: 'debug',
                    message,
                    timestamp: new Date().toISOString(),
                    context,
                })
            );
        }
    }
}

export const logger = Logger.getInstance();
