import pg from 'pg';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when running with persistent storage');
    }
    pool = new pg.Pool({ connectionString, max: 10 });
  }
  return pool;
}

export function hasDatabase(): boolean {
  return Boolean(process.env['DATABASE_URL']);
}

export async function ensureDatabase(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username varchar(64) NOT NULL UNIQUE,
      email varchar(320) NOT NULL,
      email_blind_index varchar(64) NOT NULL UNIQUE,
      encrypted_email text NOT NULL DEFAULT '',
      emergency_kit_verifier varchar(64),
      emergency_kit_salt varchar(32),
      status varchar(32) NOT NULL DEFAULT 'ACTIVE',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id varchar(255) PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_key text NOT NULL,
      sign_count integer NOT NULL DEFAULT 0,
      device_name varchar(64) NOT NULL,
      transports text[],
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);

    CREATE TABLE IF NOT EXISTS challenges (
      challenge text PRIMARY KEY,
      user_id text NOT NULL,
      type varchar(16) NOT NULL,
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

    CREATE TABLE IF NOT EXISTS sessions (
      id varchar(64) PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS step_up_tokens (
      token varchar(64) PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action varchar(32) NOT NULL,
      vault_id uuid,
      expires_at timestamptz NOT NULL
    );
    ALTER TABLE step_up_tokens ADD COLUMN IF NOT EXISTS vault_id uuid;
    CREATE INDEX IF NOT EXISTS idx_stepup_expires ON step_up_tokens(expires_at);

    CREATE TABLE IF NOT EXISTS pending_registrations (
      user_id uuid PRIMARY KEY,
      username varchar(64) NOT NULL,
      email varchar(320) NOT NULL,
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pending_reg_expires ON pending_registrations(expires_at);

    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket varchar(192) PRIMARY KEY,
      count integer NOT NULL DEFAULT 0,
      reset_at timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vaults (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label text NOT NULL,
      state varchar(32) NOT NULL DEFAULT 'ACTIVE',
      checkin_interval_days integer NOT NULL DEFAULT 90,
      grace_period_days integer NOT NULL DEFAULT 60,
      challenge_window_days integer NOT NULL DEFAULT 30,
      last_checkin_at timestamptz NOT NULL DEFAULT now(),
      challenge_started_at timestamptz,
      challenge_expires_at timestamptz,
      claiming_heir_pubkey varchar(64),
      last_notification_tier varchar(32),
      last_notification_sent_at timestamptz,
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_vaults_owner ON vaults(owner_id);

    CREATE TABLE IF NOT EXISTS vault_blobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
      version integer NOT NULL,
      ciphertext_envelope text NOT NULL,
      ciphertext_sha256 varchar(64) NOT NULL,
      size_bytes integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_blobs_vault ON vault_blobs(vault_id, version);

    CREATE TABLE IF NOT EXISTS heirs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
      label text NOT NULL,
      heir_pubkey varchar(64) NOT NULL,
      wrapped_heir_share text NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'ACTIVE',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_heirs_vault ON heirs(vault_id);

    CREATE TABLE IF NOT EXISTS escrow_shares (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
      sealed_escrow_share text NOT NULL,
      key_version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_escrow_vault ON escrow_shares(vault_id);

    CREATE TABLE IF NOT EXISTS events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
      sequence integer NOT NULL,
      type varchar(64) NOT NULL,
      payload_hash varchar(64) NOT NULL,
      prev_hash varchar(64) NOT NULL,
      signature text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (vault_id, sequence)
    );
    CREATE INDEX IF NOT EXISTS idx_events_vault ON events(vault_id, sequence);
  `);
}
