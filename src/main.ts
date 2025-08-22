import config from '@/config';
import logger from '@/utils/logger';
import createBot from './bot';
import { ReminderScheduler } from '@/utils/scheduler';
import PrismaService from '@/utils/prisma';

async function main(): Promise<void> {
  logger.info('Starting Telegram Diary Bot...');
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Use webhook: ${config.USE_WEBHOOK}`);

  try {
    const bot = createBot();

    // Start reminder scheduler
    const scheduler = ReminderScheduler.getInstance(bot);
    scheduler.start();

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        scheduler.stop();
        await bot.stop();
        await PrismaService.disconnect();
        logger.info('Bot stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Start bot
    if (config.USE_WEBHOOK) {
      if (!config.WEBHOOK_BASE_URL || !config.BOT_WEBHOOK_SECRET) {
        throw new Error('Webhook configuration is incomplete');
      }

      const webhookPath = `/webhook/${config.BOT_WEBHOOK_SECRET}`;
      const webhookUrl = `${config.WEBHOOK_BASE_URL}${webhookPath}`;

      // Set webhook
      await bot.api.setWebhook(webhookUrl);
      logger.info(`Webhook set to: ${webhookUrl}`);

      // Start webhook server
      await bot.start({
        drop_pending_updates: true,
      });

      logger.info(`Webhook server started on port ${config.APP_PORT}`);
    } else {
      // Start polling
      await bot.start();
      logger.info('Bot started in polling mode');
    }

  } catch (error) {
    logger.error('Failed to start bot:', error);
    await PrismaService.disconnect();
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});