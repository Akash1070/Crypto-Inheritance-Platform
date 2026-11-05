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
}).strict();

export type VaultConfig = z.infer<typeof VaultConfigSchema>;

// BIP-39 / Mnemonic detection regex to prevent accidental secret pasting in labels
const MNEMONIC_DETECTOR = /\b([a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/i;

function rejectSeedPhrase(val: string): boolean {
  return !MNEMONIC_DETECTOR.test(val);
}

// Banned secret property names that must never be accepted in API requests
export const BANNED_SECRET_KEYS = [
  'seed',
  'seedphrase',
  'seed_phrase',
  'mnemonic',
  'privatekey',
  'private_key',
  'secret',
  'privkey',
  'words',
  'bip39',
  'passphrase'
];

export const CreateVaultRequestSchema = z.object({
  label: z.string().min(1).max(100).refine(rejectSeedPhrase, {
    message: 'CRITICAL SECURITY REJECTION: Potential seed phrase / mnemonic detected in label field. Web forms never accept private keys or recovery words.'
  }),
  config: VaultConfigSchema.optional(),
  ciphertextEnvelope: z.string().min(10).refine(rejectSeedPhrase, {
    message: 'Invalid ciphertext envelope'
  }),
  sealedEscrowShare: z.string().min(10)
}).strict();

export type CreateVaultRequest = z.infer<typeof CreateVaultRequestSchema>;

export const AddHeirRequestSchema = z.object({
  label: z.string().min(1).max(100).refine(rejectSeedPhrase, {
    message: 'Potential seed phrase detected in heir label'
  }),
  heirPubkey: z.string().regex(/^[0-9a-f]{64}$/i, 'Heir public key must be 32-byte hex string'),
  wrappedHeirShare: z.string().min(10)
}).strict();

export type AddHeirRequest = z.infer<typeof AddHeirRequestSchema>;

export const UpdateBlobRequestSchema = z.object({
  ciphertextEnvelope: z.string().min(10).refine(rejectSeedPhrase, {
    message: 'Invalid ciphertext envelope'
  })
}).strict();

export type UpdateBlobRequest = z.infer<typeof UpdateBlobRequestSchema>;

export const InitiateClaimRequestSchema = z.object({
  heirPubkey: z.string().regex(/^[0-9a-f]{64}$/i, 'Heir public key must be 32-byte hex string'),
  stepUpToken: z.string().min(10)
}).strict();

export type InitiateClaimRequest = z.infer<typeof InitiateClaimRequestSchema>;

export const CancelClaimRequestSchema = z.object({
  stepUpToken: z.string().min(10),
  reason: z.string().max(200).optional()
}).strict();

export type CancelClaimRequest = z.infer<typeof CancelClaimRequestSchema>;

