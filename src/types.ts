/**
 * Type definitions for Pow3r Defender
 */

export interface Env {
  DEFENDER_DB: D1Database;
  DEFENDER_VECTORS: VectorizeIndex;
  DEFENDER_FORGE: KVNamespace;
  CONFIG_STORE: KVNamespace;
  TELEGRAM_STATE: KVNamespace;
  TELEGRAM_MEDIA: R2Bucket;
  EVIDENCE_VAULT: R2Bucket;
  ABI_WEBHOOK_URL?: string;
}

