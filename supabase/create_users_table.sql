-- Tabla pública de usuarios (sincronizada con auth.users)
CREATE TABLE public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Los usuarios pueden leer su propia fila" ON public.users FOR SELECT USING (auth.uid() = id);
-- Nota: Para paneles de administración, puedes necesitar una política de SELECT para el admin.

-- Función para insertar automáticamente un usuario cuando se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger que ejecuta la función cada vez que se inserta en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
