-- Function to get all policies
CREATE OR REPLACE FUNCTION public.get_policies()
RETURNS TABLE (
    name text,
    table_name text,
    command text,
    definition text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.policyname as name,
        p.tablename as table_name,
        p.cmd as command,
        p.qual as definition
    FROM pg_policies p
    ORDER BY p.tablename, p.policyname;
END;
$$;

-- Function to get all functions
CREATE OR REPLACE FUNCTION public.get_functions()
RETURNS TABLE (
    name text,
    schema text,
    language text,
    definition text,
    arguments text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.proname as name,
        n.nspname as schema,
        l.lanname as language,
        pg_get_functiondef(p.oid) as definition,
        pg_get_function_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY n.nspname, p.proname;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_functions() TO authenticated;