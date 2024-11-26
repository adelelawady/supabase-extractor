import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExtractedData } from '@/types/supabase';
import { CodeBlock } from '@/components/CodeBlock';
import { PolicyTable } from '@/components/PolicyTable';
import { Textarea } from '@/components/ui/textarea';
import { Footer } from "@/components/ui/footer";

// Default excluded schemas
const DEFAULT_EXCLUDED_SCHEMAS = ['pg_catalog', 'information_schema', 'extensions', 'pgsodium', 'storage', 'realtime', 'vault'];

export default function Index() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [excludedFunctionSchemas, setExcludedFunctionSchemas] = useState<string[]>(DEFAULT_EXCLUDED_SCHEMAS);
  const [excludedTriggerSchemas, setExcludedTriggerSchemas] = useState<string[]>(['pgsodium', 'storage', 'realtime', 'vault']);
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">
              Supabase Extractor
            </h1>
            <p className="text-gray-600">
              Extract and export your Supabase database policies, functions, and triggers
            </p>
          </div>

          {/* Setup Instructions Card */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Before using the extractor, you need to set up the required database functions. You have two options:
              </p>
              
              <div className="space-y-2">
                <h3 className="font-medium">Option 1: Run Setup SQL</h3>
                <p className="text-sm text-gray-600">
                  Enter your credentials below and click "Run Setup SQL" to automatically set up the required functions.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Option 2: Manual Setup</h3>
                <p className="text-sm text-gray-600">
                  Run the following SQL in your Supabase SQL editor first:
                </p>
                <CodeBlock
                  title="Required Setup SQL"
                  code={`-- Function to execute SQL
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;`}
                  language="sql"
                />
                <p className="text-sm text-gray-600">
                  Then run the setup SQL from the configuration below.
                </p>
              </div>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="font-medium text-yellow-800">⚠️ Important Security Note</h3>
              <p className="text-sm text-yellow-700 mt-1">
                For security reasons, remember to remove the setup functions after extracting your data. 
                You can find cleanup instructions in the section below.
              </p>
            </div>
            </div>
          </Card>

          {/* Setup Configuration Card */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Setup Configuration</h2>
            <div className="space-y-6">
              {/* Functions Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Functions Configuration</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excluded Function Schemas
                  </label>
                  <Textarea
                    value={excludedFunctionSchemas.join('\n')}
                    onChange={(e) => setExcludedFunctionSchemas(e.target.value.split('\n').filter(Boolean))}
                    placeholder="Enter schemas to exclude from functions (one per line)"
                    className="h-32"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    These schemas will be excluded from function extraction
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setExcludedFunctionSchemas(DEFAULT_EXCLUDED_SCHEMAS)}
                  className="w-full sm:w-auto"
                >
                  Reset Function Schemas
                </Button>
              </div>

              <div className="border-t border-gray-200" />

              {/* Triggers Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Triggers Configuration</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excluded Trigger Schemas
                  </label>
                  <Textarea
                    value={excludedTriggerSchemas.join('\n')}
                    onChange={(e) => setExcludedTriggerSchemas(e.target.value.split('\n').filter(Boolean))}
                    placeholder="Enter schemas to exclude from triggers (one per line)"
                    className="h-32"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    These schemas will be excluded from trigger extraction
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setExcludedTriggerSchemas(['pgsodium', 'storage', 'realtime', 'vault'])}
                  className="w-full sm:w-auto"
                >
                  Reset Trigger Schemas
                </Button>
              </div>

              <div className="border-t border-gray-200" />

              {/* Run Setup Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleRunSetup}
                  disabled={loading}
                >
                  {loading ? "Running Setup..." : "Run Setup SQL"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Credentials Card */}
          <Card className="p-6 mb-8">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supabase URL
                </label>
                <Input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <Input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="your-api-key"
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleExtract}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Extracting..." : "Extract Data"}
              </Button>
            </div>
          </Card>

          {/* Results Section */}
          {data && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dropPolicy"
                    checked={includeDropPolicy}
                    onChange={(e) => setIncludeDropPolicy(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="dropPolicy" className="text-sm text-gray-600">
                    Include DROP POLICY statements
                  </label>
                </div>
                <Button onClick={handleExport} variant="outline">
                  Export SQL
                </Button>
              </div>
              
              <Tabs defaultValue="policies" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="policies" className="flex-1">
                    Policies ({data.policies.length})
                  </TabsTrigger>
                  <TabsTrigger value="functions" className="flex-1">
                    Functions ({data.functions.length})
                  </TabsTrigger>
                  <TabsTrigger value="triggers" className="flex-1">
                    Triggers ({data.triggers.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="policies">
                  <PolicyTable policies={data.policies} />
                </TabsContent>
                <TabsContent value="functions">
                  <div className="space-y-4">
                    {data.functions.map((func, index) => (
                      <CodeBlock
                        key={index}
                        title={func.name}
                        code={func.definition}
                        language="sql"
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="triggers">
                  <div className="space-y-4">
                    {data.triggers.map((trigger, index) => (
                      <CodeBlock
                        key={index}
                        title={`${trigger.name} (${trigger.table_name})`}
                        code={trigger.definition}
                        language="sql"
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
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