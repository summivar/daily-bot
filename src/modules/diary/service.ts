import type { BotContext } from '@/types/bot';
import { DiaryQueries } from './queries';
import { DateUtils } from '@/utils/date';
import { CommandParser } from '@/utils/parsing';
import { CsvExporter } from '@/utils/csv';
import type { EntryWithUser, DiaryStats, PaginatedEntries } from './types';
import { formatRatingStats, getRatingEmoji } from './types';
import logger from '@/utils/logger';

export class DiaryService {
  static async addEntry(
    ctx: BotContext,
    input: string
  ): Promise<{ entry: EntryWithUser; isUpdate: boolean }> {
    if (!ctx.user) {
      throw new Error('User not found');
    }

    const parsed = CommandParser.parseAddCommand(input);
    if (!parsed) {
      throw new Error('Неверный формат команды. Используйте: /add [оценка] текст');
    }

    const timezone = ctx.user.settings?.timezone || 'UTC';
    const today = DateUtils.getDateForDatabase(new Date(), timezone);

    // Check if entry already exists
    const existingEntry = await DiaryQueries.getEntryByDate(ctx.user.id, today);
    const isUpdate = existingEntry !== null;

    const entry = await DiaryQueries.createOrUpdateEntry(
      ctx.user.id,
      today,
      parsed.text,
      parsed.rating
    );

    logger.info(`${isUpdate ? 'Updated' : 'Created'} entry for user ${ctx.user.tgid}`);

    return { entry, isUpdate };
  }

  static async getTodayEntry(ctx: BotContext): Promise<EntryWithUser | null> {
    if (!ctx.user) {
      throw new Error('User not found');
    }

    const timezone = ctx.user.settings?.timezone || 'UTC';
    const today = DateUtils.getDateForDatabase(new Date(), timezone);

    return await DiaryQueries.getEntryByDate(ctx.user.id, today);
  }

  static async getEntriesForMonth(
    ctx: BotContext,
    monthInput?: string,
    page: number = 1
  ): Promise<PaginatedEntries> {
    if (!ctx.user) {
      throw new Error('User not found');
    }

    const timezone = ctx.user.settings?.timezone || 'UTC';
    const now = DateUtils.getCurrentDate(timezone);
    
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (monthInput) {
      const parsed = DateUtils.parseMonthInput(monthInput);
      if (!parsed) {
        throw new Error('Неверный формат месяца. Используйте: YYYY-MM');
      }
      year = parsed.year;
      month = parsed.month;
    }

    return await DiaryQueries.getEntriesByMonth(ctx.user.id, year, month, page);
  }

  static async getStatsForYear(ctx: BotContext, yearInput?: string): Promise<DiaryStats> {
    if (!ctx.user) {
      throw new Error('User not found');
    }

    const timezone = ctx.user.settings?.timezone || 'UTC';
    const currentYear = DateUtils.getCurrentDate(timezone).getFullYear();
    
    let year = currentYear;

    if (yearInput) {
      const parsed = DateUtils.parseYearInput(yearInput);
      if (!parsed) {
        throw new Error('Неверный формат года. Используйте: YYYY');
      }
      year = parsed;
    }

    return await DiaryQueries.getStatsForYear(ctx.user.id, year);
  }

  static async exportEntries(
    ctx: BotContext,
    format: 'csv' | 'json',
    yearInput?: string
  ): Promise<{ content: string; filename: string }> {
    if (!ctx.user) {
      throw new Error('User not found');
    }

    const timezone = ctx.user.settings?.timezone || 'UTC';
    const currentYear = DateUtils.getCurrentDate(timezone).getFullYear();
    
    let year = currentYear;

    if (yearInput) {
      const parsed = DateUtils.parseYearInput(yearInput);
      if (!parsed) {
        throw new Error('Неверный формат года. Используйте: YYYY');
      }
      year = parsed;
    }

    const entries = await DiaryQueries.getEntriesByYear(ctx.user.id, year);

    if (entries.length === 0) {
      throw new Error(`Записей за ${year} год не найдено`);
    }

    // Transform entries to ExportEntry format
    const exportEntries = entries.map(entry => ({
      ...entry,
      user: { timezone: entry.user.settings?.timezone }
    }));

    let content: string;
    
    if (format === 'csv') {
      content = await CsvExporter.generateCsv(exportEntries);
    } else {
      content = CsvExporter.generateJson(exportEntries);
    }

    const filename = CsvExporter.generateFileName(format, year);

    logger.info(`Exported ${entries.length} entries for user ${ctx.user.tgid} in ${format} format`);

    return { content, filename };
  }

  static formatEntryMessage(entry: EntryWithUser): string {
    const timezone = entry.user.settings?.timezone || 'UTC';
    const dateStr = DateUtils.formatRelativeDate(entry.entryDate, timezone);
    const emoji = getRatingEmoji(entry.rating);
    
    let message = `${emoji} ${dateStr}`;
    
    if (entry.rating !== null) {
      message += ` (${entry.rating}/10)`;
    }
    
    message += `\n\n${entry.text}`;
    
    const createdAt = DateUtils.formatDateTime(entry.createdAt, timezone);
    message += `\n\n📅 Создано: ${createdAt}`;
    
    if (entry.createdAt.getTime() !== entry.updatedAt.getTime()) {
      const updatedAt = DateUtils.formatDateTime(entry.updatedAt, timezone);
      message += `\n✏️ Изменено: ${updatedAt}`;
    }
    
    return message;
  }

  static formatEntriesList(entries: PaginatedEntries): string {
    if (entries.totalCount === 0) {
      return 'Записей за указанный период не найдено.';
    }

    const lines = [
      `📋 Записи (${entries.currentPage}/${entries.totalPages}, всего: ${entries.totalCount})`,
      '',
    ];

    for (const entry of entries.entries) {
      const timezone = entry.user.settings?.timezone || 'UTC';
      const dateStr = DateUtils.formatDate(entry.entryDate, timezone, 'dd.MM');
      const emoji = getRatingEmoji(entry.rating);
      const rating = entry.rating ? ` (${entry.rating})` : '';
      const preview = entry.text.length > 50 ? `${entry.text.slice(0, 50)}...` : entry.text;
      
      lines.push(`${emoji} ${dateStr}${rating}: ${preview}`);
    }

    if (entries.hasNext || entries.hasPrevious) {
      lines.push('');
      lines.push('Используйте кнопки для навигации ⬇️');
    }

    return lines.join('\n');
  }

  static formatStatsMessage(stats: DiaryStats, year: number): string {
    const title = `📊 Статистика за ${year} год`;
    const statsText = formatRatingStats(stats);
    
    return `${title}\n\n${statsText}`;
  }
}

export default DiaryService;