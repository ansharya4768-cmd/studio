
import LostWalletFinder from '@/components/crypto-sleuth';
import { Wallet } from 'lucide-react';
import Image from 'next/image';

export default function DashboardPage() {
  return (
    <main className="relative container mx-auto flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
       <Image
        src="https://picsum.photos/1920/1080"
        alt="Hacking background"
        fill
        className="object-cover -z-20"
        data-ai-hint="hacker code"
      />
      <div className="absolute inset-0 bg-black/60 -z-10" />
       <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
          <div className="flex items-center gap-4 p-4 bg-primary/20 backdrop-blur-sm rounded-full border border-primary/30 shadow-lg">
            <Wallet className="w-12 h-12 text-primary" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold tracking-tighter text-white">
              Lost Wallet Finder
            </h1>
          </div>
          <p className="max-w-2xl text-gray-300 md:text-xl p-2 bg-black/30 backdrop-blur-sm rounded-lg">
            Recover lost cryptocurrency wallets by generating and checking seed phrases.
            Enter a partial seed to get started, or generate a random one.
          </p>
        </div>
        <LostWalletFinder />
      </div>
    </main>
  );
}
