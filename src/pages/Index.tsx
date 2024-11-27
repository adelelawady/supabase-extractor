import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ExtractedData } from '@/types/supabase';
import { Header } from '@/components/Header';
import { SetupInstructions } from '@/components/SetupInstructions';
import { CredentialsForm } from '@/components/CredentialsForm';
import { ResultsTabs } from '@/components/ResultsTabs';
import { Footer } from "@/components/ui/footer";
import { useSetupSQL } from '@/hooks/useSetupSQL';

export default function Index() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [includeDropPolicy, setIncludeDropPolicy] = useState(false);
  const { toast } = useToast();
  const { generateSetupSQL } = useSetupSQL();

  // Function to run setup SQL
  const handleRunSetup = async (url: string, key: string) => {
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

  const handleExtract = async (url: string, key: string) => {
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
      
      if (policiesError) throw policiesError;

      // Extract functions
      const { data: functions, error: functionsError } = await supabase
        .rpc('get_functions');
      
      if (functionsError) throw functionsError;

      // Extract triggers
      const { data: triggers, error: triggersError } = await supabase
        .rpc('get_triggers');
      
      if (triggersError) throw triggersError;

      setData({ policies, functions, triggers });
      toast({
        title: "Success",
        description: "Successfully extracted database information",
      });
    } catch (error) {
      let errorMessage = 'Failed to extract data';
      let errorTitle = 'Error';

      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('Setup required')) {
          errorTitle = 'Setup Required';
        } else if (error.message.includes('Permission denied')) {
          errorTitle = 'Permission Error';
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });

      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    const script = generateSQLScript(data, includeDropPolicy);
    // Here you could add logic to download or copy the script
    console.log(script);
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