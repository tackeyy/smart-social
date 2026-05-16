-- =============================================================================
-- Migration: 20260516000005_add_reply_draft_processing_status.sql
-- Description: Add 'processing' to reply_draft_status ENUM for atomic dedup
--              Prevents double-posting when concurrent approve requests arrive
-- =============================================================================

ALTER TYPE reply_draft_status ADD VALUE 'processing';
