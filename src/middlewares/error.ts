import type { Context, NextFunction } from 'grammy';
import { GrammyError, HttpError } from 'grammy';
import logger from '@/utils/logger.js';

export function errorMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    try {
      await next();
    } catch (error) {
      logger.error('Unhandled error in bot:', error);

      let errorMessage = 'Произошла неожиданная ошибка. Попробуйте позже.';

      if (error instanceof GrammyError) {
        logger.error('Grammy error:', error.description);
        
        if (error.error_code === 429) {
          errorMessage = 'Слишком много запросов. Подождите немного.';
        } else if (error.error_code === 403) {
          logger.warn(`Bot blocked by user ${ctx.from?.id}`);
          return; // Don't send message if bot is blocked
        }
      } else if (error instanceof HttpError) {
        logger.error('HTTP error:', error.message);
        errorMessage = 'Проблемы с сетью. Попробуйте позже.';
      }

      try {
        await ctx.reply(errorMessage, {
          reply_parameters: ctx.message?.message_id ? { message_id: ctx.message.message_id } : undefined,
        });
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
      }
    }
  };
}

export default errorMiddleware;