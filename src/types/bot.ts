import type { Context } from 'grammy';
import type { User, Settings } from '@prisma';

export interface SessionData {
  user?: User & { settings?: Settings | null };
  timezone?: string;
}

export interface BotContext extends Context {
  session: SessionData;
  user?: User & { settings?: Settings | null };
}