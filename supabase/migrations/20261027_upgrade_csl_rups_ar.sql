-- Migration: Upgrade csl_rups_ar for Legal Governance & Akta Tracking
-- Run this in Supabase SQL Editor

ALTER TABLE csl_rups_ar
  ADD COLUMN IF NOT EXISTS method text DEFAULT 'Sirkuler',
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'Drafting',
  ADD COLUMN IF NOT EXISTS notary_name text,
  ADD COLUMN IF NOT EXISTS deed_number text,
  ADD COLUMN IF NOT EXISTS deed_date date,
  ADD COLUMN IF NOT EXISTS ahu_number text,
  ADD COLUMN IF NOT EXISTS ahu_status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS document_name text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Comment for metadata documentation
COMMENT ON COLUMN csl_rups_ar.method IS 'Metode RUPS: Sirkuler / RUPS Fisik / Hybrid';
COMMENT ON COLUMN csl_rups_ar.stage IS 'Tahapan proses: Drafting, Sirkuler/Tanda Tangan, Notaris/Akta, AHU Kemenkumham, Selesai';
COMMENT ON COLUMN csl_rups_ar.ahu_status IS 'Status AHU: Pending, Diajukan, Terbit SK, Blocked';
