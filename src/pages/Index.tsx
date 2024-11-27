import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ExtractedData } from '@/types/supabase';
import { Header } from '@/components/Header';
import { SetupInstructions } from '@/components/SetupInstructions';
import { CredentialsForm } from '@/components/CredentialsForm';
import { ResultsTabs } from '@/components/ResultsTabs';
import { Footer } from "@/components/ui/footer";

export default function Index() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [includeDropPolicy, setIncludeDropPolicy] = useState(false);
  const { toast } = useToast();

  // Function to generate setup SQL
  const generateSetupSQL = () => {
    const excludedFunctionSchemasStr = excludedFunctionSchemas.map(schema => `'${schema}'`).join(',');
    const excludedTriggerSchemasStr = excludedTriggerSchemas.map(schema => `'${schema}'`).join(',');
    return `
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
    WHERE n.nspname NOT IN (${excludedFunctionSchemasStr})
    AND p.prokind = 'f'
    AND p.proowner = (SELECT usesysid FROM pg_user WHERE usename = current_user)
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
    AND n.nspname NOT IN (${excludedTriggerSchemasStr})
    ORDER BY c.relname, t.tgname;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_triggers() TO authenticated;
    `;

  };

  // Function to run setup SQL
  const handleRunSetup = async () => {
    if (!url || !key) {
      toast({
        title: "Missing credentials",
        description: "Please provide both URL and API key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseClient(url, key);
      const setupSQL = generateSetupSQL();
      
      // Execute the setup SQL
      const { error } = await supabase.rpc('exec_sql', { sql: setupSQL });
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Setup SQL executed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute setup SQL",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!url || !key) {
      toast({
        title: "Missing credentials",
        description: "Please provide both URL and API key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseClient(url, key);
      
      // Extract policies
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies');
      
      if (policiesError) {
        if (policiesError.message.includes('function get_policies() does not exist')) {
          throw new Error('Setup required: get_policies() function not found. Please run the setup SQL first.');
        }
        throw policiesError;
      }

      // Extract functions
      const { data: functions, error: functionsError } = await supabase
        .rpc('get_functions');
      
      if (functionsError) {
        if (functionsError.message.includes('function get_functions() does not exist')) {
          throw new Error('Setup required: get_functions() function not found. Please run the setup SQL first.');
        }
        throw functionsError;
      }

      // Extract triggers
      const { data: triggers, error: triggersError } = await supabase
        .rpc('get_triggers');
      
      if (triggersError) {
        if (triggersError.message.includes('function get_triggers() does not exist')) {
          throw new Error('Setup required: get_triggers() function not found. Please run the setup SQL first.');
        }
        throw triggersError;
      }

      // Validate data structure
      if (!Array.isArray(policies) || !Array.isArray(functions) || !Array.isArray(triggers)) {
        throw new Error('Invalid data structure received from the database');
      }

      // Check if we have permission to access the data
      if (policies === null || functions === null || triggers === null) {
        throw new Error('Permission denied: Unable to access database functions. Please check your API key permissions.');
      }

      setData({ policies, functions, triggers });
      toast({
        title: "Success",
        description: "Successfully extracted database information",
      });
    } catch (error) {
      let errorMessage = 'Failed to extract data';
      let errorTitle = 'Error';

      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('Setup required')) {
          errorTitle = 'Setup Required';
          errorMessage = error.message;
        } else if (error.message.includes('Permission denied')) {
          errorTitle = 'Permission Error';
          errorMessage = error.message;
        } else if (error.message.includes('Invalid database URL')) {
          errorTitle = 'Connection Error';
          errorMessage = 'Invalid Supabase URL. Please check your project URL.';
        } else if (error.message.includes('JWT')) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Invalid API key. Please check your credentials.';
        } else if (error.message.includes('timeout')) {
          errorTitle = 'Connection Timeout';
          errorMessage = 'Connection to database timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000, // Show error messages longer
      });

      // Clear data if there was an error
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const sqlContent = generateSQLScript(data, includeDropPolicy);
    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supabase_export.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Header />
          <SetupInstructions />
          <CredentialsForm
            onSetup={handleRunSetup}
            onExtract={handleExtract}
            loading={loading}
          />
          {data && (
            <ResultsTabs
              data={data}
              includeDropPolicy={includeDropPolicy}
              onExport={handleExport}
              onToggleDropPolicy={setIncludeDropPolicy}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

function generateSQLScript(data: ExtractedData, includeDropPolicy: boolean = false): string {
  let script = '-- Supabase Export\n\n';
  
  // Add DROP POLICY statements if enabled
  if (includeDropPolicy) {
    script += '-- Drop existing policies\n';
    data.policies.forEach(policy => {
      script += `DROP POLICY IF EXISTS "${policy.name}" ON ${policy.table_name};\n`;
    });
    script += '\n';
  }
  
  // Add policies
  script += '-- Policies\n';
  data.policies.forEach(policy => {
    script += `CREATE POLICY "${policy.name}" ON ${policy.table_name}\n`;
    script += `  FOR ${policy.command}\n`;
    script += `  USING (${policy.definition});\n\n`;
  });
  
  // Add functions
  script += '-- Functions\n';
  data.functions.forEach(func => {
    script += `${func.definition}\n\n`;
  });

  // Add triggers
  script += '-- Triggers\n';
  data.triggers.forEach(trigger => {
    script += `${trigger.definition};\n\n`;
  });
  
  return script;
}
