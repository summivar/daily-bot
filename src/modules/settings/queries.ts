import type { User, Settings } from '@prisma';
import { prisma } from '@/utils/prisma';

export class SettingsQueries {
  static async createOrUpdateUser(
    tgid: bigint,
    username?: string | null,
    firstName?: string | null,
    lastName?: string | null
  ): Promise<User & { settings?: Settings | null }> {
    const user = await prisma.user.upsert({
      where: { tgid },
      update: {
        username: username ?? null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        updatedAt: new Date(),
      },
      create: {
        tgid,
        username: username ?? null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        settings: {
          create: {}, // Create default settings
        },
      },
      include: {
        settings: true,
      },
    });

    return user;
  }

  static async getUserByTgId(tgid: bigint): Promise<(User & { settings?: Settings | null }) | null> {
    const user = await prisma.user.findUnique({
      where: { tgid },
      include: {
        settings: true,
      },
    });

    return user;
  }

  static async getUserSettings(userId: number): Promise<Settings | null> {
    const settings = await prisma.settings.findUnique({
      where: { userId },
    });

    return settings;
  }

  static async updateReminderSettings(
    userId: number,
    remindersEnabled: boolean
  ): Promise<Settings> {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        remindersEnabled,
        updatedAt: new Date(),
      },
      create: {
        userId,
        remindersEnabled,
      },
    });

    return settings;
  }

  static async updateReminderTime(
    userId: number,
    hour: number,
    minute: number
  ): Promise<Settings> {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        reminderHour: hour,
        reminderMinute: minute,
        updatedAt: new Date(),
      },
      create: {
        userId,
        reminderHour: hour,
        reminderMinute: minute,
      },
    });

    return settings;
  }

  static async updateTimezone(
    userId: number,
    timezone: string
  ): Promise<Settings> {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        timezone,
        updatedAt: new Date(),
      },
      create: {
        userId,
        timezone,
      },
    });

    return settings;
  }
}

export default SettingsQueries;