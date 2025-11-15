/**
 * Type definitions for Pow3r Defender
 */

export interface Env {
  DEFENDER_DB: D1Database;
  DEFENDER_VECTORS?: VectorizeIndex;
  DEFENDER_FORGE: KVNamespace;
  CONFIG_STORE: KVNamespace;
  TELEGRAM_STATE: KVNamespace;
  TELEGRAM_MEDIA: R2Bucket;
  EVIDENCE_VAULT: R2Bucket;
  ABI_WEBHOOK_URL?: string;
  WORKER_URL?: string;
  SHORTENER_DOMAIN?: string;
  CLAUDE_MCP_URL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  SPUR_API_KEY?: string;
  IPQS_API_KEY?: string;
  OSINT_INDUSTRIES_API_KEY?: string;
  TRACERS_API_KEY?: string;
  HUNTER_API_KEY?: string;
  HIBP_API_KEY?: string;
  NUMVERIFY_API_KEY?: string;
  WHOIS_API_KEY?: string;
  ETHEREUM_RPC_URL?: string;
}

