-- ============================================================
-- NYRA 2.0 — Migration: Proper Backend Tables & Media Chat
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Drop old notification_settings and recreate with proper column names
DROP TABLE IF EXISTS public.notification_settings CASCADE;

CREATE TABLE public.notification_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_reminders     BOOLEAN DEFAULT TRUE,
  fertile_window_alerts BOOLEAN DEFAULT TRUE,
  water_reminders      BOOLEAN DEFAULT FALSE,
  partner_updates      BOOLEAN DEFAULT TRUE,
  daily_checkins       BOOLEAN DEFAULT FALSE,
  reminder_time        TEXT DEFAULT '08:00',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own notification settings" ON public.notification_settings
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- 2. Add missing columns to daily_logs if they don't exist
ALTER TABLE public.daily_logs 
  ADD COLUMN IF NOT EXISTS mood TEXT,
  ADD COLUMN IF NOT EXISTS energy_level TEXT;

-- 3. Add updated_at to routines if missing
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Add media_url and media_type to chat_messages for WhatsApp style attachments
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 5. Insert default notification_settings for existing users who don't have one
INSERT INTO public.notification_settings (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.notification_settings)
ON CONFLICT DO NOTHING;

-- Done ✓
