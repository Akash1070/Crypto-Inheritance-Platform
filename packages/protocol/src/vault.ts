import { z } from 'zod';

export const VaultStateSchema = z.enum([
  'ACTIVE',
  'REMINDER_WINDOW',
  'PENDING',
  'CHALLENGE',
  'RELEASED',
  'PAUSED',
  'CANCELLED'
]);

export type VaultState = z.infer<typeof VaultStateSchema>;

export const VaultConfigSchema = z.object({
  checkinIntervalDays: z.number().int().min(30).max(365).default(90),
  gracePeriodDays: z.number().int().min(14).max(180).default(60),
  challengeWindowDays: z.number().int().min(14).max(90).default(30)
});

export type VaultConfig = z.infer<typeof VaultConfigSchema>;

