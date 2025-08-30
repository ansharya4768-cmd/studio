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

import { checkBalancesAndGetInsights } from '@/app/actions';
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
    setIsLoading(false);
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
        const { balances, explanation, summary } = await checkBalancesAndGetInsights({
          ethereum: wallets.ethereum.address,
          bitcoin: wallets.bitcoin.address,
          solana: wallets.solana.address,
          bsc: wallets.bsc.address,
          cardano: wallets.cardano.address,
        });
        
        const hasBalance = Object.values(balances).some(bal => parseFloat(bal) > 0);

        // Always update the result to show the latest attempt
        setResult({ seedPhrase, wallets, balances, explanation, summary });

        if (hasBalance) {
          toast({
            title: 'Wallet Found!',
            description: `A wallet with a balance was found after ${currentAttempts} attempts.`,
          });
          stopSearching();
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
  
  const hasBalance = result && Object.values(result.balances).some(bal => parseFloat(bal) > 0);

  const walletData: WalletCardInfo[] = result ? [
    { name: 'Ethereum', symbol: 'ETH', address: result.wallets.ethereum.address, balance: result.balances.ethBalance, icon: <EthIcon className="h-8 w-8" />, loading: isLoading && !result },
    { name: 'Bitcoin', symbol: 'BTC', address: result.wallets.bitcoin.address, balance: result.balances.btcBalance, icon: <BtcIcon className="h-8 w-8" />, loading: isLoading && !result },
    { name: 'Solana', symbol: 'SOL', address: result.wallets.solana.address, balance: result.balances.solBalance, icon: <SolIcon className="h-8 w-8" />, loading: isLoading && !result },
    { name: 'BNB Smart Chain', symbol: 'BNB', address: result.wallets.bsc.address, balance: result.balances.bscBalance, icon: <BscIcon className="h-8 w-8" />, loading: isLoading && !result },
    { name: 'Cardano', symbol: 'ADA', address: result.wallets.cardano.address, balance: result.balances.adaBalance, icon: <AdaIcon className="h-8 w-8" />, loading: isLoading && !result },
  ] : Array(5).fill({ loading: true });


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
              <Button type="submit" className="w-full md:w-auto" disabled={isSearching}>
                <Search className="mr-2 h-4 w-4" />
                Start Searching
              </Button>
              {isSearching && (
                <Button variant="destructive" className="w-full md:w-auto" onClick={stopSearching}>
                  <X className="mr-2 h-4 w-4" />
                  Stop Searching
                </Button>
              )}
            </div>
          </form>
        </Form>
        
        {(isLoading || result) && <Separator className="my-8" />}

        {isSearching && (
          <div className="text-center text-lg font-semibold flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Searching... (Attempt: {attempts})
          </div>
        )}

        {isLoading && !isSearching && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {walletData.map((wallet, index) => (
              <WalletCard key={index} {...wallet} />
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <Card className={cn("transition-colors", hasBalance ? "bg-green-100/50 border-green-500/50" : "bg-primary/5 border-primary/20")}>
              <CardHeader>
                <CardTitle className="font-headline text-lg">
                  {isSearching ? 'Last Checked Seed Phrase' : 'Generated Seed Phrase'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-center text-lg p-4 bg-background rounded-md">{result.seedPhrase}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {walletData.map((wallet, index) => (
                <WalletCard key={index} {...wallet} hasBalance={parseFloat(wallet.balance || '0') > 0} />
              ))}
            </div>

            {hasBalance && (
              <div className="flex justify-center">
                <Button onClick={handleSave} size="lg">
                  <Save className="mr-2 h-4 w-4" /> Securely Save Found Wallet
                </Button>
              </div>
            )}
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="explanation">
                <AccordionTrigger className='font-headline text-lg'>AI Wallet Explanation</AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {result.explanation}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="summary">
                <AccordionTrigger className='font-headline text-lg'>AI Investment Insights</AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {result.summary}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}