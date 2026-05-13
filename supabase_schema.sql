-- SQL to create the necessary tables in Supabase

-- Tables
CREATE TABLE IF NOT EXISTS public.calls (
    id TEXT PRIMARY KEY, -- The uniqueid from Telephony API
    timestamp TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL,
    consultant_name TEXT NOT NULL,
    team TEXT NOT NULL,
    extension TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Ativa' | 'Receptiva'
    status TEXT NOT NULL, -- 'Atendida' | 'Perdida'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON public.calls (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calls_team ON public.calls (team);
CREATE INDEX IF NOT EXISTS idx_calls_consultant ON public.calls (consultant_name);

-- RLS (Row Level Security) - Basic setup (Enable for public read if needed, or secure via API)
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Policy for shared read access (adjust based on your auth requirements)
CREATE POLICY "Enable read access for all users" ON public.calls
    FOR SELECT USING (true);
