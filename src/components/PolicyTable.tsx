import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Policy } from '@/types/supabase';

interface PolicyTableProps {
  policies: Policy[];
}

export function PolicyTable({ policies }: PolicyTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Table</TableHead>
          <TableHead>Command</TableHead>
          <TableHead>Definition</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {policies.map((policy, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{policy.name}</TableCell>
            <TableCell>{policy.table_name}</TableCell>
            <TableCell>{policy.command}</TableCell>
            <TableCell className="font-mono text-sm">{policy.definition}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}