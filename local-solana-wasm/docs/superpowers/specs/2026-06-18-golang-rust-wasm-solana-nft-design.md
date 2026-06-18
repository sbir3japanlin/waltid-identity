# Demo: Go → Rust WASM → Solana Devnet NFT

## Purpose

Demonstrate calling Rust WASM from Go (wazero) to create and read Metaplex NFTs on
Solana Devnet using a local keypair.

## Architecture

Go CLI embeds Rust WASM via **wazero** (pure-Go, no CGo). Rust owns all Solana
logic: instruction construction, PDA derivation, data serialization, and on-chain
data parsing. Go owns the boundary: RPC, signing, and WASM orchestration.

```
main.go
  ├── keypair loader (wallet-1-keypair.json)
  ├── wazero WASM host
  │     └── Rust .wasm exports: alloc, dealloc, build_mint_nft, parse_metadata
  └── Solana RPC client (api.devnet.solana.com)
```

## Rust WASM (`lib.rs`, target `wasm32-unknown-unknown`)

| Export | Input | Output |
|--------|-------|--------|
| `alloc(len)` | u32 | `*mut u8` |
| `dealloc(ptr, len)` | ptr, u32 | — |
| `build_mint_nft(ptr, len)` | JSON: wallet pubkey, name, symbol, uri | JSON: serialized instruction set |
| `parse_metadata(ptr, len)` | JSON: account data (base64) | JSON: name, symbol, uri, creators, etc. |

Dependencies: `mpl-token-metadata`, `solana-sdk`, `serde_json`, `wee_alloc`.

## Go CLI

Dependencies: `github.com/tetratelabs/wazero`, `github.com/gagliardetto/solana-go`.

### `mint` flow

1. Load keypair
2. Instantiate WASM
3. Call `build_mint_nft` → get instructions as JSON
4. Fetch recent blockhash from Devnet
5. Build, sign, send transaction; wait for confirmation
6. Print mint address + explorer link

### `get` flow

1. Load keypair, instantiate WASM
2. Query mint + metadata PDA accounts from Devnet
3. Call `parse_metadata` with raw account data
4. Print parsed metadata

### CLI

```
go run . mint --name "My NFT" --symbol "DEMO" --uri "https://..."
go run . get  --mint <MINT_ADDRESS>
```

## Setup requirements

Installation of Go, Rust target `wasm32-unknown-unknown`, wasm-pack, and Solana CLI.
Wallet keypair is at `/home/lin/linwork/solana/wallet-1-keypair.json` (already holds
Devnet SOL — no airdrop needed).

## Error handling

- WASM panics caught by wazero, surfaced as Go errors
- RPC failures retried once
- Transaction simulation checked before signing
