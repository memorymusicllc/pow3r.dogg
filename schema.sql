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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_artifacts(type, timestamp);
CREATE INDEX IF NOT EXISTS idx_custody_evidence ON chain_of_custody(evidence_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_packages_case ON evidence_packages(case_id);
CREATE INDEX IF NOT EXISTS idx_xmap_id ON xmap_history(xmap_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON xmap_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_xmap_timestamp ON xmap_history(xmap_id, timestamp);

