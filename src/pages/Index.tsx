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

export default function Index() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const { toast } = useToast();

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
      
      if (policiesError) throw policiesError;

      // Extract functions
      const { data: functions, error: functionsError } = await supabase
        .rpc('get_functions');
      
      if (functionsError) throw functionsError;

      setData({ policies, functions });
      toast({
        title: "Success",
        description: "Successfully extracted database information",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const sqlContent = generateSQLScript(data);
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Supabase Extractor
          </h1>
          <p className="text-gray-600">
            Extract and export your Supabase database policies and functions
          </p>
        </div>

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

        {data && (
          <div className="space-y-4">
            <div className="flex justify-end">
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
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function generateSQLScript(data: ExtractedData): string {
  let script = '-- Supabase Export\n\n';
  
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
    script += `CREATE OR REPLACE FUNCTION ${func.schema}.${func.name}(${func.arguments})\n`;
    script += `RETURNS ${func.definition.split('RETURNS ')[1].split('\n')[0]}\n`;
    script += `LANGUAGE ${func.language}\n`;
    script += `AS $$\n${func.definition}$$;\n\n`;
  });
  
  return script;
}