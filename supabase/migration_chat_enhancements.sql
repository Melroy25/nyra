-- ============================================================
-- NYRA 2.0 — Migration: Chat enhancements
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add is_edited column to chat_messages (for edit tracking)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Ensure media columns exist (safe to run if already applied)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Ensure reaction column exists  
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reaction TEXT;

-- Make sure RLS policy covers supabase_admin operations
-- (Service role bypasses RLS so this is just for documentation)

-- Done ✓
