-- Activar extensión para generar UUIDs seguros
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Eliminar tablas si existen (para empezar limpio)
DROP TABLE IF EXISTS agent_conversations CASCADE;
DROP TABLE IF EXISTS user_xp CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS sleep_logs CASCADE;
DROP TABLE IF EXISTS cardio_sessions CASCADE;
DROP TABLE IF EXISTS water_logs CASCADE;
DROP TABLE IF EXISTS food_logs CASCADE;
DROP TABLE IF EXISTS diet_plans CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS users_profile CASCADE;

-- 1. Perfil del Usuario
CREATE TABLE users_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  name text,
  age integer,
  gender text,
  weight_kg numeric,
  height_cm numeric,
  goal text,
  goal_secondary text,
  equipment text,
  diet_type text,
  injuries text,
  diseases text,
  intensity text,
  training_days integer,
  food_restrictions text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Rutinas
CREATE TABLE routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  day_of_week text,
  is_rest_day boolean default false,
  exercises jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 3. Planes de Dieta Base
CREATE TABLE diet_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  meal_type text,
  foods jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 4. Registro Diario de Alimentos (Consumidos)
CREATE TABLE food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date default current_date,
  meal_type text,
  food_name text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  quantity numeric,
  unit text,
  created_at timestamptz default now()
);

-- 5. Registro de Agua
CREATE TABLE water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date default current_date,
  amount_ml numeric default 0,
  created_at timestamptz default now()
);

-- 6. Sesiones de Cardio
CREATE TABLE cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date default current_date,
  activity text,
  duration_min numeric,
  distance_km numeric,
  intensity_level integer,
  ai_feedback text,
  created_at timestamptz default now()
);

-- 7. Registro de Sueño
CREATE TABLE sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date default current_date,
  sleep_time time,
  wake_time time,
  hours_slept numeric,
  ai_feedback text,
  created_at timestamptz default now()
);

-- 8. Logros Desbloqueados
CREATE TABLE achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  achievement_key text,
  unlocked_at timestamptz default now()
);

-- 9. Experiencia (XP) y Nivel
CREATE TABLE user_xp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  total_xp integer default 0,
  level integer default 1,
  updated_at timestamptz default now()
);

-- 10. Historial de Conversaciones del Agente
CREATE TABLE agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text,
  content text,
  tool_used text,
  change_applied boolean default false,
  created_at timestamptz default now()
);

-- ==========================================
-- POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Crear política genérica para permitir a los usuarios acceder SOLO a sus propios datos
CREATE POLICY "Users can fully manage their own data" ON users_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON routines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON diet_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON food_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON water_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON cardio_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON sleep_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON user_xp
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own data" ON agent_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
