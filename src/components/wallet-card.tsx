
"use client";

import { Copy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { type Blockchain } from '@/app/actions';
import { type WalletInfo } from '@/lib/crypto-derivation';

export interface WalletCardInfo {
  id: Blockchain;
  name: string;
  symbol: string;
  address: WalletInfo;
  balance: string;
  usdValue: string;
  icon: React.ReactNode;
  loading: boolean;
  hasBalance?: boolean;
}

export default function WalletCard({ name, symbol, address, balance, usdValue, icon, loading, hasBalance }: Partial<WalletCardInfo>) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address.address);
      toast({
        title: 'Copied!',
        description: `${name} address copied to clipboard.`,
      });
    }
  };

  if (loading || !address) {
    return (
      <Card className="bg-white/30 backdrop-blur-sm">
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
    <Card className={cn("flex flex-col transition-colors border-2 shadow-lg bg-white/30 backdrop-blur-xl", hasBalance ? "border-green-500" : "border-transparent")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium font-headline">{name}</CardTitle>
        <div className="p-1 bg-white/50 rounded-full">{icon}</div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div>
          <div className={cn("text-2xl font-bold flex items-center gap-2", hasBalance ? "text-green-600" : "text-primary")}>
            {balance === '...' ? <Loader2 className="h-6 w-6 animate-spin" /> : balance}
            {balance !== '...' && <span className="text-sm text-muted-foreground">{symbol}</span>}
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {usdValue === '...' ? <Loader2 className="h-4 w-4 animate-spin inline-block" /> : `$${usdValue || '0.00'} USDT`}
          </p>
          <CardDescription className="text-xs break-all mt-2">{address.address}</CardDescription>
        </div>
        <div className="mt-4">
          <Separator className="mb-4 bg-primary/10"/>
          <Button variant="ghost" size="sm" className="w-full text-primary/80 hover:text-primary hover:bg-primary/10" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
