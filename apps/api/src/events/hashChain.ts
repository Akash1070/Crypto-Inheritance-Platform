import {
  MemoryEventChainManager,
  PgEventChainStore,
  GENESIS_PREV_HASH
} from '@cip/event-chain';
import type { AuditEventRecord } from '@cip/event-chain';
import { hasDatabase, getPool } from '../db/index.js';

export { GENESIS_PREV_HASH };
export type { AuditEventRecord };

export const eventChainManager = hasDatabase() ? new PgEventChainStore(getPool()) : new MemoryEventChainManager();
