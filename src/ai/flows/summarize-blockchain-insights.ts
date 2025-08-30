
'use server';
/**
 * @fileOverview A GenAI-powered blockchain insights summary flow.
 *
 * - summarizeBlockchainInsights - A function that handles the blockchain insights summarization process.
 * - SummarizeBlockchainInsightsInput - The input type for the summarizeBlockchainInsights function.
 * - SummarizeBlockchainInsightsOutput - The return type for the summarizeBlockchainInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeBlockchainInsightsInputSchema = z.object({
  ethBalance: z.string().describe('The balance of the Ethereum wallet, including its USD value.'),
  btcBalance: z.string().describe('The balance of the Bitcoin wallet, including its USD value.'),
  solBalance: z.string().describe('The balance of the Solana wallet, including its USD value.'),
  bscBalance: z.string().describe('The balance of the BSC wallet, including its USD value.'),
  adaBalance: z.string().describe('The balance of the Cardano wallet, including its USD value.'),
  ltcBalance: z.string().describe('The balance of the Litecoin wallet, including its USD value.'),
});
export type SummarizeBlockchainInsightsInput = z.infer<typeof SummarizeBlockchainInsightsInputSchema>;

const SummarizeBlockchainInsightsOutputSchema = z.object({
  summary: z.string().describe('A summary of the blockchain insights, including potential investment opportunities or diversification strategies.'),
});
export type SummarizeBlockchainInsightsOutput = z.infer<typeof SummarizeBlockchainInsightsOutputSchema>;

export async function summarizeBlockchainInsights(input: SummarizeBlockchainInsightsInput): Promise<SummarizeBlockchainInsightsOutput> {
  return summarizeBlockchainInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeBlockchainInsightsPrompt',
  input: {schema: SummarizeBlockchainInsightsInputSchema},
  output: {schema: SummarizeBlockchainInsightsOutputSchema},
  prompt: `You are an expert in blockchain and cryptocurrency investments. Based on the provided wallet balances (including their USD equivalents), provide a summary of potential investment opportunities and diversification strategies.

Ethereum Balance: {{{ethBalance}}}
Bitcoin Balance: {{{btcBalance}}}
Solana Balance: {{{solBalance}}}
BSC Balance: {{{bscBalance}}}
Cardano Balance: {{{adaBalance}}}
Litecoin Balance: {{{ltcBalance}}}`,
});

const summarizeBlockchainInsightsFlow = ai.defineFlow(
  {
    name: 'summarizeBlockchainInsightsFlow',
    inputSchema: SummarizeBlockchainInsightsInputSchema,
    outputSchema: SummarizeBlockchainInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
