import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CodeBlockProps {
  title: string;
  code: string;
  language: string;
}

export function CodeBlock({ title, code, language }: CodeBlockProps) {
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    toast({
      title: "Copied to clipboard",
      description: "Code has been copied to your clipboard",
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-primary text-primary-foreground">
        <h3 className="font-medium">{title}</h3>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <pre className="p-4 bg-gray-900 text-gray-100 overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </Card>
  );
}