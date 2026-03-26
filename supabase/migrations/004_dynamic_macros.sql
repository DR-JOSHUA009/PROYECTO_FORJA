-- Adding dynamic target macro columns to users_profile for dynamic synchronization
ALTER TABLE public.users_profile
ADD COLUMN IF NOT EXISTS target_calories int,
ADD COLUMN IF NOT EXISTS target_protein int,
ADD COLUMN IF NOT EXISTS target_carbs int,
ADD COLUMN IF NOT EXISTS target_fat int,
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
