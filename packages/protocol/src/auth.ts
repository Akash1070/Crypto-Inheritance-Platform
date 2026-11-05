import { z } from 'zod';

export const RegistrationOptionsRequestSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email()
});

export type RegistrationOptionsRequest = z.infer<typeof RegistrationOptionsRequestSchema>;

export const RegistrationVerificationRequestSchema = z.object({
  userId: z.string().uuid(),
  deviceName: z.string().min(1).max(64),
  response: z.record(z.unknown())
});

export type RegistrationVerificationRequest = z.infer<typeof RegistrationVerificationRequestSchema>;

export const AuthenticationOptionsRequestSchema = z.object({
  username: z.string().min(3).max(64).optional()
});

export type AuthenticationOptionsRequest = z.infer<typeof AuthenticationOptionsRequestSchema>;

export const AuthenticationVerificationRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  response: z.record(z.unknown())
});

export type AuthenticationVerificationRequest = z.infer<typeof AuthenticationVerificationRequestSchema>;

export const StepUpVerificationRequestSchema = z.object({
  action: z.enum(['ADD_HEIR', 'REMOVE_HEIR', 'CHANGE_GRACE_PERIOD', 'CANCEL_CLAIM', 'DELETE_VAULT']),
  response: z.record(z.unknown())
});

export type StepUpVerificationRequest = z.infer<typeof StepUpVerificationRequestSchema>;

export const EmergencyKitVerifyRequestSchema = z.object({
  username: z.string().min(3).max(64),
  mnemonic: z.string().min(12)
});

export type EmergencyKitVerifyRequest = z.infer<typeof EmergencyKitVerifyRequestSchema>;

