-- Migration: Crear tabla de Memoria de Largo Plazo del Agente
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS agent_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  fact text not null,
  source text default 'agent',
  relevance integer default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can fully manage their own data" ON agent_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Índice para búsquedas rápidas por usuario y categoría
CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_category ON agent_memory(user_id, category);
