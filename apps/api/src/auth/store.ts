import { secureRandomHex } from '@cip/crypto-core';

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
  id: string; // Base64URL-encoded credential ID
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

export class MemoryAuthStore {
  private usersById = new Map<string, UserRecord>();
  private usersByName = new Map<string, UserRecord>();
  private credentialsByUserId = new Map<string, CredentialRecord[]>();
  private credentialsById = new Map<string, CredentialRecord>();
  private challenges = new Map<string, ChallengeRecord>();
  private sessions = new Map<string, SessionRecord>();
  private stepUpTokens = new Map<string, StepUpTokenRecord>();

  async createUser(username: string, email: string): Promise<UserRecord> {
    const existing = this.usersByName.get(username.toLowerCase());
    if (existing) {
      return existing;
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

  async saveChallenge(
    userId: string,
    challenge: string,
    type: ChallengeRecord['type'],
    ttlSeconds: number = 300
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    this.challenges.set(challenge, { challenge, userId, type, expiresAt });
  }

  async getAndConsumeChallenge(challenge: string): Promise<ChallengeRecord | undefined> {
    const record = this.challenges.get(challenge);
    if (!record) return undefined;
    this.challenges.delete(challenge);

    if (new Date() > record.expiresAt) {
      return undefined;
    }
    return record;
  }

  async addCredential(
    userId: string,
    credentialId: string,
    publicKey: Uint8Array,
    signCount: number,
    deviceName: string,
    transports?: string[]
  ): Promise<CredentialRecord> {
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

  async createSession(userId: string, ttlHours: number = 24): Promise<SessionRecord> {
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

  async createStepUpToken(userId: string, action: string, ttlSeconds: number = 300): Promise<string> {
    const token = await secureRandomHex(32);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    this.stepUpTokens.set(token, { token, userId, action, expiresAt });
    return token;
  }

  async verifyAndConsumeStepUpToken(token: string, action: string): Promise<string | undefined> {
    const record = this.stepUpTokens.get(token);
    if (!record) return undefined;
    this.stepUpTokens.delete(token);

    if (new Date() > record.expiresAt || record.action !== action) {
      return undefined;
    }
    return record.userId;
  }
}

export const authStore = new MemoryAuthStore();
