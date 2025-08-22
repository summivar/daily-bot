import type { EntryWithUser, DiaryStats, PaginatedEntries, MonthlyStats } from './types';
import { getRatingCategory, RatingCategory } from './types';
import { DateUtils } from '@/utils/date';
import { prisma } from '@/utils/prisma';

export class DiaryQueries {
  static async createOrUpdateEntry(
    userId: number,
    date: Date,
    text: string,
    rating?: number
  ): Promise<EntryWithUser> {
    const entry = await prisma.entry.upsert({
      where: {
        userId_entryDate: {
          userId,
          entryDate: date,
        },
      },
      update: {
        text,
        rating: rating ?? null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        entryDate: date,
        text,
        rating: rating ?? null,
      },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
      },
    });

    return entry;
  }

  static async getEntryByDate(userId: number, date: Date): Promise<EntryWithUser | null> {
    const entry = await prisma.entry.findUnique({
      where: {
        userId_entryDate: {
          userId,
          entryDate: date,
        },
      },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
      },
    });

    return entry;
  }

  static async getEntriesByMonth(
    userId: number,
    year: number,
    month: number,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedEntries> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const timezone = user.settings?.timezone || 'UTC';
    const { start, end } = DateUtils.getMonthRange(year, month, timezone);

    const skip = (page - 1) * limit;

    const [entries, totalCount] = await Promise.all([
      prisma.entry.findMany({
        where: {
          userId,
          entryDate: {
            gte: start,
            lte: end,
          },
        },
        include: {
          user: {
            include: {
              settings: true,
            },
          },
        },
        orderBy: {
          entryDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.entry.count({
        where: {
          userId,
          entryDate: {
            gte: start,
            lte: end,
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      entries,
      totalCount,
      currentPage: page,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  static async getEntriesByYear(userId: number, year: number): Promise<EntryWithUser[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const timezone = user.settings?.timezone || 'UTC';
    const { start, end } = DateUtils.getYearRange(year, timezone);

    const entries = await prisma.entry.findMany({
      where: {
        userId,
        entryDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
      },
      orderBy: {
        entryDate: 'desc',
      },
    });

    return entries;
  }

  static async getStatsForYear(userId: number, year: number): Promise<DiaryStats> {
    const entries = await this.getEntriesByYear(userId, year);
    
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        averageRating: null,
        goodDays: 0,
        averageDays: 0,
        badDays: 0,
        unratedDays: 0,
      };
    }

    const ratedEntries = entries.filter(e => e.rating !== null);
    const averageRating = ratedEntries.length > 0 
      ? ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length
      : null;

    const categoryCounts = entries.reduce(
      (acc, entry) => {
        const category = getRatingCategory(entry.rating);
        acc[category]++;
        return acc;
      },
      {
        [RatingCategory.GOOD]: 0,
        [RatingCategory.AVERAGE]: 0,
        [RatingCategory.BAD]: 0,
        [RatingCategory.UNRATED]: 0,
      }
    );

    // Generate monthly breakdown
    const monthlyBreakdown = await this.getMonthlyStatsForYear(userId, year);

    return {
      totalEntries: entries.length,
      averageRating,
      goodDays: categoryCounts[RatingCategory.GOOD],
      averageDays: categoryCounts[RatingCategory.AVERAGE],
      badDays: categoryCounts[RatingCategory.BAD],
      unratedDays: categoryCounts[RatingCategory.UNRATED],
      monthlyBreakdown,
    };
  }

  private static async getMonthlyStatsForYear(userId: number, year: number): Promise<MonthlyStats[]> {
    const monthlyStats: MonthlyStats[] = [];

    for (let month = 1; month <= 12; month++) {
      const entries = await this.getEntriesByMonth(userId, year, month, 1, 1000);
      
      if (entries.totalCount > 0) {
        const ratedEntries = entries.entries.filter(e => e.rating !== null);
        const averageRating = ratedEntries.length > 0
          ? ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length
          : null;

        monthlyStats.push({
          month,
          year,
          entries: entries.totalCount,
          averageRating,
        });
      }
    }

    return monthlyStats;
  }

  static async hasEntryForDate(userId: number, date: Date): Promise<boolean> {
    const count = await prisma.entry.count({
      where: {
        userId,
        entryDate: date,
      },
    });

    return count > 0;
  }

  static async getUsersWithoutTodayEntry(): Promise<Array<{ id: number; tgid: bigint; settings: { timezone: string; reminderHour: number; reminderMinute: number } | null }>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: {
        settings: {
          remindersEnabled: true,
        },
        entries: {
          none: {
            entryDate: today,
          },
        },
      },
      select: {
        id: true,
        tgid: true,
        settings: {
          select: {
            timezone: true,
            reminderHour: true,
            reminderMinute: true,
          },
        },
      },
    });

    return users.filter(user => user.settings !== null) as Array<{
      id: number;
      tgid: bigint;
      settings: { timezone: string; reminderHour: number; reminderMinute: number };
    }>;
  }
}

export default DiaryQueries;