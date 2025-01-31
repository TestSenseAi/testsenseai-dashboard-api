import { z } from 'zod';

// Configuration schema
const ConfigSchema = z.object({
  env: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.coerce.number().min(1).max(65535).default(3000),

  auth: z.object({
    issuer: z.string().url(),
    audience: z.string(),
    tokenExpiration: z.number().min(300).default(3600), // 1 hour in seconds
  }),

  redis: z.object({
    url: z.string().url().default('redis://localhost:6379'),
    ttl: z.object({
      short: z.number().min(1).default(300), // 5 minutes
      medium: z.number().min(1).default(3600), // 1 hour
      long: z.number().min(1).default(86400), // 1 day
    }),
  }),

  rateLimit: z.object({
    window: z.number().min(1000).default(60000), // 1 minute in milliseconds
    max: z.number().min(1).default(100),
  }),

  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }),

  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization']),
  }),

  openai: z.object({
    apiKey: z.string().optional(),
    defaultModel: z.enum(['gpt-4']).default('gpt-4'),
    defaultTemperature: z.number().min(0).max(1).default(0.7),
  }),
});

type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const config = {
    env: process.env.NODE_ENV,
    port: process.env.PORT,

    auth: {
      issuer: process.env.AUTH_ISSUER,
      audience: process.env.AUTH_AUDIENCE,
      tokenExpiration: process.env.AUTH_TOKEN_EXPIRATION,
    },

    redis: {
      url: process.env.REDIS_URL,
      ttl: {
        short: process.env.REDIS_TTL_SHORT,
        medium: process.env.REDIS_TTL_MEDIUM,
        long: process.env.REDIS_TTL_LONG,
      },
    },

    rateLimit: {
      window: process.env.RATE_LIMIT_WINDOW,
      max: process.env.RATE_LIMIT_MAX,
    },

    logging: {
      level: process.env.LOG_LEVEL,
      format: process.env.LOG_FORMAT,
    },

    cors: {
      origin: process.env.CORS_ORIGIN,
      methods: process.env.CORS_METHODS?.split(','),
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(','),
    },

    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      defaultModel: 'gpt-4' as const,
      defaultTemperature: 0.7,
    },
  };

  const result = ConfigSchema.safeParse(config);

  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

// Export singleton instance
export const config = loadConfig();
