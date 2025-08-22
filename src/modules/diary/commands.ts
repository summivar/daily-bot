import { Composer, InputFile } from 'grammy';
import type { BotContext } from '@/types/bot';
import { DiaryService } from './service';
import { CommandParser } from '@/utils/parsing';
import logger from '@/utils/logger';

const composer = new Composer<BotContext>();

// Add entry command
composer.command('add', async (ctx) => {
  try {
    const input = ctx.match;
    
    if (!input || typeof input !== 'string') {
      await ctx.reply(
        '📝 Добавление записи в дневник\n\n' +
        'Формат: /add [оценка] текст\n\n' +
        'Примеры:\n' +
        '• /add Хороший день на работе\n' +
        '• /add 8 Отличная встреча с друзьями\n\n' +
        'Оценка от 1 до 10 (необязательно)'
      );
      return;
    }

    const result = await DiaryService.addEntry(ctx, input);
    const entry = result.entry;
    const isUpdate = result.isUpdate;
    
    const statusText = isUpdate ? '✏️ Запись обновлена' : '✅ Запись добавлена';
    const formattedEntry = DiaryService.formatEntryMessage(entry);
    
    await ctx.reply(`${statusText}\n\n${formattedEntry}`);
    
  } catch (error) {
    logger.error('Error in add command:', error);
    
    if (error instanceof Error) {
      await ctx.reply(`❌ ${error.message}`);
    } else {
      await ctx.reply('❌ Не удалось добавить запись. Попробуйте позже.');
    }
  }
});

// Today's entry command
composer.command('today', async (ctx) => {
  try {
    const entry = await DiaryService.getTodayEntry(ctx);
    
    if (!entry) {
      await ctx.reply(
        '📝 Записи на сегодня пока нет.\n\n' +
        'Добавьте запись: /add [оценка] текст'
      );
      return;
    }
    
    const formattedEntry = DiaryService.formatEntryMessage(entry);
    await ctx.reply(`📅 Запись на сегодня:\n\n${formattedEntry}`);
    
  } catch (error) {
    logger.error('Error in today command:', error);
    await ctx.reply('❌ Не удалось получить запись. Попробуйте позже.');
  }
});

// List entries command
composer.command('list', async (ctx) => {
  try {
    const monthInput = ctx.match && typeof ctx.match === 'string' ? ctx.match.trim() : undefined;
    await showEntriesList(ctx, monthInput, 1);
    
  } catch (error) {
    logger.error('Error in list command:', error);
    
    if (error instanceof Error) {
      await ctx.reply(`❌ ${error.message}`);
    } else {
      await ctx.reply('❌ Не удалось получить список записей. Попробуйте позже.');
    }
  }
});

// Stats command
composer.command('stats', async (ctx) => {
  try {
    const yearInput = ctx.match && typeof ctx.match === 'string' ? ctx.match.trim() : undefined;
    
    const stats = await DiaryService.getStatsForYear(ctx, yearInput);
    const year = yearInput ? parseInt(yearInput) : new Date().getFullYear();
    
    const message = DiaryService.formatStatsMessage(stats, year);
    await ctx.reply(message);
    
  } catch (error) {
    logger.error('Error in stats command:', error);
    
    if (error instanceof Error) {
      await ctx.reply(`❌ ${error.message}`);
    } else {
      await ctx.reply('❌ Не удалось получить статистику. Попробуйте позже.');
    }
  }
});

// Export command
composer.command('export', async (ctx) => {
  try {
    const args = ctx.match && typeof ctx.match === 'string' ? ctx.match.trim().split(' ') : [];
    
    if (args.length === 0) {
      await ctx.reply(
        '📤 Экспорт записей\n\n' +
        'Формат: /export <format> [год]\n\n' +
        'Форматы: csv, json\n' +
        'Примеры:\n' +
        '• /export csv\n' +
        '• /export json 2023\n' +
        '• /export csv 2024'
      );
      return;
    }
    
    const format = CommandParser.parseExportFormat(args[0]);
    if (!format) {
      await ctx.reply('❌ Неверный формат. Используйте: csv или json');
      return;
    }
    
    const yearInput = args[1];
    
    await ctx.reply('⏳ Готовлю экспорт...');
    
    const result = await DiaryService.exportEntries(ctx, format, yearInput);
    
    // Send as document
    await ctx.replyWithDocument(
      new InputFile(Buffer.from(result.content, 'utf-8'), result.filename),
      {
        caption: `📤 Экспорт записей в формате ${format.toUpperCase()}`,
      }
    );
    
  } catch (error) {
    logger.error('Error in export command:', error);
    
    if (error instanceof Error) {
      await ctx.reply(`❌ ${error.message}`);
    } else {
      await ctx.reply('❌ Не удалось экспортировать записи. Попробуйте позже.');
    }
  }
});

// Helper function to show entries list with pagination
async function showEntriesList(ctx: BotContext, monthInput?: string, page: number = 1): Promise<void> {
  const entries = await DiaryService.getEntriesForMonth(ctx, monthInput, page);
  const message = DiaryService.formatEntriesList(entries);
  
  if (entries.totalPages > 1) {
    const keyboard = [];
    
    if (entries.hasPrevious) {
      keyboard.push({ text: '◀️ Назад', callback_data: `entries_prev_${page - 1}` });
    }
    
    if (entries.hasNext) {
      keyboard.push({ text: 'Вперед ▶️', callback_data: `entries_next_${page + 1}` });
    }
    
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [keyboard],
      },
    });
  } else {
    await ctx.reply(message);
  }
}

// Callback handlers for pagination
composer.callbackQuery(/^entries_(prev|next)_(\d+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  
  const page = parseInt(match[2] || '1');
  await ctx.answerCallbackQuery();
  
  try {
    await showEntriesList(ctx, undefined, page);
    await ctx.deleteMessage();
  } catch (error) {
    logger.error('Error in pagination callback:', error);
    await ctx.answerCallbackQuery('Ошибка при загрузке страницы');
  }
});

export default composer;