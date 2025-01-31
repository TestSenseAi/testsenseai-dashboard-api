export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    auth: {
        issuer: process.env.AUTH_ISSUER || 'https://auth.example.com',
        audience: process.env.AUTH_AUDIENCE || 'api://default',
        tokenExpiration: parseInt(process.env.AUTH_TOKEN_EXPIRATION || '3600', 10),
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: {
            short: parseInt(process.env.REDIS_TTL_SHORT || '300', 10),
            medium: parseInt(process.env.REDIS_TTL_MEDIUM || '3600', 10),
            long: parseInt(process.env.REDIS_TTL_LONG || '86400', 10),
        },
    },

    rateLimit: {
        window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        pretty: process.env.LOG_PRETTY === 'true',
    },

    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    },

    coreService: {
        url: process.env.CORE_SERVICE_URL || 'http://localhost:4000',
        apiKey: process.env.CORE_SERVICE_API_KEY || '',
        timeout: parseInt(process.env.CORE_SERVICE_TIMEOUT || '30000', 10),
    },
} as const;
