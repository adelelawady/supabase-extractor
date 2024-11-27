import { Card } from "./ui/card";
import { CodeBlock } from "./CodeBlock";

export function SetupInstructions() {
  return (
    <Card className="p-6 mb-8 animate-fade-in">
      <h2 className="text-2xl font-semibold mb-6 text-primary">Setup Instructions</h2>
      <div className="space-y-6">
        <p className="text-gray-600">
          Before using the extractor, you need to set up the required database functions. Follow one of these options:
        </p>
        
        <div className="space-y-4 border-l-4 border-secondary pl-4">
          <h3 className="font-medium text-lg">Option 1: Automatic Setup</h3>
          <p className="text-gray-600">
            Enter your credentials below and click "Run Setup SQL" to automatically set up the required functions.
          </p>
        </div>

        <div className="space-y-4 border-l-4 border-secondary pl-4">
          <h3 className="font-medium text-lg">Option 2: Manual Setup</h3>
          <p className="text-gray-600">
            Run the following SQL in your Supabase SQL editor:
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
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-medium text-yellow-800">⚠️ Security Note</h3>
          <p className="text-sm text-yellow-700 mt-1">
            For security reasons, remember to remove the setup functions after extracting your data.
          </p>
        </div>
      </div>
    </Card>
  );
}