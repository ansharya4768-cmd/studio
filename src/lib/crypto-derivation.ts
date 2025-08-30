"use client";

import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Dynamically import the Cardano serialization library only on the client side
async function getCSL() {
  if (typeof window !== 'undefined') {
    const CSL = await import('@emurgo/cardano-serialization-lib-asmjs');
    return CSL;
  }
  return null;
}

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

export interface WalletInfo {
  address: string;
  privateKey: string;
}

export interface DerivedWallets {
  ethereum: WalletInfo;
  bitcoin: WalletInfo;
  solana: WalletInfo;
  bsc: WalletInfo;
  cardano: WalletInfo;
}

export function generateSeedPhrase(partialSeed: string, wordCount: number): string | null {
  const words = partialSeed.split(' ').filter(w => w.length > 0);
  if (words.length >= wordCount) {
    return bip39.validateMnemonic(partialSeed) ? partialSeed : null;
  }

  if (words.length > 0) {
    // Attempt to complete partial seed
    const remaining = wordCount - words.length;
    const wordlist = bip39.wordlists.english;
    const randomWords = Array.from({ length: remaining }, () => wordlist[Math.floor(Math.random() * wordlist.length)]);
    const fullSeed = words.concat(randomWords).join(' ');
    // We can't fully validate a partially generated mnemonic without more complex logic
    return fullSeed;
  }
  
  // Generate random seed
  const strength = wordCount === 12 ? 128 : 256;
  const mnemonic = bip39.generateMnemonic(strength);
  return mnemonic;
}

async function deriveEthWallet(mnemonic: string): Promise<WalletInfo> {
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  return { address: wallet.address, privateKey: wallet.privateKey };
}

async function deriveBtcWallet(mnemonic: string): Promise<WalletInfo> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  // Native SegWit (P2WPKH) path
  const path = `m/84'/0'/0'/0/0`;
  const child = root.derivePath(path);
  const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey });
  return { address: address!, privateKey: child.toWIF() };
}

async function deriveSolWallet(mnemonic: string): Promise<WalletInfo> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const keypair = Keypair.fromSeed(seed.slice(0, 32));
  return { address: keypair.publicKey.toBase58(), privateKey: bs58.encode(keypair.secretKey) };
}

async function deriveCardanoWallet(mnemonic: string): Promise<WalletInfo> {
    const CSL = await getCSL();
    if (!CSL) {
        throw new Error('Cardano Serialization Library could not be loaded on the server.');
    }
    
    const harden = (num: number) => 0x80000000 + num;

    const entropy = bip39.mnemonicToEntropy(mnemonic);
    const rootKey = CSL.Bip32PrivateKey.from_bip39_entropy(
        Buffer.from(entropy, 'hex'),
        Buffer.from('')
    );
    
    const accountKey = rootKey
        .derive(harden(1852)) // Shelley era
        .derive(harden(1815)) // Cardano
        .derive(harden(0));
    
    const utxoPubKey = accountKey.derive(0).derive(0).to_public();
    const stakeKey = accountKey.derive(2).derive(0).to_public();

    const baseAddr = CSL.BaseAddress.new(
        CSL.NetworkInfo.mainnet().network_id(),
        CSL.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
        CSL.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
    );

    return {
        address: baseAddr.to_address().to_bech32(),
        privateKey: Buffer.from(rootKey.as_bytes()).toString('hex')
    };
}


export async function deriveAllWallets(seedPhrase: string): Promise<DerivedWallets> {
  if (!bip39.validateMnemonic(seedPhrase)) {
    throw new Error('Invalid seed phrase');
  }

  const [ethereum, bitcoin, solana, cardano] = await Promise.all([
    deriveEthWallet(seedPhrase),
    deriveBtcWallet(seedPhrase),
    deriveSolWallet(seedPhrase),
    deriveCardanoWallet(seedPhrase)
  ]);

  return {
    ethereum,
    bitcoin,
    solana,
    bsc: ethereum, // BSC uses the same address derivation as Ethereum
    cardano,
  };
}
