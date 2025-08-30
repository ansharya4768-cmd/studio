
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

const coinGeckoApiMap: Record<Blockchain, string> = {
  ethereum: 'ethereum',
  bitcoin: 'bitcoin',
  solana: 'solana',
  bsc: 'binancecoin',
  cardano: 'cardano',
  litecoin: 'litecoin'
};

async function getPrices(chains: Blockchain[]): Promise<Record<string, number>> {
    const coinIds = chains.map(chain => coinGeckoApiMap[chain]).join(',');
    try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`;
        const response = await fetch(url);
        if (!response.ok) return {};
        const data = await response.json();
        const prices: Record<string, number> = {};
        for (const chain of chains) {
            const coinId = coinGeckoApiMap[chain];
            if (data[coinId]) {
                prices[chain] = data[coinId].usd;
            }
        }
        return prices;
    } catch (e) {
        console.error("Failed to fetch prices", e);
        return {};
    }
}

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

export async function getBalancesWithUSD(balances: Record<string, string>): Promise<Record<string, { balance: string, usdValue: string }>> {
    const chains = Object.keys(balances).map(key => key.replace('Balance', '') as Blockchain);
    const prices = await getPrices(chains);
    const result: Record<string, { balance: string, usdValue: string }> = {};
    for (const chain of chains) {
        const balanceKey = `${chain}Balance`;
        const balance = parseFloat(balances[balanceKey]);
        const price = prices[chain] || 0;
        const usdValue = (balance * price).toFixed(2);
        result[balanceKey] = {
            balance: balances[balanceKey],
            usdValue
        };
    }
    return result;
}

export async function getInsights(addresses: Addresses, balances: Record<string, string>, usdValues: Record<string, string>) {
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
      ethBalance: `${balances.ethBalance || '0'} (USD: ${usdValues.ethBalance || '0'})`,
      btcBalance: `${balances.btcBalance || '0'} (USD: ${usdValues.btcBalance || '0'})`,
      solBalance: `${balances.solBalance || '0'} (USD: ${usdValues.solBalance || '0'})`,
      bscBalance: `${balances.bscBalance || '0'} (USD: ${usdValues.bscBalance || '0'})`,
      adaBalance: `${balances.adaBalance || '0'} (USD: ${usdValues.adaBalance || '0'})`,
      ltcBalance: `${balances.ltcBalance || '0'} (USD: ${usdValues.ltcBalance || '0'})`,
    })
  ]);

  return {
    explanation: explanationResult.explanation,
    summary: summaryResult.summary,
  };
}
