import pg from 'pg';
import { secureRandomHex } from '@cip/crypto-core';
import { hasDatabase, getPool } from '../db/index.js';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  emergencyKitVerifier?: string | undefined;
  emergencyKitSalt?: string | undefined;
  status: 'ACTIVE' | 'RECOVERY_PENDING';
  createdAt: Date;
}

export interface CredentialRecord {
  id: string;
  userId: string;
  publicKey: Uint8Array;
  signCount: number;
  deviceName: string;
  transports?: string[] | undefined;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface ChallengeRecord {
  challenge: string;
  userId: string;
  type: 'REGISTRATION' | 'AUTHENTICATION' | 'STEP_UP';
  expiresAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface StepUpTokenRecord {
  token: string;
  userId: string;
  action: string;
  expiresAt: Date;
}

export interface AuthStore {
  createUser(username: string, email: string): Promise<UserRecord>;
  getUserById(id: string): Promise<UserRecord | undefined>;
  getUserByName(username: string): Promise<UserRecord | undefined>;
  saveChallenge(userId: string, challenge: string, type: ChallengeRecord['type'], ttlSeconds?: number): Promise<void>;
  getAndConsumeChallenge(challenge: string): Promise<ChallengeRecord | undefined>;
  addCredential(userId: string, credentialId: string, publicKey: Uint8Array, signCount: number, deviceName: string, transports?: string[]): Promise<CredentialRecord>;
  getCredentialsForUser(userId: string): Promise<CredentialRecord[]>;
  getCredentialById(credentialId: string): Promise<CredentialRecord | undefined>;
  updateSignCount(credentialId: string, newSignCount: number): Promise<void>;
  setEmergencyKitVerifier(userId: string, verifier: string, salt: string): Promise<void>;
  createSession(userId: string, ttlHours?: number): Promise<SessionRecord>;
  getSession(sessionId: string): Promise<SessionRecord | undefined>;
  deleteSession(sessionId: string): Promise<void>;
  createStepUpToken(userId: string, action: string, ttlSeconds?: number): Promise<string>;
  verifyAndConsumeStepUpToken(token: string, action: string): Promise<string | undefined>;
  clear(): Promise<void>;
}

export class MemoryAuthStore implements AuthStore {
  private usersById = new Map<string, UserRecord>();
  private usersByName = new Map<string, UserRecord>();
  private credentialsByUserId = new Map<string, CredentialRecord[]>();
  private credentialsById = new Map<string, CredentialRecord>();
  private challenges = new Map<string, ChallengeRecord>();
  private sessions = new Map<string, SessionRecord>();
  private stepUpTokens = new Map<string, StepUpTokenRecord>();

  constructor() {
    const timer = setInterval(() => {
      this.pruneExpiredEntries();
    }, 60_000);
    if (timer.unref) timer.unref();
  }

  private pruneExpiredEntries(): void {
    const now = new Date();
    for (const [key, val] of this.challenges.entries()) {
      if (now > val.expiresAt) this.challenges.delete(key);
    }
    for (const [key, val] of this.sessions.entries()) {
      if (now > val.expiresAt) this.sessions.delete(key);
    }
    for (const [key, val] of this.stepUpTokens.entries()) {
      if (now > val.expiresAt) this.stepUpTokens.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.usersById.clear();
    this.usersByName.clear();
    this.credentialsByUserId.clear();
    this.credentialsById.clear();
    this.challenges.clear();
    this.sessions.clear();
    this.stepUpTokens.clear();
  }

  async createUser(username: string, email: string): Promise<UserRecord> {
    const existing = this.usersByName.get(username.toLowerCase());
    if (existing) {
      throw new Error('USER_ALREADY_EXISTS');
    }
    const id = globalThis.crypto.randomUUID();
    const user: UserRecord = {
      id,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      status: 'ACTIVE',
      createdAt: new Date()
    };
    this.usersById.set(id, user);
    this.usersByName.set(username.toLowerCase(), user);
    this.credentialsByUserId.set(id, []);
    return user;
  }

  async getUserById(id: string): Promise<UserRecord | undefined> {
    return this.usersById.get(id);
  }

  async getUserByName(username: string): Promise<UserRecord | undefined> {
    return this.usersByName.get(username.toLowerCase());
  }

  async saveChallenge(userId: string, challenge: string, type: ChallengeRecord['type'], ttlSeconds = 300): Promise<void> {
    this.challenges.set(challenge, { challenge, userId, type, expiresAt: new Date(Date.now() + ttlSeconds * 1000) });
  }

  async getAndConsumeChallenge(challenge: string): Promise<ChallengeRecord | undefined> {
    const record = this.challenges.get(challenge);
    if (!record) return undefined;
    this.challenges.delete(challenge);
    if (new Date() > record.expiresAt) return undefined;
    return record;
  }

  async addCredential(userId: string, credentialId: string, publicKey: Uint8Array, signCount: number, deviceName: string, transports?: string[]): Promise<CredentialRecord> {
    const record: CredentialRecord = {
      id: credentialId,
      userId,
      publicKey,
      signCount,
      deviceName,
      transports,
      createdAt: new Date(),
      lastUsedAt: new Date()
    };
    const userCreds = this.credentialsByUserId.get(userId) || [];
    userCreds.push(record);
    this.credentialsByUserId.set(userId, userCreds);
    this.credentialsById.set(credentialId, record);
    return record;
  }

  async getCredentialsForUser(userId: string): Promise<CredentialRecord[]> {
    return this.credentialsByUserId.get(userId) || [];
  }

  async getCredentialById(credentialId: string): Promise<CredentialRecord | undefined> {
    return this.credentialsById.get(credentialId);
  }

  async updateSignCount(credentialId: string, newSignCount: number): Promise<void> {
    const cred = this.credentialsById.get(credentialId);
    if (cred) {
      cred.signCount = newSignCount;
      cred.lastUsedAt = new Date();
    }
  }

  async setEmergencyKitVerifier(userId: string, verifier: string, salt: string): Promise<void> {
    const user = this.usersById.get(userId);
    if (user) {
      user.emergencyKitVerifier = verifier;
      user.emergencyKitSalt = salt;
    }
  }

  async createSession(userId: string, ttlHours = 24): Promise<SessionRecord> {
    const id = await secureRandomHex(32);
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    const session: SessionRecord = { id, userId, createdAt: new Date(), expiresAt };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<SessionRecord | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async createStepUpToken(userId: string, action: string, ttlSeconds = 300): Promise<string> {
    const token = await secureRandomHex(32);
    this.stepUpTokens.set(token, { token, userId, action, expiresAt: new Date(Date.now() + ttlSeconds * 1000) });
    return token;
  }

  async verifyAndConsumeStepUpToken(token: string, action: string): Promise<string | undefined> {
    const record = this.stepUpTokens.get(token);
    if (!record) return undefined;
    this.stepUpTokens.delete(token);
    if (new Date() > record.expiresAt || record.action !== action) return undefined;
    return record.userId;
  }
}

export class PgAuthStore implements AuthStore {
  constructor(private pool: pg.Pool) {}

  private mapUser(row: { id: string; username: string; email: string; emergency_kit_verifier: string | null; emergency_kit_salt: string | null; status: string; created_at: Date | string }): UserRecord {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      emergencyKitVerifier: row.emergency_kit_verifier ?? undefined,
      emergencyKitSalt: row.emergency_kit_salt ?? undefined,
      status: row.status as UserRecord['status'],
      createdAt: new Date(row.created_at)
    };
  }

  private mapCredential(row: { id: string; user_id: string; public_key: string; sign_count: number; device_name: string; transports: string[] | null; created_at: Date | string; last_used_at: Date | string }): CredentialRecord {
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: new Uint8Array(Buffer.from(row.public_key, 'hex')),
      signCount: row.sign_count,
      deviceName: row.device_name,
      transports: row.transports ?? undefined,
      createdAt: new Date(row.created_at),
      lastUsedAt: new Date(row.last_used_at)
    };
  }

  async clear(): Promise<void> {
    await this.pool.query('TRUNCATE users, credentials, challenges, sessions, step_up_tokens CASCADE');
  }

  async createUser(username: string, email: string): Promise<UserRecord> {
    const res = await this.pool.query(
      `INSERT INTO users (username, email, email_blind_index, encrypted_email)
       VALUES ($1, $2, $1, $2) RETURNING *`,
      [username.toLowerCase(), email.toLowerCase()]
    );
    return this.mapUser(res.rows[0] as never);
  }

  async getUserById(id: string): Promise<UserRecord | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rowCount ? this.mapUser(res.rows[0] as never) : undefined;
  }

  async getUserByName(username: string): Promise<UserRecord | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    return res.rowCount ? this.mapUser(res.rows[0] as never) : undefined;
  }

  async saveChallenge(userId: string, challenge: string, type: ChallengeRecord['type'], ttlSeconds = 300): Promise<void> {
    await this.pool.query(
      `INSERT INTO challenges (challenge, user_id, type, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(secs => $4))
       ON CONFLICT (challenge) DO UPDATE
         SET user_id = EXCLUDED.user_id, type = EXCLUDED.type, expires_at = EXCLUDED.expires_at`,
      [challenge, userId, type, ttlSeconds]
    );
  }

  async getAndConsumeChallenge(challenge: string): Promise<ChallengeRecord | undefined> {
    const res = await this.pool.query(
      'DELETE FROM challenges WHERE challenge = $1 AND expires_at > now() RETURNING *',
      [challenge]
    );
    if (!res.rowCount) return undefined;
    const row = res.rows[0] as { challenge: string; user_id: string; type: string; expires_at: Date | string };
    return { challenge: row.challenge, userId: row.user_id, type: row.type as ChallengeRecord['type'], expiresAt: new Date(row.expires_at) };
  }

  async addCredential(userId: string, credentialId: string, publicKey: Uint8Array, signCount: number, deviceName: string, transports?: string[]): Promise<CredentialRecord> {
    const res = await this.pool.query(
      `INSERT INTO credentials (id, user_id, public_key, sign_count, device_name, transports)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [credentialId, userId, Buffer.from(publicKey).toString('hex'), signCount, deviceName, transports ?? null]
    );
    return this.mapCredential(res.rows[0] as never);
  }

  async getCredentialsForUser(userId: string): Promise<CredentialRecord[]> {
    const res = await this.pool.query('SELECT * FROM credentials WHERE user_id = $1 ORDER BY created_at', [userId]);
    return res.rows.map((r) => this.mapCredential(r as never));
  }

  async getCredentialById(credentialId: string): Promise<CredentialRecord | undefined> {
    const res = await this.pool.query('SELECT * FROM credentials WHERE id = $1', [credentialId]);
    return res.rowCount ? this.mapCredential(res.rows[0] as never) : undefined;
  }

  async updateSignCount(credentialId: string, newSignCount: number): Promise<void> {
    await this.pool.query(
      'UPDATE credentials SET sign_count = $2, last_used_at = now() WHERE id = $1',
      [credentialId, newSignCount]
    );
  }

  async setEmergencyKitVerifier(userId: string, verifier: string, salt: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET emergency_kit_verifier = $2, emergency_kit_salt = $3 WHERE id = $1',
      [userId, verifier, salt]
    );
  }

  async createSession(userId: string, ttlHours = 24): Promise<SessionRecord> {
    const id = await secureRandomHex(32);
    const res = await this.pool.query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(hours => $3)) RETURNING *`,
      [id, userId, ttlHours]
    );
    const row = res.rows[0] as { id: string; user_id: string; created_at: Date | string; expires_at: Date | string };
    return { id: row.id, userId: row.user_id, createdAt: new Date(row.created_at), expiresAt: new Date(row.expires_at) };
  }

  async getSession(sessionId: string): Promise<SessionRecord | undefined> {
    const res = await this.pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND expires_at > now()',
      [sessionId]
    );
    if (!res.rowCount) return undefined;
    const row = res.rows[0] as { id: string; user_id: string; created_at: Date | string; expires_at: Date | string };
    return { id: row.id, userId: row.user_id, createdAt: new Date(row.created_at), expiresAt: new Date(row.expires_at) };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  }

  async createStepUpToken(userId: string, action: string, ttlSeconds = 300): Promise<string> {
    const token = await secureRandomHex(32);
    await this.pool.query(
      `INSERT INTO step_up_tokens (token, user_id, action, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(secs => $4))`,
      [token, userId, action, ttlSeconds]
    );
    return token;
  }

  async verifyAndConsumeStepUpToken(token: string, action: string): Promise<string | undefined> {
    const res = await this.pool.query(
      'DELETE FROM step_up_tokens WHERE token = $1 AND action = $2 AND expires_at > now() RETURNING user_id',
      [token, action]
    );
    return res.rowCount ? (res.rows[0] as { user_id: string }).user_id : undefined;
  }
}

export const authStore: AuthStore = hasDatabase() ? new PgAuthStore(getPool()) : new MemoryAuthStore();
