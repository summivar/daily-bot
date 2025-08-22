import type { Context, NextFunction } from 'grammy';
import logger from '@/utils/logger.js';

export function loggingMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const start = Date.now();
    
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const messageText = ctx.message?.text || ctx.callbackQuery?.data;
    const updateType = ctx.update.message ? 'message' : 
                      ctx.update.callback_query ? 'callback_query' :
                      ctx.update.inline_query ? 'inline_query' : 'unknown';

    logger.info(`[${updateType}] User ${userId}${username ? ` (@${username})` : ''}: ${messageText || 'no text'}`);

    try {
      await next();
      const duration = Date.now() - start;
      logger.debug(`Request processed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`Request failed after ${duration}ms:`, error);
      throw error;
    }
  };
}

export default loggingMiddleware;