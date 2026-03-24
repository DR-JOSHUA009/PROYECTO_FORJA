-- TABLA DEFINITIVA DE HISTORIAL DE ENTRENAMIENTOS
-- Sincronizada con el Master Schema (public.users)

CREATE TABLE IF NOT EXISTS public.workout_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  routine_name text,
  exercises_completed jsonb DEFAULT '[]'::jsonb,
  duration_min int,
  calories_burned float DEFAULT 0,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can fully manage their own logs" ON public.workout_logs;
CREATE POLICY "Users can fully manage their own logs" ON public.workout_logs FOR ALL USING (auth.uid() = user_id);
