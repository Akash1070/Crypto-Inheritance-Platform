import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  emailBlindIndex: varchar('email_blind_index', { length: 64 }).notNull().unique(),
  encryptedEmail: text('encrypted_email').notNull(),
  emergencyKitVerifier: varchar('emergency_kit_verifier', { length: 64 }),
  emergencyKitSalt: varchar('emergency_kit_salt', { length: 32 }),
  status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const credentials = pgTable('credentials', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  signCount: integer('sign_count').notNull().default(0),
  deviceName: varchar('device_name', { length: 64 }).notNull(),
  transports: text('transports').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at').defaultNow().notNull()
});

export const vaults = pgTable('vaults', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  state: varchar('state', { length: 32 }).notNull().default('ACTIVE'),
  checkinIntervalDays: integer('checkin_interval_days').notNull().default(90),
  gracePeriodDays: integer('grace_period_days').notNull().default(60),
  challengeWindowDays: integer('challenge_window_days').notNull().default(30),
  lastCheckinAt: timestamp('last_checkin_at').defaultNow().notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const vaultBlobs = pgTable('vault_blobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  ciphertextEnvelope: text('ciphertext_envelope').notNull(),
  ciphertextSha256: varchar('ciphertext_sha256', { length: 64 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const heirs = pgTable('heirs', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  heirPubkey: varchar('heir_pubkey', { length: 64 }).notNull(),
  wrappedHeirShare: text('wrapped_heir_share').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const escrowShares = pgTable('escrow_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  sealedEscrowShare: text('sealed_escrow_share').notNull(),
  keyVersion: integer('key_version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
  prevHash: varchar('prev_hash', { length: 64 }).notNull(),
  signature: text('signature').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

