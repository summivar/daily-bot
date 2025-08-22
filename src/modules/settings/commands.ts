import { Composer } from 'grammy';
import type { BotContext } from '@/types/bot';
import { SettingsQueries } from './queries';
import { CommandParser } from '@/utils/parsing';
import { DateUtils } from '@/utils/date';
import logger from '@/utils/logger';

const composer = new Composer<BotContext>();

composer.command('settings', async (ctx) => {
  try {
    if (!ctx.user?.settings) {
      await ctx.reply('❌ Настройки не найдены. Попробуйте перезапустить бота командой /start');
      return;
    }

    const settings = ctx.user.settings;
    const timeStr = `${settings.reminderHour.toString().padStart(2, '0')}:${settings.reminderMinute.toString().padStart(2, '0')}`;
    
    const message = [
      '⚙️ Текущие настройки:',
      '',
      `🔔 Напоминания: ${settings.remindersEnabled ? '✅ Включены' : '❌ Выключены'}`,
      `⏰ Время напоминания: ${timeStr}`,
      `🌍 Часовой пояс: ${settings.timezone}`,
      '',
      'Команды для изменения:',
      '• /reminder_on - включить напоминания',
      '• /reminder_off - выключить напоминания',
      '• /reminder_time HH:MM - изменить время',
      '• /timezone <IANA> - изменить часовой пояс',
    ].join('\n');

    await ctx.reply(message);

  } catch (error) {
    logger.error('Error in settings command:', error);
    await ctx.reply('❌ Не удалось получить настройки. Попробуйте позже.');
  }
});

composer.command('reminder_on', async (ctx) => {
  try {
    if (!ctx.user) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }

    await SettingsQueries.updateReminderSettings(ctx.user.id, true);
    await ctx.reply('✅ Напоминания включены');

  } catch (error) {
    logger.error('Error enabling reminders:', error);
    await ctx.reply('❌ Не удалось включить напоминания. Попробуйте позже.');
  }
});

composer.command('reminder_off', async (ctx) => {
  try {
    if (!ctx.user) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }

    await SettingsQueries.updateReminderSettings(ctx.user.id, false);
    await ctx.reply('❌ Напоминания выключены');

  } catch (error) {
    logger.error('Error disabling reminders:', error);
    await ctx.reply('❌ Не удалось выключить напоминания. Попробуйте позже.');
  }
});

composer.command('reminder_time', async (ctx) => {
  try {
    const input = ctx.match;
    
    if (!input || typeof input !== 'string') {
      await ctx.reply(
        '⏰ Установка времени напоминания\n\n' +
        'Формат: /reminder_time HH:MM\n\n' +
        'Примеры:\n' +
        '• /reminder_time 21:00\n' +
        '• /reminder_time 09:30'
      );
      return;
    }

    if (!ctx.user) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }

    const parsed = CommandParser.parseReminderTime(input.trim());
    if (!parsed) {
      await ctx.reply('❌ Неверный формат времени. Используйте: HH:MM (например, 21:00)');
      return;
    }

    await SettingsQueries.updateReminderTime(ctx.user.id, parsed.hour, parsed.minute);
    
    const timeStr = `${parsed.hour.toString().padStart(2, '0')}:${parsed.minute.toString().padStart(2, '0')}`;
    await ctx.reply(`⏰ Время напоминания установлено: ${timeStr}`);

  } catch (error) {
    logger.error('Error setting reminder time:', error);
    await ctx.reply('❌ Не удалось установить время. Попробуйте позже.');
  }
});

composer.command('timezone', async (ctx) => {
  try {
    const input = ctx.match;
    
    if (!input || typeof input !== 'string') {
      await ctx.reply(
        '🌍 Установка часового пояса\n\n' +
        'Формат: /timezone <IANA>\n\n' +
        'Примеры:\n' +
        '• /timezone Europe/Warsaw\n' +
        '• /timezone America/New_York\n' +
        '• /timezone Asia/Tokyo\n' +
        '• /timezone UTC'
      );
      return;
    }

    if (!ctx.user) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }

    const timezone = input.trim();
    
    if (!DateUtils.isValidTimezone(timezone)) {
      await ctx.reply('❌ Неверный часовой пояс. Используйте IANA формат (например, Europe/Warsaw)');
      return;
    }

    await SettingsQueries.updateTimezone(ctx.user.id, timezone);
    await ctx.reply(`🌍 Часовой пояс установлен: ${timezone}`);

  } catch (error) {
    logger.error('Error setting timezone:', error);
    await ctx.reply('❌ Не удалось установить часовой пояс. Попробуйте позже.');
  }
});

export default composer;