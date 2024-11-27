import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Policy } from '@/types/supabase';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Info } from 'lucide-react';

interface PolicyTableProps {
  policies: Policy[];
}

export function PolicyTable({ policies }: PolicyTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/5">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Table</TableHead>
            <TableHead className="font-semibold">Command</TableHead>
            <TableHead className="font-semibold">Definition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.map((policy, index) => (
            <TableRow key={index} className="hover:bg-secondary/5 transition-colors">
              <TableCell className="font-medium">{policy.name}</TableCell>
              <TableCell>{policy.table_name}</TableCell>
              <TableCell>
                <HoverCard>
                  <HoverCardTrigger className="flex items-center gap-1 cursor-help">
                    {policy.command}
                    <Info className="h-4 w-4 text-gray-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">{policy.command} Policy</h4>
                      <p className="text-sm text-gray-500">
                        This policy controls {policy.command.toLowerCase()} operations on the {policy.table_name} table.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
              <TableCell className="font-mono text-sm max-w-md truncate">
                <HoverCard>
                  <HoverCardTrigger className="cursor-help">
                    {policy.definition}
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96">
                    <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      {policy.definition}
                    </pre>
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}