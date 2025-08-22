import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('8080'),
  
  // Telegram Bot Configuration
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'Telegram bot token is required'),
  USE_WEBHOOK: z.string().transform(val => val.toLowerCase() === 'true').default('false'),
  WEBHOOK_BASE_URL: z.string().url().optional(),
  BOT_WEBHOOK_SECRET: z.string().optional(),
  
  // Database Configuration
  DATABASE_URL: z.string().url('Database URL must be a valid URL'),
  
  // Application Defaults
  DEFAULT_TIMEZONE: z.string().default('UTC'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

export const validateEnv = (env: Record<string, string | undefined>): Config => {
  try {
    return configSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
};

// Webhook validation schema
export const webhookConfigSchema = z.object({
  USE_WEBHOOK: z.literal(true),
  WEBHOOK_BASE_URL: z.string().url('Webhook base URL is required when using webhooks'),
  BOT_WEBHOOK_SECRET: z.string().min(1, 'Webhook secret is required when using webhooks'),
});

export const validateWebhookConfig = (config: Config): void => {
  if (config.USE_WEBHOOK) {
    try {
      webhookConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n');
        
        throw new Error(`Webhook configuration validation failed:\n${errorMessages}`);
      }
      throw error;
    }
  }
};