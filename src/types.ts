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
  SPUR_API_KEY?: string; // DEPRECATED: Replaced with IP2Proxy LITE + VPN lists (Phase 2)
  IPQS_API_KEY?: string; // DEPRECATED: Replaced with AbuseIPDB + FireHOL (Phase 2)
  ABUSEIPDB_API_KEY?: string; // Optional: AbuseIPDB API key for higher rate limits (free tier works without it)
  OSINT_INDUSTRIES_API_KEY?: string; // DEPRECATED: Replaced with SpiderFoot (Phase 3)
  TRACERS_API_KEY?: string; // DEPRECATED: Replaced with SpiderFoot (Phase 3)
  SPIDERFOOT_API_URL?: string; // SpiderFoot API URL (self-hosted, e.g., http://localhost:5001)
  HUNTER_API_KEY?: string; // DEPRECATED: Replaced with EmailRep.io + MX validation (Phase 1)
  HIBP_API_KEY?: string; // Still used for email breach checks (free tier)
  NUMVERIFY_API_KEY?: string; // DEPRECATED: Replaced with libphonenumber-js (Phase 1)
  WHOIS_API_KEY?: string; // DEPRECATED: Replaced with ICANN RDAP (Phase 1)
  ETHEREUM_RPC_URL?: string;
  GOOGLE_MAPS_API_KEY?: string;
  CLEARBIT_API_KEY?: string;
  FULLCONTACT_API_KEY?: string;
  SMARTYSTREETS_API_KEY?: string;
  TINEYE_API_KEY?: string;
  CLOUDFLARE_AI_TOKEN?: string;
}

