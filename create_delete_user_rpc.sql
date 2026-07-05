CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleting from auth.users automatically cascades to public.usuarios
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
