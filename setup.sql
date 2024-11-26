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
        p.policyname::text,
        p.tablename::text,
        p.cmd::text,
        p.qual::text
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
        p.proname::text,
        n.nspname::text,
        l.lanname::text,
        pg_get_functiondef(p.oid)::text,
        pg_get_function_arguments(p.oid)::text
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'extensions')
    AND p.prokind = 'f'  -- Only normal functions, exclude aggregates
    AND p.proowner = (SELECT usesysid FROM pg_user WHERE usename = current_user)  -- Only user-created functions
    ORDER BY n.nspname, p.proname;
END;
$$;

-- Function to get all triggers
CREATE OR REPLACE FUNCTION public.get_triggers()
RETURNS TABLE (
    name text,
    table_name text,
    event text,
    timing text,
    definition text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tgname::text,
        c.relname::text,
        CASE 
            WHEN t.tgtype & 1 = 1 THEN 'ROW'
            ELSE 'STATEMENT'
        END::text,
        CASE 
            WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
            WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
            ELSE 'AFTER'
        END::text,
        pg_get_triggerdef(t.oid)::text
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE NOT t.tgisinternal
    AND n.nspname NOT IN ('pgsodium','storage','realtime','vault')
    ORDER BY c.relname, t.tgname;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_triggers() TO authenticated;