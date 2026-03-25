-- ACHIEVEMENTS TABLE
-- Execute this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own achievements" ON public.achievements;
CREATE POLICY "Users can manage their own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);
