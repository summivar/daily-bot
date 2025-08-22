import { Bot, session } from 'grammy';
import type { BotContext, SessionData } from '@/types';
import config from '@/config';
import logger from '@/utils/logger';
import { loggingMiddleware } from '@/middlewares/logging';
import { errorMiddleware } from '@/middlewares/error';
import { SettingsQueries } from '@/modules/settings';
import { diaryCommands } from '@/modules/diary';
import { settingsCommands } from '@/modules/settings';

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.TELEGRAM_BOT_TOKEN);

  // Session middleware
  bot.use(session({
    initial: (): SessionData => ({}),
  }));

  // User middleware - load user from database
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      try {
        const user = await SettingsQueries.createOrUpdateUser(
          BigInt(ctx.from.id),
          ctx.from.username,
          ctx.from.first_name,
          ctx.from.last_name
        );
        
        ctx.user = user;
        ctx.session.user = user;
        ctx.session.timezone = user.settings?.timezone || 'UTC';
        
      } catch (error) {
        logger.error('Error loading user:', error);
      }
    }
    
    await next();
  });

  // Error handling middleware
  bot.use(errorMiddleware());

  // Logging middleware
  bot.use(loggingMiddleware());

  // Commands
  bot.command('start', async (ctx) => {
    const username = ctx.from?.first_name || 'Пользователь';
    
    const message = [
      `👋 Привет, ${username}!`,
      '',
      '📔 Это бот-дневник для ведения записей.',
      '',
      '🔹 Основные команды:',
      '• /add [оценка] текст - добавить запись',
      '• /today - посмотреть запись на сегодня',
      '• /list [YYYY-MM] - список записей за месяц',
      '• /stats [YYYY] - статистика за год',
      '• /export csv|json [YYYY] - экспорт записей',
      '',
      '⚙️ Настройки:',
      '• /settings - показать настройки',
      '• /reminder_on/off - напоминания',
      '• /reminder_time HH:MM - время напоминания',
      '• /timezone <IANA> - часовой пояс',
      '',
      '❓ /help - справка',
    ].join('\n');

    await ctx.reply(message);
  });

  bot.command('help', async (ctx) => {
    const message = [
      '📖 Справка по командам',
      '',
      '📝 Записи:',
      '• /add текст - добавить запись без оценки',
      '• /add 8 отличный день - запись с оценкой (1-10)',
      '• /today - запись на сегодня',
      '',
      '📋 Просмотр записей:',
      '• /list - записи за текущий месяц',
      '• /list 2024-01 - записи за январь 2024',
      '',
      '📊 Статистика:',
      '• /stats - статистика за текущий год',
      '• /stats 2023 - статистика за 2023 год',
      '',
      '📤 Экспорт:',
      '• /export csv - экспорт в CSV за текущий год',
      '• /export json 2023 - экспорт в JSON за 2023',
      '',
      '⚙️ Настройки:',
      '• /settings - текущие настройки',
      '• /reminder_on - включить напоминания',
      '• /reminder_off - выключить напоминания',
      '• /reminder_time 21:00 - время напоминания',
      '• /timezone Europe/Warsaw - часовой пояс',
      '',
      '💡 Оценки: 1-3 плохие дни, 4-6 средние, 7-10 хорошие',
    ].join('\n');

    await ctx.reply(message);
  });

  // Module commands
  bot.use(diaryCommands);
  bot.use(settingsCommands);

  // Unknown command handler
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    
    if (text.startsWith('/')) {
      await ctx.reply(
        '❓ Неизвестная команда.\n\n' +
        'Используйте /help для получения справки.'
      );
    }
  });

  return bot;
}

export default createBot;