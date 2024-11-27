import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { PolicyTable } from "./PolicyTable";
import { CodeBlock } from "./CodeBlock";
import { ExtractedData } from "@/types/supabase";

interface ResultsTabsProps {
  data: ExtractedData;
  includeDropPolicy: boolean;
  onExport: () => void;
  onToggleDropPolicy: (value: boolean) => void;
}

export function ResultsTabs({ data, includeDropPolicy, onExport, onToggleDropPolicy }: ResultsTabsProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="dropPolicy"
            checked={includeDropPolicy}
            onChange={(e) => onToggleDropPolicy(e.target.checked)}
            className="rounded border-gray-300 text-secondary focus:ring-secondary"
          />
          <label htmlFor="dropPolicy" className="text-sm text-gray-600">
            Include DROP POLICY statements
          </label>
        </div>
        <Button onClick={onExport} variant="outline" className="hover:bg-secondary hover:text-white transition-colors">
          Export SQL
        </Button>
      </div>
      
      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="w-full grid grid-cols-3 gap-4">
          <TabsTrigger value="policies" className="data-[state=active]:bg-secondary data-[state=active]:text-white">
            Policies ({data.policies.length})
          </TabsTrigger>
          <TabsTrigger value="functions" className="data-[state=active]:bg-secondary data-[state=active]:text-white">
            Functions ({data.functions.length})
          </TabsTrigger>
          <TabsTrigger value="triggers" className="data-[state=active]:bg-secondary data-[state=active]:text-white">
            Triggers ({data.triggers.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="policies" className="mt-6">
          <PolicyTable policies={data.policies} />
        </TabsContent>
        <TabsContent value="functions" className="mt-6">
          <div className="space-y-4">
            {data.functions.map((func, index) => (
              <CodeBlock
                key={index}
                title={`${func.name} (${func.schema})`}
                code={func.definition}
                language="sql"
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="triggers" className="mt-6">
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
  );
}