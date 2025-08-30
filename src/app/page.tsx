import LostWalletFinder from '@/components/crypto-sleuth';
import { Wallet } from 'lucide-react';

export default function Home() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
       <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
          <div className="flex items-center gap-4">
            <Wallet className="w-12 h-12 text-primary" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold tracking-tighter">
              Lost Wallet Finder
            </h1>
          </div>
          <p className="max-w-2xl text-muted-foreground md:text-xl">
            Recover lost cryptocurrency wallets by generating and checking seed phrases.
            Enter a partial seed to get started, or generate a random one.
          </p>
        </div>
        <LostWalletFinder />
      </div>
    </main>
  );
}
