# **App Name**: CryptoSeed Sleuth

## Core Features:

- Seed Phrase Generation: Generate a random or partial seed phrase based on user input.
- Wallet Derivation: Derive wallet addresses for Ethereum, Bitcoin, Solana, BSC, and Cardano from the seed phrase.
- Balance Check Tool: Automatically checks balances for each derived wallet using public APIs (Etherscan, Blockcypher, Solana RPC, BscScan, Blockfrost) as a tool.
- Results Display: Display the seed phrase and associated wallet addresses with their balances in a readable format.
- Auto-Saving: Securely saves the seed phrase and wallet information if non-zero balances are detected using cryptographic methods. Sensitive wallet and seed phrase data is AES encrypted client-side to ensure it is unusable on the server.
- Wallet Recovery Assistant: Generate seed phrases which could possibly correspond to the target wallet in case user enters a partial phrase.

## Style Guidelines:

- Primary color: Electric Indigo (#6F00FF) for a modern and secure feel.
- Background color: Very light grayish-blue (#F0F8FF).
- Accent color: Cyan (#00FFFF) to highlight important information like balances and addresses.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text; suitable for a tech-focused application.
- Use simple, outlined icons to represent different cryptocurrencies and actions like saving or generating.
- Clean, well-spaced layout with clear sections for each wallet type and its balance. Prioritize readability.
- Subtle animations when generating a new seed phrase or checking balances.