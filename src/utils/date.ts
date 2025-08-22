import { parseISO, startOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'UTC';

export interface DateRange {
  start: Date;
  end: Date;
}

export class DateUtils {
  static normalizeDate(date: string | Date, timezone: string = DEFAULT_TIMEZONE): Date {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return startOfDay(toZonedTime(parsedDate, timezone));
  }

  static getCurrentDate(timezone: string = DEFAULT_TIMEZONE): Date {
    return this.normalizeDate(new Date(), timezone);
  }

  static formatDate(date: Date, timezone: string = DEFAULT_TIMEZONE, pattern: string = 'yyyy-MM-dd'): string {
    return formatTz(date, pattern, { timeZone: timezone });
  }

  static formatDateTime(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
    return formatTz(date, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone });
  }

  static toUtc(date: Date, _timezone: string): Date {
    // Convert zoned time to UTC
    const utcTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return utcTime;
  }

  static fromUtc(date: Date, timezone: string): Date {
    return toZonedTime(date, timezone);
  }

  static getDateForDatabase(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
    const normalizedDate = this.normalizeDate(date, timezone);
    return this.toUtc(normalizedDate, timezone);
  }

  static getMonthRange(year: number, month: number, timezone: string = DEFAULT_TIMEZONE): DateRange {
    const startDate = new Date(year, month - 1, 1);
    const start = this.toUtc(startOfMonth(startDate), timezone);
    const end = this.toUtc(endOfMonth(startDate), timezone);
    
    return { start, end };
  }

  static getYearRange(year: number, timezone: string = DEFAULT_TIMEZONE): DateRange {
    const startDate = new Date(year, 0, 1);
    const start = this.toUtc(startOfYear(startDate), timezone);
    const end = this.toUtc(endOfYear(startDate), timezone);
    
    return { start, end };
  }

  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  static getUserTime(timezone: string = DEFAULT_TIMEZONE): { hour: number; minute: number } {
    const now = new Date();
    const zonedTime = this.fromUtc(now, timezone);
    
    return {
      hour: zonedTime.getHours(),
      minute: zonedTime.getMinutes(),
    };
  }

  static shouldSendReminder(
    reminderHour: number,
    reminderMinute: number,
    timezone: string = DEFAULT_TIMEZONE
  ): boolean {
    const { hour, minute } = this.getUserTime(timezone);
    return hour === reminderHour && minute === reminderMinute;
  }

  static parseMonthInput(input: string): { year: number; month: number } | null {
    const monthRegex = /^(\d{4})-(\d{1,2})$/;
    const match = input.match(monthRegex);
    
    if (!match) return null;
    
    const year = parseInt(match[1] || '0', 10);
    const month = parseInt(match[2] || '0', 10);
    
    if (year < 1970 || year > 2100 || month < 1 || month > 12) {
      return null;
    }
    
    return { year, month };
  }

  static parseYearInput(input: string): number | null {
    const yearRegex = /^(\d{4})$/;
    const match = input.match(yearRegex);
    
    if (!match) return null;
    
    const year = parseInt(match[1] || '0', 10);
    
    if (year < 1970 || year > 2100) {
      return null;
    }
    
    return year;
  }

  static formatRelativeDate(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
    const today = this.getCurrentDate(timezone);
    const targetDate = this.normalizeDate(date, timezone);
    
    const diffInDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Сегодня';
    if (diffInDays === -1) return 'Вчера';
    if (diffInDays === 1) return 'Завтра';
    if (diffInDays > 1 && diffInDays <= 7) return `Через ${diffInDays} дней`;
    if (diffInDays < -1 && diffInDays >= -7) return `${Math.abs(diffInDays)} дней назад`;
    
    return this.formatDate(targetDate, timezone, 'dd.MM.yyyy');
  }
}

export default DateUtils;