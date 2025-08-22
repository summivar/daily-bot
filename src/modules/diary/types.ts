import type { Entry, User, Settings } from '@prisma';

export interface EntryWithUser extends Entry {
  user: User & { settings?: Settings | null };
}

export interface DiaryStats {
  totalEntries: number;
  averageRating: number | null;
  goodDays: number; // rating 7-10
  averageDays: number; // rating 4-6  
  badDays: number; // rating 1-3
  unratedDays: number;
  monthlyBreakdown?: MonthlyStats[];
}

export interface MonthlyStats {
  month: number;
  year: number;
  entries: number;
  averageRating: number | null;
}

export interface PaginatedEntries {
  entries: EntryWithUser[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export enum RatingCategory {
  BAD = 'bad',
  AVERAGE = 'average', 
  GOOD = 'good',
  UNRATED = 'unrated'
}

export function getRatingCategory(rating: number | null): RatingCategory {
  if (rating === null) return RatingCategory.UNRATED;
  if (rating <= 3) return RatingCategory.BAD;
  if (rating <= 6) return RatingCategory.AVERAGE;
  return RatingCategory.GOOD;
}

export function getRatingEmoji(rating: number | null): string {
  const category = getRatingCategory(rating);
  
  switch (category) {
    case RatingCategory.BAD: return '😢';
    case RatingCategory.AVERAGE: return '😐';
    case RatingCategory.GOOD: return '😊';
    case RatingCategory.UNRATED: return '📝';
  }
}

export function formatRatingStats(stats: DiaryStats): string {
  const total = stats.totalEntries;
  
  if (total === 0) {
    return 'Записей пока нет';
  }

  const lines = [
    `📊 Статистика за период:`,
    ``,
    `📝 Всего записей: ${total}`,
  ];

  if (stats.averageRating !== null) {
    lines.push(`⭐ Средняя оценка: ${stats.averageRating.toFixed(1)}`);
  }

  lines.push(
    ``,
    `😊 Хорошие дни (7-10): ${stats.goodDays} (${((stats.goodDays / total) * 100).toFixed(1)}%)`,
    `😐 Средние дни (4-6): ${stats.averageDays} (${((stats.averageDays / total) * 100).toFixed(1)}%)`,
    `😢 Плохие дни (1-3): ${stats.badDays} (${((stats.badDays / total) * 100).toFixed(1)}%)`,
  );

  if (stats.unratedDays > 0) {
    lines.push(`📝 Без оценки: ${stats.unratedDays} (${((stats.unratedDays / total) * 100).toFixed(1)}%)`);
  }

  return lines.join('\n');
}