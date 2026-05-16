-- =============================================================================
-- Migration: 20260516000004_add_processing_status.sql
-- Description: Add 'processing' to post_status ENUM for atomic Cron dedup
--              Prevents double-posting when Vercel Cron overlaps
-- =============================================================================

ALTER TYPE post_status ADD VALUE 'processing';
