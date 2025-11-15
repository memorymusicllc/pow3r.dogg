-- Pow3r Defender D1 Database Schema
-- Run with: wrangler d1 execute DEFENDER_DB --file=./schema.sql

-- Evidence Artifacts
CREATE TABLE IF NOT EXISTS evidence_artifacts (
  evidence_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  metadata TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  collected_by TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chain of Custody
CREATE TABLE IF NOT EXISTS chain_of_custody (
  entry_id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  hash TEXT NOT NULL,
  previous_hash TEXT,
  blockchain_tx_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (evidence_id) REFERENCES evidence_artifacts(evidence_id)
);

-- Evidence Packages
CREATE TABLE IF NOT EXISTS evidence_packages (
  package_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  evidence_ids TEXT NOT NULL,
  exported_at TEXT NOT NULL,
  exported_by TEXT NOT NULL,
  signature TEXT NOT NULL,
  edrm_xml TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- XMAP History
CREATE TABLE IF NOT EXISTS xmap_history (
  version_id TEXT PRIMARY KEY,
  xmap_id TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  xmap_data TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  change_type TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Communication Records
CREATE TABLE IF NOT EXISTS communication_records (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL, -- 'email', 'sms', 'telegram', 'chat'
  sender_identifier TEXT,
  recipient_identifier TEXT,
  content TEXT NOT NULL,
  metadata TEXT, -- JSON
  evidence_hash TEXT,
  recorded_at INTEGER NOT NULL,
  investigation_id TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Shortened URLs
CREATE TABLE IF NOT EXISTS shortened_urls (
  id TEXT PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  click_count INTEGER DEFAULT 0,
  click_limit INTEGER,
  creator_id TEXT,
  custom_domain TEXT
);

-- Attacker Profiles
CREATE TABLE IF NOT EXISTS attacker_profiles (
  id TEXT PRIMARY KEY,
  fingerprint TEXT,
  ip_address TEXT,
  phone_number TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  threat_score REAL DEFAULT 0.5,
  aliases TEXT, -- JSON array
  related_attackers TEXT, -- JSON array
  evidence_ids TEXT, -- JSON array
  investigation_ids TEXT, -- JSON array
  created_at INTEGER DEFAULT (unixepoch())
);

-- Evidence Chain (for timeline)
CREATE TABLE IF NOT EXISTS evidence_chain (
  id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  collected_by TEXT NOT NULL,
  investigation_id TEXT,
  attacker_id TEXT,
  hash TEXT NOT NULL,
  metadata TEXT, -- JSON
  chain_index INTEGER NOT NULL,
  previous_hash TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_artifacts(type, timestamp);
CREATE INDEX IF NOT EXISTS idx_custody_evidence ON chain_of_custody(evidence_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_packages_case ON evidence_packages(case_id);
CREATE INDEX IF NOT EXISTS idx_xmap_id ON xmap_history(xmap_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON xmap_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_xmap_timestamp ON xmap_history(xmap_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_communication_channel ON communication_records(channel, recorded_at);
CREATE INDEX IF NOT EXISTS idx_communication_sender ON communication_records(sender_identifier);
CREATE INDEX IF NOT EXISTS idx_short_code ON shortened_urls(short_code);
CREATE INDEX IF NOT EXISTS idx_short_tracking ON shortened_urls(tracking_id);
CREATE INDEX IF NOT EXISTS idx_attacker_fingerprint ON attacker_profiles(fingerprint);
CREATE INDEX IF NOT EXISTS idx_attacker_ip ON attacker_profiles(ip_address);
CREATE INDEX IF NOT EXISTS idx_attacker_phone ON attacker_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_attacker_threat ON attacker_profiles(threat_score);
CREATE INDEX IF NOT EXISTS idx_attacker_last_seen ON attacker_profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_timestamp ON evidence_chain(timestamp);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_investigation ON evidence_chain(investigation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_attacker ON evidence_chain(attacker_id);

