"use server";

import { explainWalletAddresses } from "@/ai/flows/explain-wallet-addresses";
import { summarizeBlockchainInsights } from "@/ai/flows/summarize-blockchain-insights";

interface Addresses {
  ethereum: string;
  bitcoin: string;
  solana: string;
  bsc: string;
  cardano: string;
  litecoin: string;
}

export type Blockchain = "ethereum" | "bitcoin" | "solana" | "bsc" | "cardano" | "litecoin";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "YOUR_ETHERSCAN_API_KEY";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "YOUR_BSCSCAN_API_KEY";
const BLOCKCYPHER_API_KEY = process.env.BLOCKCYPHER_API_KEY || "YOUR_BLOCKCYPHER_API_KEY";
const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY || "YOUR_BLOCKFROST_API_KEY";
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

async function checkEthBalance(address: string): Promise<string> {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return "0.0000";
    const data = await response.json();
    if (data.status === "0") return "0.0000";
    const balance = parseInt(data.result, 10) / 1e18;
    return balance.toFixed(4);
  } catch (e) {
    return "0.0000";
  }
}

async function checkBtcBalance(address: string): Promise<string> {
  try {
    const url = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance?token=${BLOCKCYPHER_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return "0.0000";
    const data = await response.json();
    const balance = data.final_balance / 1e8;
    return balance.toFixed(4);
  } catch (e) {
    return "0.0000";
  }
}

async function checkLtcBalance(address: string): Promise<string> {
    try {
      const url = `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance?token=${BLOCKCYPHER_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return "0.0000";
      const data = await response.json();
      const balance = data.final_balance / 1e8;
      return balance.toFixed(4);
    } catch (e) {
      return "0.0000";
    }
}

async function checkSolBalance(address: string): Promise<string> {
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });
    if (!response.ok) return "0.0000";
    const data = await response.json();
    if (!data.result) return "0.0000";
    const balance = data.result.value / 1e9;
    return balance.toFixed(4);
  } catch (e) {
    return "0.0000";
  }
}

async function checkBscBalance(address: string): Promise<string> {
  try {
    const url = `https://api.bscscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=${BSCSCAN_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return "0.0000";
    const data = await response.json();
    if (data.status === "0") return "0.0000";
    const balance = parseInt(data.result, 10) / 1e18;
    return balance.toFixed(4);
  } catch (e) {
    return "0.0000";
  }
}

async function checkAdaBalance(address: string): Promise<string> {
  try {
    const url = `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${address}`;
    const response = await fetch(url, {
      headers: { project_id: BLOCKFROST_API_KEY }
    });
    if (!response.ok) return "0.0000";
    const data = await response.json();
    const lovelace = data.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0';
    const balance = parseInt(lovelace, 10) / 1e6;
    return balance.toFixed(4);
  } catch (e) {
    return "0.0000";
  }
}

const balanceCheckers: Record<Blockchain, (address: string) => Promise<string>> = {
  ethereum: checkEthBalance,
  bitcoin: checkBtcBalance,
  solana: checkSolBalance,
  bsc: checkBscBalance,
  cardano: checkAdaBalance,
  litecoin: checkLtcBalance,
};

export async function quickCheck(addresses: Addresses, blockchains: Blockchain[]): Promise<Record<string, string>> {
    const checks = blockchains.map(async (chain) => {
        const balance = await balanceCheckers[chain](addresses[chain]);
        return { [chain]: balance };
    });
    const results = await Promise.all(checks);
    return Object.assign({}, ...results);
}


export async function checkAllBalances(addresses: Addresses): Promise<Record<string, string>> {
  const [ethBalance, btcBalance, solBalance, bscBalance, adaBalance, ltcBalance] = await Promise.all([
    checkEthBalance(addresses.ethereum),
    checkBtcBalance(addresses.bitcoin),
    checkSolBalance(addresses.solana),
    checkBscBalance(addresses.bsc),
    checkAdaBalance(addresses.cardano),
    checkLtcBalance(addresses.litecoin),
  ]);

  return { ethBalance, btcBalance, solBalance, bscBalance, adaBalance, ltcBalance };
}

export async function getInsights(addresses: Addresses, balances: Record<string, string>) {
  const [explanationResult, summaryResult] = await Promise.all([
    explainWalletAddresses({
      ethereumAddress: addresses.ethereum,
      bitcoinAddress: addresses.bitcoin,
      solanaAddress: addresses.solana,
      cardanoAddress: addresses.cardano,
      bscAddress: addresses.bsc,
      litecoinAddress: addresses.litecoin,
    }),
    summarizeBlockchainInsights({
      ethBalance: balances.ethBalance || '0',
      btcBalance: balances.btcBalance || '0',
      solBalance: balances.solBalance || '0',
      bscBalance: balances.bscBalance || '0',
      adaBalance: balances.adaBalance || '0',
      ltcBalance: balances.ltcBalance || '0',
    })
  ]);

  return {
    explanation: explanationResult.explanation,
    summary: summaryResult.summary,
  };
}
