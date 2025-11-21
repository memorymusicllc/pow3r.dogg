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
  custom_domain TEXT,
  tags TEXT, -- JSON array
  qr_code_url TEXT
);

-- Link Clicks
CREATE TABLE IF NOT EXISTS link_clicks (
  id TEXT PRIMARY KEY,
  short_code TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  country TEXT,
  city TEXT,
  device_fingerprint TEXT,
  timestamp INTEGER NOT NULL,
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (short_code) REFERENCES shortened_urls(short_code)
);

-- Tracked Files
CREATE TABLE IF NOT EXISTS tracked_files (
  id TEXT PRIMARY KEY,
  document_id TEXT UNIQUE NOT NULL,
  tracking_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- R2 key
  format TEXT NOT NULL, -- 'pdf', 'docx', 'xlsx'
  content_description TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  creator_id TEXT,
  metadata TEXT -- JSON
);

-- File Events (downloads, views, opens)
CREATE TABLE IF NOT EXISTS file_events (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'download', 'view', 'open'
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_fingerprint TEXT,
  timestamp INTEGER NOT NULL,
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (document_id) REFERENCES tracked_files(document_id)
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

-- Knowledge Graph Data (per attacker profile)
CREATE TABLE IF NOT EXISTS knowledge_graph_data (
  id TEXT PRIMARY KEY,
  attacker_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- R2 key
  parsed_data TEXT NOT NULL, -- JSON
  uploaded_at INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (attacker_id) REFERENCES attacker_profiles(id)
);

-- Image Lookup Cache
CREATE TABLE IF NOT EXISTS image_lookup_cache (
  id TEXT PRIMARY KEY,
  image_hash TEXT UNIQUE NOT NULL,
  reverse_search_results TEXT, -- JSON
  face_recognition_results TEXT, -- JSON
  lookup_timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL, -- 'Admin', 'Investigator', 'Viewer', etc.
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'pending'
  permissions TEXT NOT NULL, -- JSON array
  last_active INTEGER,
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
CREATE INDEX IF NOT EXISTS idx_short_creator ON shortened_urls(creator_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_code ON link_clicks(short_code, timestamp);
CREATE INDEX IF NOT EXISTS idx_link_clicks_tracking ON link_clicks(tracking_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_ip ON link_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_file_events_document ON file_events(document_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_file_events_tracking ON file_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_file_events_type ON file_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracked_files_creator ON tracked_files(creator_id);
CREATE INDEX IF NOT EXISTS idx_tracked_files_created ON tracked_files(created_at);
CREATE INDEX IF NOT EXISTS idx_attacker_fingerprint ON attacker_profiles(fingerprint);
CREATE INDEX IF NOT EXISTS idx_attacker_ip ON attacker_profiles(ip_address);
CREATE INDEX IF NOT EXISTS idx_attacker_phone ON attacker_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_attacker_threat ON attacker_profiles(threat_score);
CREATE INDEX IF NOT EXISTS idx_attacker_last_seen ON attacker_profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_timestamp ON evidence_chain(timestamp);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_investigation ON evidence_chain(investigation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_attacker ON evidence_chain(attacker_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_attacker ON knowledge_graph_data(attacker_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_uploaded ON knowledge_graph_data(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_image_lookup_hash ON image_lookup_cache(image_hash);
CREATE INDEX IF NOT EXISTS idx_image_lookup_timestamp ON image_lookup_cache(lookup_timestamp);
CREATE INDEX IF NOT EXISTS idx_team_member_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_member_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_member_role ON team_members(role);

-- LLM Accounts
CREATE TABLE IF NOT EXISTS llm_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'azure', 'self-hosted', 'google', 'cohere'
  account_name TEXT NOT NULL,
  api_key TEXT, -- Encrypted or reference to Pow3r Pass
  endpoint_url TEXT,
  models TEXT NOT NULL, -- JSON array of available models
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  cost_per_token REAL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'error', 'rate_limited'
  last_used INTEGER,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch())
);

-- Model Mix Presets
CREATE TABLE IF NOT EXISTS model_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'text', 'document'
  workflow_type TEXT NOT NULL, -- 'simple', 'adaptive'
  model_config TEXT NOT NULL, -- JSON: {primary: {...}, fallback: [...], mixing: {...}}
  priority INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch())
);

-- Media Generation Jobs
CREATE TABLE IF NOT EXISTS media_generation_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'text', 'document'
  prompt TEXT NOT NULL,
  preset_id TEXT,
  workflow_type TEXT NOT NULL, -- 'simple', 'adaptive'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  llm_account_id TEXT,
  model_used TEXT,
  result_url TEXT, -- URL to generated media
  result_storage_key TEXT, -- R2 key
  result_metadata TEXT, -- JSON
  error_message TEXT,
  generation_time_ms INTEGER,
  cost REAL DEFAULT 0.0,
  created_at INTEGER DEFAULT (unixepoch()),
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (preset_id) REFERENCES model_presets(id),
  FOREIGN KEY (llm_account_id) REFERENCES llm_accounts(id)
);

-- Media Generation Events (for tracking success/failure)
CREATE TABLE IF NOT EXISTS media_generation_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'started', 'model_selected', 'generation_complete', 'generation_failed', 'retry', 'success', 'failure'
  llm_account_id TEXT,
  model_used TEXT,
  duration_ms INTEGER,
  cost REAL DEFAULT 0.0,
  error_message TEXT,
  metadata TEXT, -- JSON
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (job_id) REFERENCES media_generation_jobs(id),
  FOREIGN KEY (llm_account_id) REFERENCES llm_accounts(id)
);

-- Workflow Configurations
CREATE TABLE IF NOT EXISTS workflow_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  workflow_type TEXT NOT NULL, -- 'simple', 'adaptive'
  media_type TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON: workflow steps, conditions, fallbacks
  is_default BOOLEAN DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_llm_accounts_provider ON llm_accounts(provider, status);
CREATE INDEX IF NOT EXISTS idx_llm_accounts_status ON llm_accounts(status);
CREATE INDEX IF NOT EXISTS idx_model_presets_media_type ON model_presets(media_type, workflow_type);
CREATE INDEX IF NOT EXISTS idx_media_jobs_status ON media_generation_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_media_jobs_type ON media_generation_jobs(job_type, status);
CREATE INDEX IF NOT EXISTS idx_media_jobs_preset ON media_generation_jobs(preset_id);
CREATE INDEX IF NOT EXISTS idx_media_events_job ON media_generation_events(job_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_workflow_configs_type ON workflow_configs(workflow_type, media_type);

