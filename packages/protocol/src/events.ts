import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'VAULT_CREATED',
  'CHECKIN',
  'REMINDER_SENT',
  'PENDING_ENTERED',
  'CLAIM_STARTED',
  'CLAIM_CANCELLED',
  'VAULT_PAUSED',
  'VAULT_RESUMED',
  'RELEASE_APPROVED',
  'RELEASE_EMITTED',
  'VAULT_CANCELLED'
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  vaultId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  type: EventTypeSchema,
  payloadHash: z.string().regex(/^[0-9a-f]{64}$/i),
  previousHash: z.string().regex(/^[0-9a-f]{64}$/i),
  timestamp: z.string().datetime(),
  signature: z.string().min(64)
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

