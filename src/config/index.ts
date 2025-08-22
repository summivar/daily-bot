import { validateEnv, validateWebhookConfig, type Config } from './schema';

export const config: Config = validateEnv(process.env);

// Validate webhook configuration if webhooks are enabled
validateWebhookConfig(config);

export * from './schema';
export default config;