import * as cron from 'node-cron';
import { Bot } from 'grammy';
import type { BotContext } from '@/types/bot';
import { DiaryQueries } from '@/modules/diary/queries';
import { DateUtils } from './date';
import logger from './logger';

export class ReminderScheduler {
  private static instance: ReminderScheduler;
  private bot: Bot<BotContext>;
  private task: cron.ScheduledTask | null = null;

  private constructor(bot: Bot<BotContext>) {
    this.bot = bot;
  }

  static getInstance(bot: Bot<BotContext>): ReminderScheduler {
    if (!ReminderScheduler.instance) {
      ReminderScheduler.instance = new ReminderScheduler(bot);
    }
    return ReminderScheduler.instance;
  }

  start(): void {
    if (this.task) {
      logger.warn('Reminder scheduler is already running');
      return;
    }

    // Run every minute to check for reminders
    this.task = cron.schedule('* * * * *', async () => {
      await this.checkReminders();
    }, {
      scheduled: false,
    });

    this.task.start();
    logger.info('Reminder scheduler started');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Reminder scheduler stopped');
    }
  }

  private async checkReminders(): Promise<void> {
    try {
      const users = await DiaryQueries.getUsersWithoutTodayEntry();
      
      for (const user of users) {
        if (!user.settings) continue;
        
        const shouldSend = DateUtils.shouldSendReminder(
          user.settings.reminderHour,
          user.settings.reminderMinute,
          user.settings.timezone
        );
        
        if (shouldSend) {
          await this.sendReminder(user.tgid);
        }
      }
    } catch (error) {
      logger.error('Error checking reminders:', error);
    }
  }

  private async sendReminder(tgid: bigint): Promise<void> {
    try {
      const message = [
        '🔔 Напоминание о дневнике',
        '',
        'Вы ещё не добавили запись на сегодня.',
        '',
        'Добавьте запись: /add [оценка] текст',
        '',
        'Отключить напоминания: /reminder_off',
      ].join('\n');

      await this.bot.api.sendMessage(Number(tgid), message);
      logger.info(`Reminder sent to user ${tgid}`);
      
    } catch (error) {
      logger.error(`Failed to send reminder to user ${tgid}:`, error);
    }
  }
}

export default ReminderScheduler;