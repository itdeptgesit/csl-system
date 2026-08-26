-- Migration: CSL Phase 2 — Notifications, Response & Feedback
-- Adds response and feedback fields to csl_requests table

-- 1. Add CSL Response Fields
ALTER TABLE public.csl_requests 
ADD COLUMN IF NOT EXISTS csl_response TEXT,
ADD COLUMN IF NOT EXISTS csl_response_at TIMESTAMPTZ;

-- 2. Add Requester Feedback Fields
ALTER TABLE public.csl_requests 
ADD COLUMN IF NOT EXISTS feedback_overall_rating INTEGER CHECK (feedback_overall_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS feedback_response_time_rating INTEGER CHECK (feedback_response_time_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS feedback_service_quality_rating INTEGER CHECK (feedback_service_quality_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS feedback_comment TEXT,
ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;
