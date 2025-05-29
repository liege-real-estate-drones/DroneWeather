"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound } from 'lucide-react';

interface ApiKeyInputProps {
  apiKey: string | null;
  onApiKeyChange: (key: string) => void;
}

export default function ApiKeyInput({ apiKey, onApiKeyChange }: ApiKeyInputProps) {
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');

  useEffect(() => {
    setLocalApiKey(apiKey || '');
  }, [apiKey]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApiKeyChange(localApiKey);
  };

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <KeyRound className="text-primary" />
          Meteosource API Key
        </CardTitle>
        <CardDescription>
          Enter your Meteosource API key to fetch weather data. You can get a free key from{' '}
          <a href="https://www.meteosource.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            meteosource.com
          </a>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-grow">
            <Label htmlFor="apiKey" className="sr-only">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="Enter your Meteosource API key"
              className="text-base"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto">Save Key</Button>
        </form>
      </CardContent>
    </Card>
  );
}
