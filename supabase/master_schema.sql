-- FORJA DEFINITIVE DATABASE SCHEMA
-- Execute this in the Supabase SQL Editor to ensure all features work.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PUBLIC USERS TABLE (Sync with Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = id);

-- 3. USER PROFILES
CREATE TABLE IF NOT EXISTS public.users_profile (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  full_name text,
  username text UNIQUE,
  age int,
  weight_kg float,
  height_cm float,
  gender text,
  goal text,
  intensity text,
  training_days int,
  equipment text,
  diet_type text,
  food_restrictions text,
  injuries text,
  diseases text,
  experience_level text,
  xp int DEFAULT 0,
  level int DEFAULT 1,
  onboarding_completed boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users_profile;
CREATE POLICY "Users can manage their own profile" ON public.users_profile FOR ALL USING (auth.uid() = user_id);

-- 4. ROUTINES
CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week text NOT NULL,
  exercises jsonb DEFAULT '[]',
  is_rest_day boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own routines" ON public.routines;
CREATE POLICY "Users can manage their own routines" ON public.routines FOR ALL USING (auth.uid() = user_id);

-- 5. DIET PLANS
CREATE TABLE IF NOT EXISTS public.diet_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  meal_type text NOT NULL,
  foods jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own diet" ON public.diet_plans;
CREATE POLICY "Users can manage their own diet" ON public.diet_plans FOR ALL USING (auth.uid() = user_id);

-- 6. WATER LOGS
CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  amount_ml int NOT NULL,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own water logs" ON public.water_logs;
CREATE POLICY "Users can manage their own water logs" ON public.water_logs FOR ALL USING (auth.uid() = user_id);

-- 7. CARDIO SESSIONS
CREATE TABLE IF NOT EXISTS public.cardio_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  activity text NOT NULL,
  duration_min int,
  distance_km float,
  intensity_level int,
  ai_feedback text,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own cardio" ON public.cardio_sessions;
CREATE POLICY "Users can manage their own cardio" ON public.cardio_sessions FOR ALL USING (auth.uid() = user_id);

-- 8. SLEEP LOGS
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  sleep_time text,
  wake_time text,
  hours_slept float NOT NULL,
  ai_feedback text,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sleep" ON public.sleep_logs;
CREATE POLICY "Users can manage their own sleep" ON public.sleep_logs FOR ALL USING (auth.uid() = user_id);

-- 9. AGENT CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  tool_used text,
  change_applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.agent_conversations;
CREATE POLICY "Users can view their own conversations" ON public.agent_conversations FOR ALL USING (auth.uid() = user_id);

-- 10. FOOD LOGS
CREATE TABLE IF NOT EXISTS public.food_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  calories float,
  protein float,
  carbs float,
  fats float,
  analyzed_by_ai boolean DEFAULT false,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own food logs" ON public.food_logs;
CREATE POLICY "Users can manage their own food logs" ON public.food_logs FOR ALL USING (auth.uid() = user_id);

-- 11. TRIGGERS FOR NEW USERS
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  
  -- Create empty profile
  INSERT INTO public.users_profile (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ language plpgsql security definer;

-- Re-apply trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
