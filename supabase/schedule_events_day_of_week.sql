-- Add day_of_week to schedule_events
-- 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
-- Existing events default to Monday (0).

ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS day_of_week integer NOT NULL DEFAULT 0;
