
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (key === 'VickyVivek@7903788598' && password === 'Vicky@4518') {
      router.push('/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid key or password.",
      });
    }
  };

  return (
    <main className="relative container mx-auto flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-background to-accent/10 -z-10"></div>
      <Card className="mx-auto max-w-sm w-full shadow-2xl bg-white/30 backdrop-blur-xl border border-primary/20">
        <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
                <div className="flex items-center gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-full border border-primary/10 shadow-lg">
                    <Wallet className="w-10 h-10 text-primary" />
                </div>
            </div>
          <CardTitle className="text-3xl font-bold font-headline">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your wallet dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                type="password"
                placeholder="Enter your key"
                required
                className="bg-white/50"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required  
                className="bg-white/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full shadow-lg bg-gradient-to-br from-primary to-accent/80 hover:from-primary/90 hover:to-accent/70 text-white">
                Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
