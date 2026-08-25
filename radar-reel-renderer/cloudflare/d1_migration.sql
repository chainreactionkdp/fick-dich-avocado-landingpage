-- Run once in the SAME D1 database used by radar-affiliate-publisher
CREATE TABLE IF NOT EXISTS reel_jobs (
  job_id TEXT PRIMARY KEY,
  asin TEXT NOT NULL,
  family_key TEXT NOT NULL,
  product_title TEXT NOT NULL,
  brand_or_author TEXT NOT NULL,
  description TEXT NOT NULL,
  palette_json TEXT NOT NULL,
  scenes_json TEXT NOT NULL,
  status TEXT NOT NULL,
  upload_token_hash TEXT NOT NULL,
  facebook_video_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reel_jobs_status ON reel_jobs(status);
CREATE INDEX IF NOT EXISTS idx_reel_jobs_expires ON reel_jobs(expires_at);
