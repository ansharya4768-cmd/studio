
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <Image
        src="https://picsum.photos/1920/1080"
        alt="Hacking background"
        fill
        className="object-cover -z-20"
        data-ai-hint="hacker code"
      />
      <div className="absolute inset-0 bg-black/60 -z-10" />
      <Card className="mx-auto max-w-sm w-full shadow-2xl bg-black/30 backdrop-blur-lg border-primary/20 text-white">
        <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
                <div className="p-4 bg-primary/20 backdrop-blur-sm rounded-full border border-primary/30 shadow-lg">
                    <Wallet className="w-12 h-12 text-primary" />
                </div>
            </div>
          <CardTitle className="text-3xl font-bold font-headline text-primary">Login</CardTitle>
          <CardDescription className="text-gray-300">
            Enter your credentials to access your wallet dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key" className="text-gray-300">Key</Label>
              <Input
                id="key"
                type="password"
                placeholder="Enter your key"
                required
                className="bg-black/50 border-primary/50 text-white placeholder:text-gray-500 focus:border-primary"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                className="bg-black/50 border-primary/50 text-white placeholder:text-gray-500 focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full shadow-lg bg-gradient-to-br from-primary to-accent/80 hover:from-primary/90 hover:to-accent/70 text-white font-bold text-lg">
                Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
