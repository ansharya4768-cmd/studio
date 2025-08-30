
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, Search, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

import { quickCheck, checkAllBalances, getInsights, type Blockchain } from '@/app/actions';
import { generateSeedPhrase, deriveAllWallets, type DerivedWallets } from '@/lib/crypto-derivation';
import { encryptAndSave } from '@/lib/encryption';
import WalletCard, { type WalletCardInfo } from '@/components/wallet-card';
import { AdaIcon, BscIcon, BtcIcon, EthIcon, LtcIcon, SolIcon } from './icons';

const blockchains: { id: Blockchain; label: string; icon: React.ReactNode }[] = [
    { id: 'ethereum', label: 'Ethereum (ETH)', icon: <EthIcon className="h-5 w-5" /> },
    { id: 'bitcoin', label: 'Bitcoin (BTC)', icon: <BtcIcon className="h-5 w-5" /> },
    { id: 'solana', label: 'Solana (SOL)', icon: <SolIcon className="h-5 w-5" /> },
    { id: 'bsc', label: 'BSC (BNB)', icon: <BscIcon className="h-5 w-5" /> },
    { id: 'cardano', label: 'Cardano (ADA)', icon: <AdaIcon className="h-5 w-5" /> },
    { id: 'litecoin', label: 'Litecoin (LTC)', icon: <LtcIcon className="h-5 w-5" /> },
  ];

const formSchema = z.object({
  partialSeed: z.string().optional(),
  wordCount: z.enum(['12', '24']),
  blockchains: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one blockchain.",
  }),
});

type FormData = z.infer<typeof formSchema>;

type ResultState = {
  seedPhrase: string;
  wallets: DerivedWallets;
  balances: Record<string, string>;
  explanation: string;
  summary: string;
} | null;

const CONCURRENCY_LEVEL = 5; // Number of parallel checks

export default function CryptoSleuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultState>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingInsights, setIsGettingInsights] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { toast } = useToast();
  
  const searchRef = useRef<boolean>(false);
  const attemptsRef = useRef<number>(0);
  const foundRef = useRef<boolean>(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partialSeed: '',
      wordCount: '12',
      blockchains: ['bitcoin'],
    },
  });

  const selectedChains = form.watch('blockchains') as Blockchain[];

  const stopSearching = useCallback(() => {
    searchRef.current = false;
    foundRef.current = false;
    setIsSearching(false);
  }, []);

  const runSearch = useCallback(async (data: FormData) => {
    searchRef.current = true;
    foundRef.current = false;
    setIsSearching(true);
    setIsLoading(true);
    setResult(null);
    attemptsRef.current = 0;
    setAttempts(0);

    const searchBlockchains = data.blockchains as Blockchain[];

    const worker = async () => {
      while (searchRef.current && !foundRef.current) {
        attemptsRef.current++;
        
        try {
          const seedPhrase = generateSeedPhrase(data.partialSeed || '', parseInt(data.wordCount, 10));
          if (!seedPhrase) {
            // This case is unlikely unless there's an issue with wordlist/generation logic
            continue; 
          }

          const wallets = await deriveAllWallets(seedPhrase);
          const quickBalances = await quickCheck(wallets, searchBlockchains);
          
          const hasBalance = Object.values(quickBalances).some(balance => parseFloat(balance) > 0);
          
          const allBalances: Record<string, string> = {};
          blockchains.forEach(chain => {
              const balanceKey = `${chain.id}Balance` as keyof ResultState['balances'];
              allBalances[balanceKey] = '...';
          });

          searchBlockchains.forEach(chain => {
              const balanceKey = `${chain.id}Balance` as keyof typeof allBalances;
              if (chain === 'ethereum') allBalances.ethBalance = quickBalances.ethereum;
              if (chain === 'bitcoin') allBalances.btcBalance = quickBalances.bitcoin;
              if (chain === 'solana') allBalances.solBalance = quickBalances.solana;
              if (chain === 'bsc') allBalances.bscBalance = quickBalances.bsc;
              if (chain === 'cardano') allBalances.adaBalance = quickBalances.cardano;
              if (chain === 'litecoin') allBalances.ltcBalance = quickBalances.litecoin;
          });
          
          // Only update the main view if we haven't found a wallet yet
          if (!foundRef.current) {
            setResult({ seedPhrase, wallets, balances: allBalances, explanation: '', summary: '' });
          }

          if (hasBalance) {
            foundRef.current = true; // Signal other workers to stop
            stopSearching();
            setIsCheckingAll(true);
            toast({
              title: 'Potential Wallet Found!',
              description: `A wallet with a balance was found after ${attemptsRef.current.toLocaleString()} attempts. Verifying all balances...`,
            });
            
            const fullBalances = await checkAllBalances(wallets);

            setResult(prev => prev ? ({ ...prev, balances: fullBalances }) : null);
            setIsCheckingAll(false);
            setIsLoading(false);

            toast({
              title: 'Wallet Confirmed!',
              description: 'Full balances confirmed. Now fetching AI insights...',
            });

            setIsGettingInsights(true);
            const { explanation, summary } = await getInsights(wallets, fullBalances);
            setResult(prev => prev ? ({ ...prev, explanation, summary }) : null);
            setIsGettingInsights(false);
          }
        } catch (error) {
          // Log errors but don't stop the worker
          console.error("Search worker error:", error);
        }
      }
    };
    
    // UI update loop for attempts
    const updateCounter = () => {
        if (searchRef.current) {
            setAttempts(attemptsRef.current);
            requestAnimationFrame(updateCounter);
        }
    };
    requestAnimationFrame(updateCounter);

    const workers = Array(CONCURRENCY_LEVEL).fill(0).map(worker);
    await Promise.all(workers);

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
  
  const hasAnyBalance = result && Object.values(result.balances).some(bal => bal !== '...' && parseFloat(bal) > 0);

  const allWalletData: WalletCardInfo[] = result ? [
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', address: result.wallets.ethereum, balance: result.balances.ethBalance, icon: <EthIcon className="h-8 w-8" />, loading: isCheckingAll && result?.balances.ethBalance === '...', hasBalance: parseFloat(result.balances.ethBalance || '0') > 0 },
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', address: result.wallets.bitcoin, balance: result.balances.btcBalance, icon: <BtcIcon className="h-8 w-8" />, loading: isCheckingAll && result?.balances.btcBalance === '...', hasBalance: parseFloat(result.balances.btcBalance || '0') > 0 },
    { id: 'solana', name: 'Solana', symbol: 'SOL', address: result.wallets.solana, balance: result.balances.solBalance, icon: <SolIcon className="h-8 w-8" />, loading: isCheckingAll && result?.balances.solBalance === '...', hasBalance: parseFloat(result.balances.solBalance || '0') > 0 },
    { id: 'bsc', name: 'BNB Smart Chain', symbol: 'BNB', address: result.wallets.bsc, balance: result.balances.bscBalance, icon: <BscIcon className="h-8 w-8" />, loading: isCheckingAll && result?.balances.bscBalance === '...', hasBalance: parseFloat(result.balances.bscBalance || '0') > 0 },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', address: result.wallets.cardano, balance: result.balances.adaBalance, icon: <AdaIcon className="h-8 w-8" />, loading: isCheckingAll && result?.balances.adaBalance === '...', hasBalance: parseFloat(result.balances.adaBalance || '0') > 0 },
    { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', address: result.wallets.litecoin, balance: result.balances.ltcBalance, icon: <LtcIcon className="h-8 w-8" />, loading: isCheckingAll && result?.balances.ltcBalance === '...', hasBalance: parseFloat(result.balances.ltcBalance || '0') > 0 },
  ] : [];

  const displayedWallets = result
    ? allWalletData.filter(wallet => selectedChains.includes(wallet.id as Blockchain))
    : (isSearching ? Array(selectedChains.length).fill({ loading: true }) : []);

  return (
    <Card className="w-full shadow-2xl bg-white/30 backdrop-blur-xl border border-primary/20">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(runSearch)(); }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-6">
                <FormField
                  control={form.control}
                  name="partialSeed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Partial Seed Phrase (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., apple banana ..." {...field} disabled={isSearching} className="bg-white/50"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="wordCount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-foreground/80">Word Count</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSearching}>
                        <FormControl>
                            <SelectTrigger className="bg-white/50">
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

              <FormField
                control={form.control}
                name="blockchains"
                render={() => (
                  <FormItem className="p-4 border rounded-lg bg-white/20">
                    <div className="mb-4">
                        <FormLabel className="text-foreground/80">Blockchains to Search</FormLabel>
                    </div>
                    <div className="space-y-3">
                    {blockchains.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="blockchains"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  disabled={isSearching}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center gap-2 cursor-pointer">
                                {item.icon} {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-4">
              {!isSearching && (
                <Button type="submit" className="w-full md:w-auto shadow-lg bg-gradient-to-br from-primary to-accent/80 hover:from-primary/90 hover:to-accent/70 text-white" disabled={!form.formState.isValid} size="lg">
                  <Search className="mr-2 h-4 w-4" />
                  Start Searching
                </Button>
              )}
              {isSearching && (
                <Button variant="destructive" type="button" className="w-full md:w-auto shadow-lg" onClick={stopSearching} size="lg">
                  <X className="mr-2 h-4 w-4" />
                  Stop Searching
                </Button>
              )}
            </div>
          </form>
        </Form>
        
        {(isSearching || result) && <Separator className="my-8" />}

        {isSearching && !foundRef.current && (
          <div className="text-center text-lg font-semibold flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Wallet searched= {new Intl.NumberFormat().format(attempts)}
          </div>
        )}

        {result && (
          <div className="space-y-8">
             {isSearching && !foundRef.current && (
                <div className="text-center text-lg font-semibold flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Wallet searched= {new Intl.NumberFormat().format(attempts)}
                </div>
            )}
            <Card className={cn("transition-colors border-2", hasAnyBalance ? "bg-green-100/50 border-green-500" : "bg-primary/5 border-primary/20")}>
              <CardHeader>
                <CardTitle className="font-headline text-lg">
                  {isSearching && !hasAnyBalance ? 'Currently Checking Seed Phrase' : (hasAnyBalance ? 'Found Seed Phrase' : 'Generated Seed Phrase')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-center text-lg p-4 bg-background/50 rounded-md">{result.seedPhrase}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedWallets.map((wallet, index) => (
                <WalletCard key={index} {...wallet} />
              ))}
            </div>

            {hasAnyBalance && (
              <div className="flex justify-center">
                <Button onClick={handleSave} size="lg" className="shadow-lg">
                  <Save className="mr-2 h-4 w-4" /> Securely Save Found Wallet
                </Button>
              </div>
            )}
            
            {(result.explanation || result.summary || isGettingInsights) && (
              <Accordion type="single" collapsible className="w-full bg-white/20 p-4 rounded-lg border" defaultValue="explanation">
                <AccordionItem value="explanation" className="border-b-primary/20">
                  <AccordionTrigger className='font-headline text-lg hover:no-underline'>
                    <Sparkles className="mr-2 h-5 w-5 text-primary"/> AI Wallet Explanation
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap pt-4">
                    {isGettingInsights && !result.explanation && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Generating...</div>}
                    {result.explanation}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="summary" className="border-b-0">
                  <AccordionTrigger className='font-headline text-lg hover:no-underline'>
                    <Sparkles className="mr-2 h-5 w-5 text-primary"/> AI Investment Insights
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap pt-4">
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

    