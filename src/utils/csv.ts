import * as csvWriter from 'csv-writer';
import type { Entry } from '@prisma';
import { DateUtils } from './date';

export interface CsvRow {
  date: string;
  text: string;
  rating: string;
  created_at: string;
}

export interface ExportEntry extends Entry {
  user: { timezone?: string };
}

export class CsvExporter {
  static async generateCsv(entries: ExportEntry[]): Promise<string> {
    const records: CsvRow[] = entries.map(entry => ({
      date: DateUtils.formatDate(entry.entryDate, entry.user.timezone || 'UTC'),
      text: entry.text.replace(/"/g, '""'),
      rating: entry.rating?.toString() || '',
      created_at: DateUtils.formatDateTime(entry.createdAt, entry.user.timezone || 'UTC'),
    }));

    const stringifier = csvWriter.createObjectCsvStringifier({
      header: [
        { id: 'date', title: 'Дата' },
        { id: 'text', title: 'Текст' },
        { id: 'rating', title: 'Оценка' },
        { id: 'created_at', title: 'Создано' },
      ],
    });

    return stringifier.getHeaderString() + stringifier.stringifyRecords(records);
  }

  static generateJson(entries: ExportEntry[]): string {
    const records = entries.map(entry => ({
      date: DateUtils.formatDate(entry.entryDate, entry.user.timezone || 'UTC'),
      text: entry.text,
      rating: entry.rating,
      created_at: DateUtils.formatDateTime(entry.createdAt, entry.user.timezone || 'UTC'),
      updated_at: DateUtils.formatDateTime(entry.updatedAt, entry.user.timezone || 'UTC'),
    }));

    return JSON.stringify(records, null, 2);
  }

  static generateFileName(format: 'csv' | 'json', year?: number): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const yearSuffix = year ? `_${year}` : '';
    
    return `diary_export${yearSuffix}_${timestamp}.${format}`;
  }
}

export default CsvExporter;