/**
 * Structured Logger for CDM-17 Frontend
 *
 * MED-2: Replaces console.log with environment-aware logging
 *
 * Features:
 * - Disabled in production for debug/info levels
 * - Namespaced logs for easy filtering
 * - No sensitive data logging (user content, tokens, etc.)
 *
 * Story 1.4: Real-time Collaboration Engine
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    namespace: string;
    enabled?: boolean;
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Create a namespaced logger instance
 */
export function createLogger(namespace: string): Logger {
    return new Logger({ namespace });
}

class Logger {
    private namespace: string;
    private enabled: boolean;

    constructor(config: LoggerConfig) {
        this.namespace = config.namespace;
        this.enabled = config.enabled ?? true;
    }

    /**
     * Debug level - development only
     */
    debug(message: string, data?: Record<string, unknown>): void {
        if (isProduction || !this.enabled) return;
        this.log('debug', message, data);
    }

    /**
     * Info level - development only
     */
    info(message: string, data?: Record<string, unknown>): void {
        if (isProduction || !this.enabled) return;
        this.log('info', message, data);
    }

    /**
     * Warn level - always enabled
     */
    warn(message: string, data?: Record<string, unknown>): void {
        if (!this.enabled) return;
        this.log('warn', message, data);
    }

    /**
     * Error level - always enabled
     */
    error(message: string, data?: Record<string, unknown>): void {
        if (!this.enabled) return;
        this.log('error', message, data);
    }

    private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${this.namespace}]`;

        const logFn = level === 'error' ? console.error
            : level === 'warn' ? console.warn
            : console.log;

        if (data) {
            logFn(`${prefix} ${message}`, data);
        } else {
            logFn(`${prefix} ${message}`);
        }
    }
}

// Pre-configured loggers for collaboration features
export const collabLogger = createLogger('Collab');
export const syncLogger = createLogger('GraphSync');
export const graphLogger = createLogger('Graph');
