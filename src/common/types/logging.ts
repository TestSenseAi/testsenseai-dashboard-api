export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    requestId?: string;
    orgId?: string;
    userId?: string;
    [key: string]: any;
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
    error?: Error;
}

export interface Logger {
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
}
