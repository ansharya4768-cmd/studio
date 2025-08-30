"use client";

import { Copy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

export interface WalletCardInfo {
  name: string;
  symbol: string;
  address: string;
  balance: string;
  icon: React.ReactNode;
  loading: boolean;
  hasBalance?: boolean;
}

export default function WalletCard({ name, symbol, address, balance, icon, loading, hasBalance }: Partial<WalletCardInfo>) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Copied!',
        description: `${name} address copied to clipboard.`,
      });
    }
  };

  if (!address) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
           <Skeleton className="h-6 w-24" />
           <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col transition-colors", hasBalance && "bg-green-100/50 border-green-500/50")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium font-headline">{name}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div>
          <div className={cn("text-2xl font-bold flex items-center gap-2", hasBalance ? "text-green-600" : "text-primary")}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : balance}
            {!loading && <span className="text-sm text-muted-foreground">{symbol}</span>}
          </div>
          <CardDescription className="text-xs break-all mt-2">{address}</CardDescription>
        </div>
        <div className="mt-4">
          <Separator className="mb-4"/>
          <Button variant="ghost" size="sm" className="w-full" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
