// Configuration Types
export interface Config {
    env: 'development' | 'staging' | 'production';
    coreService: {
        url: string;
        timeout: number;
        apiKey: string;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        format: 'json' | 'text';
    };
    security: {
        jwtSecret: string;
        tokenExpiration: number;
    };
}

// Feature Flag Types
export interface FeatureFlags {
    enableMetrics: boolean;
    enableNotifications: boolean;
    enableDetailedLogging: boolean;
    [key: string]: boolean;
}
