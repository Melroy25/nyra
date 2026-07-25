-- ============================================================
-- NYRA 2.0 — Complete Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- 1. USERS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID UNIQUE,                      -- Supabase Auth user id
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',     -- 'user' | 'partner'
  age           INT,
  date_of_birth TEXT,
  cycle_length  INT DEFAULT 28,
  period_duration INT DEFAULT 5,
  goals         TEXT[] DEFAULT '{}',
  partner_code  TEXT UNIQUE,                      -- e.g. NYRA-82941
  connected_partner_id UUID REFERENCES public.users(id),
  avatar_url    TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 2. CYCLE LOGS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  is_period     BOOLEAN DEFAULT FALSE,
  is_predicted  BOOLEAN DEFAULT FALSE,
  is_ovulation  BOOLEAN DEFAULT FALSE,
  flow          TEXT,                             -- 'light' | 'medium' | 'heavy'
  symptoms      TEXT[] DEFAULT '{}',
  mood          TEXT,
  notes         TEXT,
  severity      INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ──────────────────────────────────────────────
-- 3. CHAT THREADS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  partner_id    UUID REFERENCES public.users(id),
  title         TEXT DEFAULT 'Private Chat',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 4. CHAT MESSAGES TABLE (Real-time partner chat)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id     UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES public.users(id),
  text          TEXT,
  sticker       TEXT,
  reaction      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 5. AI THREADS TABLE (Nyra AI + Partner AI)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_threads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'New Chat',
  ai_type       TEXT NOT NULL DEFAULT 'nyra',    -- 'nyra' | 'partner'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 6. AI MESSAGES TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id     UUID NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,                   -- 'user' | 'assistant'
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 7. ROUTINES TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.routines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  time          TEXT,
  frequency     TEXT DEFAULT 'daily',
  type          TEXT DEFAULT 'wellness',
  completed     BOOLEAN DEFAULT FALSE,
  amount        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 8. DAILY LOGS TABLE (water, mood quick-log)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  water_intake  INT DEFAULT 0,
  water_goal    INT DEFAULT 2000,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ──────────────────────────────────────────────
-- 9. NOTIFICATION SETTINGS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period         BOOLEAN DEFAULT TRUE,
  ovulation      BOOLEAN DEFAULT TRUE,
  water          BOOLEAN DEFAULT FALSE,
  medication     BOOLEAN DEFAULT TRUE,
  self_care      BOOLEAN DEFAULT FALSE,
  insights       BOOLEAN DEFAULT TRUE,
  messages       BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────
-- RLS POLICIES
-- ──────────────────────────────────────────────

-- Users: can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Partner can view the user they are connected to
CREATE POLICY "Partner can view connected user" ON public.users
  FOR SELECT USING (
    id IN (
      SELECT connected_partner_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Cycle logs: user can only see their own
CREATE POLICY "Users manage own cycle logs" ON public.cycle_logs
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Partner can view connected user's cycle logs (for partner dashboard)
CREATE POLICY "Partner can view connected cycle logs" ON public.cycle_logs
  FOR SELECT USING (
    user_id IN (
      SELECT connected_partner_id FROM public.users
      WHERE auth_id = auth.uid()
    )
  );

-- Chat messages: sender or participant can read/write
CREATE POLICY "Chat participants can manage messages" ON public.chat_messages
  FOR ALL USING (
    thread_id IN (
      SELECT ct.id FROM public.chat_threads ct
      JOIN public.users u ON (ct.user_id = u.id OR ct.partner_id = u.id)
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Chat participants can view threads" ON public.chat_threads
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR
    partner_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- AI threads/messages: only owner
CREATE POLICY "Users manage own AI threads" ON public.ai_threads
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users manage own AI messages" ON public.ai_messages
  FOR ALL USING (
    thread_id IN (
      SELECT id FROM public.ai_threads
      WHERE user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- Routines: own only
CREATE POLICY "Users manage own routines" ON public.routines
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Daily logs: own only
CREATE POLICY "Users manage own daily logs" ON public.daily_logs
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Notification settings: own only
CREATE POLICY "Users manage own notification settings" ON public.notification_settings
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ──────────────────────────────────────────────
-- ENABLE REALTIME for chat_messages
-- ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;

-- ──────────────────────────────────────────────
-- INDEXES for performance
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_date ON public.cycle_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON public.ai_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_routines_user ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, date DESC);
