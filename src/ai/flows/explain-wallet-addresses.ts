'use server';

/**
 * @fileOverview Explains the purpose and significance of different derived wallet addresses.
 *
 * - explainWalletAddresses - A function that explains the purpose and significance of different derived wallet addresses.
 * - ExplainWalletAddressesInput - The input type for the explainWalletAddresses function.
 * - ExplainWalletAddressesOutput - The return type for the explainWalletAddresses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainWalletAddressesInputSchema = z.object({
  ethereumAddress: z.string().describe('The derived Ethereum wallet address.'),
  bitcoinAddress: z.string().describe('The derived Bitcoin wallet address.'),
  solanaAddress: z.string().describe('The derived Solana wallet address.'),
  cardanoAddress: z.string().describe('The derived Cardano wallet address.'),
  bscAddress: z.string().describe('The derived Binance Smart Chain wallet address.'),
});

export type ExplainWalletAddressesInput = z.infer<typeof ExplainWalletAddressesInputSchema>;

const ExplainWalletAddressesOutputSchema = z.object({
  explanation: z.string().describe('An explanation of the purpose and significance of each wallet address.'),
});

export type ExplainWalletAddressesOutput = z.infer<typeof ExplainWalletAddressesOutputSchema>;

export async function explainWalletAddresses(input: ExplainWalletAddressesInput): Promise<ExplainWalletAddressesOutput> {
  return explainWalletAddressesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainWalletAddressesPrompt',
  input: {schema: ExplainWalletAddressesInputSchema},
  output: {schema: ExplainWalletAddressesOutputSchema},
  prompt: `You are an expert in blockchain technology and cryptocurrency wallets.

You will receive derived wallet addresses for Ethereum, Bitcoin, Solana, Binance Smart Chain, and Cardano.

Your task is to explain the purpose and significance of each wallet address. Explain what each blockchain is used for, and the significance of having an address on that chain.

Ethereum Address: {{{ethereumAddress}}}
Bitcoin Address: {{{bitcoinAddress}}}
Solana Address: {{{solanaAddress}}}
Binance Smart Chain Address: {{{bscAddress}}}
Cardano Address: {{{cardanoAddress}}}`,
});

const explainWalletAddressesFlow = ai.defineFlow(
  {
    name: 'explainWalletAddressesFlow',
    inputSchema: ExplainWalletAddressesInputSchema,
    outputSchema: ExplainWalletAddressesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
