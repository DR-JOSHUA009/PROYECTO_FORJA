-- Tabla para registrar entrenamientos completados
CREATE TABLE IF NOT EXISTS workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  routine_name text,
  exercises_completed jsonb default '[]'::jsonb,
  duration_min integer,
  calories_burned numeric,
  date date default current_date,
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can fully manage their own logs" ON workout_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
