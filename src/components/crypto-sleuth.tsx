"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { quickCheck, checkAllBalances, getInsights } from '@/app/actions';
import { generateSeedPhrase, deriveAllWallets, type DerivedWallets } from '@/lib/crypto-derivation';
import { encryptAndSave } from '@/lib/encryption';
import WalletCard, { type WalletCardInfo } from '@/components/wallet-card';
import { AdaIcon, BscIcon, BtcIcon, EthIcon, SolIcon } from './icons';

const formSchema = z.object({
  partialSeed: z.string().optional(),
  wordCount: z.enum(['12', '24']),
});

type FormData = z.infer<typeof formSchema>;

type ResultState = {
  seedPhrase: string;
  wallets: DerivedWallets;
  balances: Record<string, string>;
  explanation: string;
  summary: string;
} | null;

export default function CryptoSleuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultState>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingInsights, setIsGettingInsights] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { toast } = useToast();
  
  const searchRef = useRef<boolean>(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partialSeed: '',
      wordCount: '12',
    },
  });

  const stopSearching = useCallback(() => {
    searchRef.current = false;
    setIsSearching(false);
  }, []);

  const runSearch = useCallback(async (data: FormData) => {
    searchRef.current = true;
    setIsSearching(true);
    setIsLoading(true);
    setResult(null);
    let currentAttempts = 0;

    while (searchRef.current) {
      currentAttempts++;
      setAttempts(currentAttempts);

      try {
        const seedPhrase = generateSeedPhrase(data.partialSeed || '', parseInt(data.wordCount, 10));
        if (!seedPhrase) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not generate a valid seed phrase. Please check your partial input.',
          });
          stopSearching();
          return;
        }

        const wallets = await deriveAllWallets(seedPhrase);
        const { ethBalance } = await quickCheck({
          ethereum: wallets.ethereum.address,
          bitcoin: wallets.bitcoin.address,
          solana: wallets.solana.address,
          bsc: wallets.bsc.address,
          cardano: wallets.cardano.address,
        });
        
        const hasBalance = parseFloat(ethBalance) > 0;
        
        const partialBalances = { ethBalance, btcBalance: '...', solBalance: '...', bscBalance: '...', adaBalance: '...' };
        setResult({ seedPhrase, wallets, balances: partialBalances, explanation: '', summary: '' });

        if (hasBalance) {
          stopSearching();
          setIsCheckingAll(true);
          toast({
            title: 'Potential Wallet Found!',
            description: `An Ethereum address with a balance was found after ${currentAttempts} attempts. Verifying all balances...`,
          });
          
          const allBalances = await checkAllBalances({
            ethereum: wallets.ethereum.address,
            bitcoin: wallets.bitcoin.address,
            solana: wallets.solana.address,
            bsc: wallets.bsc.address,
            cardano: wallets.cardano.address,
          });

          setResult(prev => prev ? ({ ...prev, balances: allBalances }) : null);
          setIsCheckingAll(false);
          setIsLoading(false);

          toast({
            title: 'Wallet Confirmed!',
            description: 'Full balances confirmed. Now fetching AI insights...',
          });

          setIsGettingInsights(true);
          const { explanation, summary } = await getInsights({
            ethereum: wallets.ethereum.address,
            bitcoin: wallets.bitcoin.address,
            solana: wallets.solana.address,
            bsc: wallets.bsc.address,
            cardano: wallets.cardano.address,
          }, allBalances);
          setResult(prev => prev ? ({ ...prev, explanation, summary }) : null);
          setIsGettingInsights(false);
        }
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
          variant: 'destructive',
          title: 'Search Failed',
          description: errorMessage,
        });
        stopSearching();
        return;
      }
    }
    setIsLoading(false);
  }, [toast, stopSearching]);

  useEffect(() => {
    // Cleanup ref on unmount
    return () => {
      searchRef.current = false;
    };
  }, []);
  
  const handleSave = async () => {
    if (!result) return;
    try {
      await encryptAndSave(result);
      toast({
        title: 'Saved Successfully',
        description: 'Your wallet data has been securely saved in your browser.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save wallet data.',
      });
    }
  };
  
  const hasAnyBalance = result && Object.values(result.balances).some(bal => parseFloat(bal) > 0);

  const walletData: WalletCardInfo[] = result ? [
    { name: 'Ethereum', symbol: 'ETH', address: result.wallets.ethereum.address, balance: result.balances.ethBalance, icon: <EthIcon className="h-8 w-8" />, loading: (isLoading || isCheckingAll) && !result, hasBalance: parseFloat(result.balances.ethBalance || '0') > 0 },
    { name: 'Bitcoin', symbol: 'BTC', address: result.wallets.bitcoin.address, balance: result.balances.btcBalance, icon: <BtcIcon className="h-8 w-8" />, loading: (isLoading || isCheckingAll) && result?.balances.btcBalance === '...', hasBalance: parseFloat(result.balances.btcBalance || '0') > 0 },
    { name: 'Solana', symbol: 'SOL', address: result.wallets.solana.address, balance: result.balances.solBalance, icon: <SolIcon className="h-8 w-8" />, loading: (isLoading || isCheckingAll) && result?.balances.solBalance === '...', hasBalance: parseFloat(result.balances.solBalance || '0') > 0 },
    { name: 'BNB Smart Chain', symbol: 'BNB', address: result.wallets.bsc.address, balance: result.balances.bscBalance, icon: <BscIcon className="h-8 w-8" />, loading: (isLoading || isCheckingAll) && result?.balances.bscBalance === '...', hasBalance: parseFloat(result.balances.bscBalance || '0') > 0 },
    { name: 'Cardano', symbol: 'ADA', address: result.wallets.cardano.address, balance: result.balances.adaBalance, icon: <AdaIcon className="h-8 w-8" />, loading: (isLoading || isCheckingAll) && result?.balances.adaBalance === '...', hasBalance: parseFloat(result.balances.adaBalance || '0') > 0 },
  ] : Array(5).fill({ loading: isSearching });


  return (
    <Card className="w-full shadow-lg">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(runSearch)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="partialSeed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partial Seed Phrase (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., apple banana ..." {...field} disabled={isSearching} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="wordCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Word Count</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSearching}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select word count" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="12">12 words</SelectItem>
                        <SelectItem value="24">24 words</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-4">
              {!isSearching && (
                <Button type="submit" className="w-full md:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Start Searching
                </Button>
              )}
              {isSearching && (
                <Button variant="destructive" className="w-full md:w-auto" onClick={stopSearching}>
                  <X className="mr-2 h-4 w-4" />
                  Stop Searching
                </Button>
              )}
            </div>
          </form>
        </Form>
        
        {(isSearching || result) && <Separator className="my-8" />}

        {isSearching && (
          <div className="text-center text-lg font-semibold flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Searching... (Attempt: {attempts})
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <Card className={cn("transition-colors", hasAnyBalance ? "bg-green-100/50 border-green-500/50" : "bg-primary/5 border-primary/20")}>
              <CardHeader>
                <CardTitle className="font-headline text-lg">
                  {isSearching ? 'Last Checked Seed Phrase' : (hasAnyBalance ? 'Found Seed Phrase' : 'Generated Seed Phrase')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-center text-lg p-4 bg-background rounded-md">{result.seedPhrase}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {walletData.map((wallet, index) => (
                <WalletCard key={index} {...wallet} />
              ))}
            </div>

            {hasAnyBalance && (
              <div className="flex justify-center">
                <Button onClick={handleSave} size="lg">
                  <Save className="mr-2 h-4 w-4" /> Securely Save Found Wallet
                </Button>
              </div>
            )}
            
            {(result.explanation || result.summary || isGettingInsights) && (
              <Accordion type="single" collapsible className="w-full" defaultValue="explanation">
                <AccordionItem value="explanation">
                  <AccordionTrigger className='font-headline text-lg'>AI Wallet Explanation</AccordionTrigger>
                  <AccordionContent className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                    {isGettingInsights && !result.explanation && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Generating...</div>}
                    {result.explanation}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="summary">
                  <AccordionTrigger className='font-headline text-lg'>AI Investment Insights</AccordionTrigger>
                  <AccordionContent className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                    {isGettingInsights && !result.summary && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Generating...</div>}
                    {result.summary}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
