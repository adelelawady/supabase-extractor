import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useState } from "react";

interface CredentialsFormProps {
  onSetup: (url: string, key: string) => Promise<void>;
  onExtract: (url: string, key: string) => Promise<void>;
  loading: boolean;
}

export function CredentialsForm({ onSetup, onExtract, loading }: CredentialsFormProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const handleSetup = () => onSetup(url, key);
  const handleExtract = () => onExtract(url, key);

  return (
    <Card className="p-6 mb-8 animate-fade-in">
      <h2 className="text-2xl font-semibold mb-6 text-primary">Credentials</h2>
      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supabase URL
          </label>
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full transition-all duration-200 focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="your-api-key"
            className="w-full transition-all duration-200 focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div className="flex gap-4 pt-2">
          <Button
            onClick={handleSetup}
            disabled={loading}
            variant="outline"
            className="flex-1 hover:bg-secondary hover:text-white transition-colors"
          >
            {loading ? "Setting up..." : "Run Setup SQL"}
          </Button>
          <Button
            onClick={handleExtract}
            disabled={loading}
            className="flex-1 bg-secondary hover:bg-secondary/90 transition-colors"
          >
            {loading ? "Extracting..." : "Extract Data"}
          </Button>
        </div>
      </div>
    </Card>
  );
}