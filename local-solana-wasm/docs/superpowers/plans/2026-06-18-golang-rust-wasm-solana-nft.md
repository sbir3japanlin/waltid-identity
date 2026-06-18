# Go → Rust WASM → Solana NFT Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demo CLI that calls Rust WASM from Go (wazero) to mint a Metaplex NFT on Solana Devnet and read it back.

**Architecture:** Go CLI embeds a Rust WASM module via wazero. Rust builds all Solana instructions manually (Borsh, PDA, instruction data) and parses on-chain metadata. Go handles RPC, signing, and WASM orchestration using `gagliardetto/solana-go`.

**Tech Stack:** Go 1.22+, Rust (wasm32-unknown-unknown), wazero, solana-go, borsh, base64, bs58, sha2

---

### Task 1: Install required system tools

**Files:** None (system packages)

- [ ] **Step 1: Install Go 1.22+**

```bash
sudo snap install go --classic
```
Expected: `go version` prints `go1.22.x` or later.

- [ ] **Step 2: Install Rust via rustup**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```
Expected: `rustc --version` and `cargo --version` print versions.

- [ ] **Step 3: Install wasm32 target and wasm-pack**

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```
Expected: `wasm-pack --version` prints version, `rustup target list --installed` includes `wasm32-unknown-unknown`.

- [ ] **Step 4: Install Solana CLI**

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana config set --url devnet
```
Expected: `solana --version` prints version, `solana config get` shows `devnet`.

- [ ] **Step 5: Verify wallet**

```bash
solana-keygen pubkey /home/lin/linwork/solana/wallet-1-keypair.json
solana balance /home/lin/linwork/solana/wallet-1-keypair.json
```
Expected: Prints pubkey and non-zero SOL balance (> 0.01 SOL).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: toolchain bootstrap — Go, Rust, wasm-pack, Solana CLI"
```

---

### Task 2: Rust WASM project scaffold

**Files:**
- Create: `wasm/Cargo.toml`
- Create: `wasm/src/lib.rs`

- [ ] **Step 1: Create `wasm/Cargo.toml`**

```toml
[package]
name = "solana-nft-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
borsh = { version = "1.5", features = ["derive"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
base64 = "0.22"
bs58 = "0.5"
sha2 = "0.10"

[profile.release]
opt-level = "s"
lto = true
```

- [ ] **Step 2: Create `wasm/src/lib.rs` with alloc/dealloc and stub exports**

```rust
use std::mem;

#[no_mangle]
pub extern "C" fn alloc(len: u32) -> *mut u8 {
    let mut buf = Vec::with_capacity(len as usize);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, len: u32) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, 0, len as usize);
    }
}

#[no_mangle]
pub extern "C" fn build_mint_nft(_ptr: *const u8, _len: u32) -> u64 {
    write_json_return(r#"{"error":"not implemented"}"#)
}

#[no_mangle]
pub extern "C" fn parse_metadata(_ptr: *const u8, _len: u32) -> u64 {
    write_json_return(r#"{"error":"not implemented"}"#)
}

fn read_input<'a, T: serde::Deserialize<'a>>(ptr: *const u8, len: u32) -> T {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len as usize) };
    let input_str = std::str::from_utf8(bytes).unwrap();
    serde_json::from_str(input_str).unwrap()
}

fn write_json_return(json: &str) -> u64 {
    let bytes = json.as_bytes();
    let buf = alloc(bytes.len() as u32);
    unsafe { std::ptr::copy_nonoverlapping(bytes.as_ptr(), buf, bytes.len()); }
    pack_ptr_len(buf, bytes.len())
}

fn pack_ptr_len(ptr: *mut u8, len: usize) -> u64 {
    ((ptr as u64) << 32) | (len as u64)
}

pub mod instructions;
pub mod pda;
pub mod nft;
pub mod parser;
```

- [ ] **Step 3: Build to verify compilation**

```bash
cd wasm && cargo build --release --target wasm32-unknown-unknown
ls -la target/wasm32-unknown-unknown/release/solana_nft_wasm.wasm
```
Expected: WASM binary exists, size under ~500 KB.

- [ ] **Step 4: Commit**

```bash
git add wasm/ && git commit -m "feat: scaffold Rust WASM project with alloc/dealloc stubs"
```

---

### Task 3: Rust PDA derivation

**Files:**
- Create: `wasm/src/pda.rs`

- [ ] **Step 1: Create `wasm/src/pda.rs`**

```rust
use sha2::{Sha256, Digest};

const PDA_MARKER: &[u8] = b"ProgramDerivedAddress";

/// Derive a Program Derived Address. Returns (address, bump).
pub fn find_program_address(seeds: &[&[u8]], program_id: &[u8; 32]) -> ([u8; 32], u8) {
    for bump in (0..=255).rev() {
        let mut hasher = Sha256::new();
        for seed in seeds {
            hasher.update(seed);
        }
        hasher.update(&[bump]);
        hasher.update(PDA_MARKER);
        hasher.update(program_id);
        let hash: [u8; 32] = hasher.finalize().into();

        if !is_on_curve(&hash) {
            return (hash, bump);
        }
    }
    panic!("PDA: could not find valid bump");
}

fn is_on_curve(point: &[u8; 32]) -> bool {
    let curve_order: [u8; 32] = [
        0xED, 0xD3, 0xF5, 0x5C, 0x1A, 0x63, 0x12, 0x58,
        0xD6, 0x9C, 0xF7, 0xA2, 0xDE, 0xF9, 0xDE, 0x14,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10,
    ];
    for i in (0..32).rev() {
        match point[i].cmp(&curve_order[i]) {
            std::cmp::Ordering::Less => return true,
            std::cmp::Ordering::Greater => return false,
            std::cmp::Ordering::Equal => continue,
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_metadata_pda() {
        let program_id = bs58::decode("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
            .into_vec().unwrap();
        let mut pid = [0u8; 32];
        pid.copy_from_slice(&program_id);

        let mint_str = "GqZk3XQHesDySRbHtQZ4fAWhGgXJq3vHP3WeDQmdSJqZ";
        let mint = bs58::decode(mint_str).into_vec().unwrap();
        let mut mint_key = [0u8; 32];
        mint_key.copy_from_slice(&mint);

        let (pda, bump) = find_program_address(
            &[b"metadata", &pid, &mint_key],
            &pid,
        );
        assert!(bump > 0);
        assert_ne!(pda, [0u8; 32]);
    }
}
```

- [ ] **Step 2: Build and run tests**

```bash
cd wasm && cargo test && cargo build --release --target wasm32-unknown-unknown
```
Expected: Tests pass, WASM compiles.

- [ ] **Step 3: Commit**

```bash
git add wasm/src/pda.rs && git commit -m "feat: add PDA derivation with SHA256"
```

---

### Task 4: Rust instruction builders (SPL Token, ATA, System, Metaplex)

**Files:**
- Create: `wasm/src/instructions.rs`

- [ ] **Step 1: Create `wasm/src/instructions.rs`**

```rust
use borsh::BorshSerialize;
use serde::Serialize;

// --- Program IDs (base58) ---
pub const TOKEN_PROGRAM_ID: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
pub const ASSOC_TOKEN_PROGRAM_ID: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
pub const METADATA_PROGRAM_ID: &str = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
pub const SYSTEM_PROGRAM_ID: &str = "11111111111111111111111111111111";
pub const RENT_SYSVAR_ID: &str = "SysvarRent111111111111111111111111111111111";
pub const SYSVAR_INSTRUCTIONS_ID: &str = "Sysvar1nstructions1111111111111111111111111";

// --- Output types ---
#[derive(BorshSerialize, Serialize)]
pub struct AccountMetaOut {
    pub pubkey: String,    // base58
    pub is_signer: bool,
    pub is_writable: bool,
}

#[derive(BorshSerialize, Serialize)]
pub struct InstructionOut {
    pub program_id: String,  // base58
    pub accounts: Vec<AccountMetaOut>,
    pub data: String,        // base64
}

// --- SPL Token Instructions ---

/// InitializeMint (tag = 0)
pub fn initialize_mint(mint: &[u8; 32], mint_authority: &[u8; 32], decimals: u8) -> InstructionOut {
    let mut data = vec![0u8]; // tag
    data.push(decimals);
    data.extend_from_slice(mint_authority);
    data.push(0); // COption::None for freeze_authority
    InstructionOut {
        program_id: TOKEN_PROGRAM_ID.to_string(),
        accounts: vec![
            AccountMetaOut { pubkey: bs58::encode(mint).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: RENT_SYSVAR_ID.to_string(), is_signer: false, is_writable: false },
        ],
        data: to_base64(&data),
    }
}

/// MintTo (tag = 7)
pub fn mint_to(mint: &[u8; 32], dest: &[u8; 32], authority: &[u8; 32], amount: u64) -> InstructionOut {
    let mut data = vec![7u8];
    data.extend_from_slice(&amount.to_le_bytes());
    InstructionOut {
        program_id: TOKEN_PROGRAM_ID.to_string(),
        accounts: vec![
            AccountMetaOut { pubkey: bs58::encode(mint).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(dest).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(authority).into_string(), is_signer: true, is_writable: false },
        ],
        data: to_base64(&data),
    }
}

// --- Associated Token Account ---

/// Create ATA
pub fn create_ata(payer: &[u8; 32], owner: &[u8; 32], mint: &[u8; 32], ata: &[u8; 32]) -> InstructionOut {
    InstructionOut {
        program_id: ASSOC_TOKEN_PROGRAM_ID.to_string(),
        accounts: vec![
            AccountMetaOut { pubkey: bs58::encode(payer).into_string(), is_signer: true, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(ata).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(owner).into_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: bs58::encode(mint).into_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: SYSTEM_PROGRAM_ID.to_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: TOKEN_PROGRAM_ID.to_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: RENT_SYSVAR_ID.to_string(), is_signer: false, is_writable: false },
        ],
        data: to_base64(&[]), // ATA Create has no extra data
    }
}

// --- System Program ---

/// CreateAccount
pub fn system_create_account(
    funder: &[u8; 32],
    new_account: &[u8; 32],
    lamports: u64,
    space: u64,
    owner: &[u8; 32],
) -> InstructionOut {
    let mut data = vec![0u8, 0, 0, 0]; // tag = 0 (u32 LE)
    data.extend_from_slice(&lamports.to_le_bytes());
    data.extend_from_slice(&space.to_le_bytes());
    data.extend_from_slice(owner);
    InstructionOut {
        program_id: SYSTEM_PROGRAM_ID.to_string(),
        accounts: vec![
            AccountMetaOut { pubkey: bs58::encode(funder).into_string(), is_signer: true, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(new_account).into_string(), is_signer: true, is_writable: true },
        ],
        data: to_base64(&data),
    }
}

// --- Metaplex Token Metadata ---

pub const CREATE_METADATA_V3_TAG: u8 = 33;
pub const CREATE_MASTER_EDITION_V3_TAG: u8 = 17;

#[derive(BorshSerialize)]
struct CreatorInner {
    address: [u8; 32],
    verified: bool,
    share: u8,
}

#[derive(BorshSerialize)]
struct CollectionInner {
    verified: bool,
    key: [u8; 32],
}

#[derive(BorshSerialize)]
struct UsesInner {
    use_method: u8, // 0=Burn, 1=Multiple, 2=Single
    remaining: u64,
    total: u64,
}

#[derive(BorshSerialize)]
struct DataV2Inner {
    name: String,
    symbol: String,
    uri: String,
    seller_fee_basis_points: u16,
    creators: Option<Vec<CreatorInner>>,
    collection: Option<CollectionInner>,
    uses: Option<UsesInner>,
}

#[derive(BorshSerialize)]
enum CollectionDetailsInner {
    V1 { size: u64 },
}

#[derive(BorshSerialize)]
struct CreateMetadataArgsV3 {
    data: DataV2Inner,
    is_mutable: bool,
    collection_details: Option<CollectionDetailsInner>,
}

/// CreateMetadataAccountV3
pub fn create_metadata_v3(
    metadata_pda: &[u8; 32],
    mint: &[u8; 32],
    mint_authority: &[u8; 32],
    payer: &[u8; 32],
    update_authority: &[u8; 32],
    name: String,
    symbol: String,
    uri: String,
) -> InstructionOut {
    let args = CreateMetadataArgsV3 {
        data: DataV2Inner {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        is_mutable: true,
        collection_details: None,
    };
    let mut data = vec![CREATE_METADATA_V3_TAG];
    data.extend(borsh::to_vec(&args).unwrap());

    InstructionOut {
        program_id: METADATA_PROGRAM_ID.to_string(),
        accounts: vec![
            AccountMetaOut { pubkey: bs58::encode(metadata_pda).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(mint).into_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: bs58::encode(mint_authority).into_string(), is_signer: true, is_writable: false },
            AccountMetaOut { pubkey: bs58::encode(payer).into_string(), is_signer: true, is_writable: false },
            AccountMetaOut { pubkey: bs58::encode(update_authority).into_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: SYSTEM_PROGRAM_ID.to_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: RENT_SYSVAR_ID.to_string(), is_signer: false, is_writable: false },
        ],
        data: to_base64(&data),
    }
}

/// CreateMasterEditionV3
pub fn create_master_edition_v3(
    edition_pda: &[u8; 32],
    mint: &[u8; 32],
    update_authority: &[u8; 32],
    mint_authority: &[u8; 32],
    payer: &[u8; 32],
    metadata_pda: &[u8; 32],
) -> InstructionOut {
    let mut data = vec![CREATE_MASTER_EDITION_V3_TAG];
    data.push(0); // max_supply: Option<u64> = None

    InstructionOut {
        program_id: METADATA_PROGRAM_ID.to_string(),
        accounts: vec![
            AccountMetaOut { pubkey: bs58::encode(edition_pda).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(mint).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: bs58::encode(update_authority).into_string(), is_signer: true, is_writable: false },
            AccountMetaOut { pubkey: bs58::encode(mint_authority).into_string(), is_signer: true, is_writable: false },
            AccountMetaOut { pubkey: bs58::encode(payer).into_string(), is_signer: true, is_writable: false },
            AccountMetaOut { pubkey: bs58::encode(metadata_pda).into_string(), is_signer: false, is_writable: true },
            AccountMetaOut { pubkey: TOKEN_PROGRAM_ID.to_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: SYSTEM_PROGRAM_ID.to_string(), is_signer: false, is_writable: false },
            AccountMetaOut { pubkey: RENT_SYSVAR_ID.to_string(), is_signer: false, is_writable: false },
        ],
        data: to_base64(&data),
    }
}

// --- Helpers ---

fn to_base64(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(data)
}

pub fn decode_b58_32(s: &str) -> [u8; 32] {
    let v = bs58::decode(s).into_vec().expect("invalid base58");
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&v);
    arr
}
```

- [ ] **Step 2: Build WASM to verify**

```bash
cd wasm && cargo build --release --target wasm32-unknown-unknown
```
Expected: Compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add wasm/src/instructions.rs && git commit -m "feat: add full instruction builders (SPL, ATA, System, Metaplex)"
```

---

### Task 5: Implement build_mint_nft export

**Files:**
- Create: `wasm/src/nft.rs`
- Modify: `wasm/src/lib.rs` (update `build_mint_nft` implementation)

- [ ] **Step 1: Create `wasm/src/nft.rs`**

```rust
use crate::instructions::{self, InstructionOut, decode_b58_32, METADATA_PROGRAM_ID, TOKEN_PROGRAM_ID, ASSOC_TOKEN_PROGRAM_ID};
use crate::pda;
use serde::{Serialize, Deserialize};

#[derive(Deserialize)]
pub struct MintInput {
    pub wallet_pubkey: String, // base58
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[derive(Serialize)]
pub struct BuildResult {
    pub instructions: Vec<InstructionOut>,
    pub mint: String,
    pub metadata: String,
    pub master_edition: String,
}

/// Deterministic mint keypair derived from wallet + name.
/// In a real app Go would pass the mint pubkey; for a demo this is fine.
fn derive_mint(wallet: &[u8; 32], name: &str) -> [u8; 32] {
    use sha2::{Sha256, Digest};
    let mut h = Sha256::new();
    h.update(wallet);
    h.update(name.as_bytes());
    h.update(b"mint-seed-v1");
    h.finalize().into()
}

pub fn build(input: &MintInput) -> BuildResult {
    let wallet = decode_b58_32(&input.wallet_pubkey);
    let mint = derive_mint(&wallet, &input.name);

    let meta_prog_id = decode_b58_32(METADATA_PROGRAM_ID);
    let token_prog_id = decode_b58_32(TOKEN_PROGRAM_ID);
    let ata_prog_id = decode_b58_32(ASSOC_TOKEN_PROGRAM_ID);

    // Derive metadata PDA
    let (metadata_pda, _) = pda::find_program_address(
        &[b"metadata", &meta_prog_id, &mint],
        &meta_prog_id,
    );

    // Derive master edition PDA
    let (edition_pda, _) = pda::find_program_address(
        &[b"metadata", &meta_prog_id, &mint, b"edition"],
        &meta_prog_id,
    );

    // Derive ATA for wallet
    let (ata, _) = pda::find_program_address(
        &[&wallet, &token_prog_id, &mint],
        &ata_prog_id,
    );

    let mint_rent = 1_461_600u64; // 82 bytes mint account

    let instructions = vec![
        // 1. Create mint account
        instructions::system_create_account(&wallet, &mint, mint_rent, 82, &token_prog_id),
        // 2. Initialize mint (0 decimals = NFT)
        instructions::initialize_mint(&mint, &wallet, 0),
        // 3. Create ATA
        instructions::create_ata(&wallet, &wallet, &mint, &ata),
        // 4. Mint 1 token
        instructions::mint_to(&mint, &ata, &wallet, 1),
        // 5. Create metadata
        instructions::create_metadata_v3(
            &metadata_pda, &mint, &wallet, &wallet, &wallet,
            input.name.clone(), input.symbol.clone(), input.uri.clone(),
        ),
        // 6. Create master edition
        instructions::create_master_edition_v3(
            &edition_pda, &mint, &wallet, &wallet, &wallet, &metadata_pda,
        ),
    ];

    BuildResult {
        instructions,
        mint: bs58::encode(&mint).into_string(),
        metadata: bs58::encode(&metadata_pda).into_string(),
        master_edition: bs58::encode(&edition_pda).into_string(),
    }
}
```

- [ ] **Step 2: Update `build_mint_nft` in `wasm/src/lib.rs`**

Replace the stub `build_mint_nft` with:

```rust
#[no_mangle]
pub extern "C" fn build_mint_nft(ptr: *const u8, len: u32) -> u64 {
    let input: nft::MintInput = read_input(ptr, len);
    let result = nft::build(&input);
    let json = serde_json::to_string(&result).unwrap();
    write_json_return(&json)
}
```

- [ ] **Step 3: Build and test**

```bash
cd wasm && cargo build --release --target wasm32-unknown-unknown
```
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add wasm/src/nft.rs wasm/src/lib.rs && git commit -m "feat: implement build_mint_nft WASM export"
```

---

### Task 6: Implement parse_metadata export

**Files:**
- Create: `wasm/src/parser.rs`
- Modify: `wasm/src/lib.rs` (update `parse_metadata`)

- [ ] **Step 1: Create `wasm/src/parser.rs`**

```rust
use serde::{Serialize, Deserialize};
use borsh::BorshDeserialize;

#[derive(Deserialize)]
pub struct ParseInput {
    pub metadata_account_data: String, // base64
}

#[derive(Serialize)]
pub struct ParseResult {
    pub key: u8,                  // 4 = MetadataV1
    pub update_authority: String, // base58
    pub mint: String,             // base58
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub seller_fee_basis_points: u16,
    pub primary_sale_happened: bool,
    pub is_mutable: bool,
    pub edition_nonce: Option<u8>,
    pub token_standard: Option<u8>,
}

#[derive(BorshDeserialize)]
struct MetadataKey(u8);

#[derive(BorshDeserialize)]
struct MetadataData {
    name: String,
    symbol: String,
    uri: String,
    seller_fee_basis_points: u16,
    creators: Option<Vec<CreatorRaw>>, // don't need full parse, just consume
    collection: Option<CollectionRaw>,
    uses: Option<UsesRaw>,
}

#[derive(BorshDeserialize)]
struct CreatorRaw {
    address: [u8; 32],
    verified: bool,
    share: u8,
}

#[derive(BorshDeserialize)]
struct CollectionRaw {
    verified: bool,
    key: [u8; 32],
}

#[derive(BorshDeserialize)]
struct UsesRaw {
    use_method: u8,
    remaining: u64,
    total: u64,
}

#[derive(BorshDeserialize)]
struct CollectionDetailsRaw {
    size: u64,
}

pub fn parse(input: &ParseInput) -> ParseResult {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&input.metadata_account_data)
        .expect("invalid base64 metadata");

    // Borsh deserialize from the on-chain account data.
    // Layout: key(u8) + update_authority([u8;32]) + mint([u8;32]) + data(DataV2) + ...
    let mut cursor = &bytes[..];

    let key: u8 = u8::deserialize(&mut cursor).unwrap();
    let update_authority: [u8; 32] = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let mint: [u8; 32] = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let data: MetadataData = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let primary_sale_happened: bool = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let is_mutable: bool = BorshDeserialize::deserialize(&mut cursor).unwrap();

    // edition_nonce: Option<u8> — present if there's remaining data
    let edition_nonce: Option<u8> = if cursor.len() >= 1 {
        let val: u8 = BorshDeserialize::deserialize(&mut cursor).unwrap();
        if val == 0 { None } else { Some(val) }
    } else {
        None
    };

    // token_standard: Option<u8>
    let token_standard: Option<u8> = if cursor.len() >= 1 {
        Some(u8::deserialize(&mut cursor).unwrap())
    } else {
        None
    };

    ParseResult {
        key,
        update_authority: bs58::encode(&update_authority).into_string(),
        mint: bs58::encode(&mint).into_string(),
        name: data.name,
        symbol: data.symbol,
        uri: data.uri,
        seller_fee_basis_points: data.seller_fee_basis_points,
        primary_sale_happened,
        is_mutable,
        edition_nonce,
        token_standard,
    }
}
```

- [ ] **Step 2: Update `parse_metadata` in `wasm/src/lib.rs`**

Replace the stub with:

```rust
#[no_mangle]
pub extern "C" fn parse_metadata(ptr: *const u8, len: u32) -> u64 {
    let input: parser::ParseInput = read_input(ptr, len);
    let result = parser::parse(&input);
    let json = serde_json::to_string(&result).unwrap();
    write_json_return(&json)
}
```

- [ ] **Step 3: Build WASM**

```bash
cd wasm && cargo build --release --target wasm32-unknown-unknown
```
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add wasm/src/parser.rs wasm/src/lib.rs && git commit -m "feat: implement parse_metadata WASM export"
```

---

### Task 7: Go project scaffold with wazero WASM host

**Files:**
- Create: `go.mod`
- Create: `main.go`

- [ ] **Step 1: Initialize Go module**

```bash
go mod init local-solana-wasm
go get github.com/tetratelabs/wazero@latest
go get github.com/gagliardetto/solana-go@latest
```
Expected: `go.mod` and `go.sum` created.

- [ ] **Step 2: Create `main.go` with WASM loader and CLI structure**

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	confirm "github.com/gagliardetto/solana-go/rpc/sendAndConfirmTransaction"
	"github.com/gagliardetto/solana-go/rpc/ws"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)

const walletPath = "/home/lin/linwork/solana/wallet-1-keypair.json"
const wasmPath = "wasm/target/wasm32-unknown-unknown/release/solana_nft_wasm.wasm"
const devnetRPC = rpc.DevNet_RPC

type WasmMod struct {
	runtime wazero.Runtime
	mod     api.Module
	alloc   api.Function
	dealloc api.Function
}

func loadWasm(ctx context.Context) (*WasmMod, error) {
	wasmBytes, err := os.ReadFile(wasmPath)
	if err != nil {
		return nil, fmt.Errorf("read wasm: %w", err)
	}

	rt := wazero.NewRuntime(ctx)
	mod, err := rt.Instantiate(ctx, wasmBytes)
	if err != nil {
		return nil, fmt.Errorf("instantiate wasm: %w", err)
	}

	return &WasmMod{
		runtime: rt,
		mod:     mod,
		alloc:   mod.ExportedFunction("alloc"),
		dealloc: mod.ExportedFunction("dealloc"),
	}, nil
}

func (w *WasmMod) Close(ctx context.Context) {
	w.runtime.Close(ctx)
}

// callWasm writes input JSON to WASM memory, calls the named export, reads output JSON back.
func (w *WasmMod) callWasm(ctx context.Context, fnName string, inputJSON []byte) ([]byte, error) {
	fn := w.mod.ExportedFunction(fnName)

	// Allocate memory in WASM for input
	results, err := w.alloc.Call(ctx, uint64(len(inputJSON)))
	if err != nil {
		return nil, fmt.Errorf("alloc: %w", err)
	}
	inPtr := results[0]

	// Write input into WASM memory
	if !w.mod.Memory().Write(uint32(inPtr), inputJSON) {
		return nil, fmt.Errorf("write input to wasm memory failed")
	}

	// Call the function — returns packed u64: (ptr << 32) | len
	results, err = fn.Call(ctx, inPtr, uint64(len(inputJSON)))
	if err != nil {
		return nil, fmt.Errorf("%s: %w", fnName, err)
	}
	packed := results[0]
	outPtr := uint32(packed >> 32)
	outLen := uint32(packed & 0xFFFFFFFF)

	// Read output
	output, ok := w.mod.Memory().Read(outPtr, outLen)
	if !ok {
		return nil, fmt.Errorf("read output from wasm memory failed")
	}

	// Deallocate
	w.dealloc.Call(ctx, inPtr, uint64(len(inputJSON)))
	w.dealloc.Call(ctx, uint64(outPtr), uint64(outLen))

	return output, nil
}

func loadWallet() (*solana.Wallet, error) {
	return solana.WalletFromFile(walletPath)
}

func main() {
	ctx := context.Background()

	if len(os.Args) < 2 {
		fmt.Println("Usage: go run . mint|get ...")
		os.Exit(1)
	}

	cmd := os.Args[1]
	switch cmd {
	case "mint":
		cmdMint(ctx)
	case "get":
		cmdGet(ctx)
	default:
		fmt.Printf("unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
```

- [ ] **Step 3: Add helper to build/extract instructions from WASM output**

Add to `main.go` a function that parses the WASM `BuildResult` JSON and converts it into `solana-go` instructions:

```go
type WasmAccountMeta struct {
	Pubkey     string `json:"pubkey"`
	IsSigner   bool   `json:"is_signer"`
	IsWritable bool   `json:"is_writable"`
}

type WasmInstruction struct {
	ProgramID string            `json:"program_id"`
	Accounts  []WasmAccountMeta `json:"accounts"`
	Data      string            `json:"data"`
}

type BuildResultJSON struct {
	Instructions []WasmInstruction `json:"instructions"`
	Mint         string            `json:"mint"`
	Metadata     string            `json:"metadata"`
	MasterEdition string           `json:"master_edition"`
}

func toSolanaInstructions(wasmInstrs []WasmInstruction) ([]solana.Instruction, error) {
	out := make([]solana.Instruction, len(wasmInstrs))
	for i, wi := range wasmInstrs {
		programID, err := solana.PublicKeyFromBase58(wi.ProgramID)
		if err != nil {
			return nil, fmt.Errorf("instruction %d program_id: %w", i, err)
		}
		accounts := make([]*solana.AccountMeta, len(wi.Accounts))
		for j, a := range wi.Accounts {
			pk, err := solana.PublicKeyFromBase58(a.Pubkey)
			if err != nil {
				return nil, fmt.Errorf("instruction %d account %d: %w", i, j, err)
			}
			accounts[j] = &solana.AccountMeta{
				PublicKey:  pk,
				IsSigner:   a.IsSigner,
				IsWritable: a.IsWritable,
			}
		}
		data, err := base64.StdEncoding.DecodeString(wi.Data)
		if err != nil {
			return nil, fmt.Errorf("instruction %d data: %w", i, err)
		}
		out[i] = solana.NewInstruction(programID, accounts, data)
	}
	return out, nil
}
```

Add the required imports to the top of `main.go`:

```go
import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	confirm "github.com/gagliardetto/solana-go/rpc/sendAndConfirmTransaction"
	"github.com/gagliardetto/solana-go/rpc/ws"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)
```

- [ ] **Step 4: Verify compilation (no run yet, just `go build`)**

```bash
go build ./...
```
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add go.mod go.sum main.go && git commit -m "feat: Go project scaffold with wazero WASM host and CLI structure"
```

---

### Task 8: Implement Go mint command

**Files:**
- Modify: `main.go` (add `cmdMint`, `cmdGet`)

- [ ] **Step 1: Add `cmdMint` to `main.go`**

```go
func cmdMint(ctx context.Context) {
	name := flagArg("--name")
	symbol := flagArg("--symbol")
	uri := flagArg("--uri")

	if name == "" || symbol == "" || uri == "" {
		fmt.Println("Usage: go run . mint --name <name> --symbol <symbol> --uri <uri>")
		os.Exit(1)
	}

	wallet, err := loadWallet()
	if err != nil {
		fmt.Fprintf(os.Stderr, "load wallet: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Wallet: %s\n", wallet.PublicKey().String())

	// Load WASM
	wasm, err := loadWasm(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "load wasm: %v\n", err)
		os.Exit(1)
	}
	defer wasm.Close(ctx)

	// Build instructions via WASM
	input := map[string]string{
		"wallet_pubkey": wallet.PublicKey().String(),
		"name":          name,
		"symbol":        symbol,
		"uri":           uri,
	}
	inputJSON, _ := json.Marshal(input)
	output, err := wasm.callWasm(ctx, "build_mint_nft", inputJSON)
	if err != nil {
		fmt.Fprintf(os.Stderr, "build_mint_nft: %v\n", err)
		os.Exit(1)
	}

	var buildResult BuildResultJSON
	if err := json.Unmarshal(output, &buildResult); err != nil {
		fmt.Fprintf(os.Stderr, "parse build result: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Mint:      %s\n", buildResult.Mint)
	fmt.Printf("Metadata:  %s\n", buildResult.Metadata)
	fmt.Printf("Edition:   %s\n", buildResult.MasterEdition)

	// Convert to solana-go instructions
	instrs, err := toSolanaInstructions(buildResult.Instructions)
	if err != nil {
		fmt.Fprintf(os.Stderr, "convert instructions: %v\n", err)
		os.Exit(1)
	}

	// RPC clients
	rpcClient := rpc.New(devnetRPC)
	wsClient, err := ws.Connect(ctx, rpc.DevNet_WS)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ws connect: %v\n", err)
		os.Exit(1)
	}
	defer wsClient.Close()

	// Derive mint keypair deterministically (same SHA256 seed as WASM).
	// The mint account must sign since SystemProgram::CreateAccount requires it.
	mintKP := deriveMintKeypair(wallet, name)

	// Build transaction
	recent, err := rpcClient.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		fmt.Fprintf(os.Stderr, "get recent blockhash: %v\n", err)
		os.Exit(1)
	}

	tx, err := solana.NewTransaction(
		instrs,
		recent.Value.Blockhash,
		solana.TransactionPayer(wallet.PublicKey()),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "build tx: %v\n", err)
		os.Exit(1)
	}

	// Sign with wallet AND mint keypair (mint is a signer for SystemProgram::CreateAccount)
	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(wallet.PublicKey()) {
			return &wallet.PrivateKey
		}
		if key.Equals(mintKP.PublicKey()) {
			return &mintKP.PrivateKey
		}
		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "sign: %v\n", err)
		os.Exit(1)
	}

	// Send and confirm
	sig, err := confirm.SendAndConfirmTransactionWithWS(
		ctx, rpcClient, wsClient, tx,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "send tx: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\nNFT minted!\n")
	fmt.Printf("Signature:  %s\n", sig.String())
	fmt.Printf("Explorer:   https://explorer.solana.com/address/%s?cluster=devnet\n", buildResult.Mint)
}

// flagArg extracts a named flag from os.Args.
func flagArg(name string) string {
	for i, a := range os.Args {
		if a == name && i+1 < len(os.Args) {
			return os.Args[i+1]
		}
	}
	return ""
}
```

- [ ] **Step 2: Add `deriveMintKeypair` helper**

```go
import (
	// ... existing imports
	"crypto/sha256"
)

// deriveMintKeypair deterministically derives a keypair for the mint from the wallet + name.
// This mirrors the SHA256 derivation in Rust's derive_mint() in nft.rs.
func deriveMintKeypair(wallet *solana.Wallet, name string) *solana.Wallet {
	h := sha256.New()
	h.Write(wallet.PrivateKey)
	h.Write([]byte(name))
	h.Write([]byte("mint-seed-v1"))
	seed := h.Sum(nil)

	var pk solana.PrivateKey
	copy(pk[:], seed)
	return &solana.Wallet{PrivateKey: pk}
}
```

- [ ] **Step 3: Build to verify compilation**

```bash
go build ./...
```
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add main.go && git commit -m "feat: implement mint command (Go → WASM → Solana)"
```

---

### Task 9: Implement Go get command

**Files:**
- Modify: `main.go` (add `cmdGet`)

- [ ] **Step 1: Add `cmdGet` to `main.go`**

```go
func cmdGet(ctx context.Context) {
	mintAddr := flagArg("--mint")
	if mintAddr == "" {
		fmt.Println("Usage: go run . get --mint <MINT_ADDRESS>")
		os.Exit(1)
	}

	wasm, err := loadWasm(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "load wasm: %v\n", err)
		os.Exit(1)
	}
	defer wasm.Close(ctx)

	rpcClient := rpc.New(devnetRPC)

	// Derive metadata PDA
	mintPK, err := solana.PublicKeyFromBase58(mintAddr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid mint address: %v\n", err)
		os.Exit(1)
	}

	metaProgID := solana.MustPublicKeyFromBase58("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
	metadataPDA, _, err := solana.FindProgramAddress(
		[][]byte{[]byte("metadata"), metaProgID.Bytes(), mintPK.Bytes()},
		metaProgID,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "derive metadata PDA: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Mint:     %s\n", mintAddr)
	fmt.Printf("Metadata: %s\n", metadataPDA.String())

	// Fetch metadata account data
	accountInfo, err := rpcClient.GetAccountInfo(ctx, metadataPDA)
	if err != nil {
		fmt.Fprintf(os.Stderr, "get account info: %v\n", err)
		os.Exit(1)
	}
	if accountInfo == nil || accountInfo.Value == nil {
		fmt.Fprintf(os.Stderr, "metadata account not found — NFT may not exist or be fully initialized\n")
		os.Exit(1)
	}

	// Parse metadata via WASM
	input := map[string]string{
		"metadata_account_data": base64.StdEncoding.EncodeToString(accountInfo.Value.Data.GetBinary()),
	}
	inputJSON, _ := json.Marshal(input)
	output, err := wasm.callWasm(ctx, "parse_metadata", inputJSON)
	if err != nil {
		fmt.Fprintf(os.Stderr, "parse_metadata: %v\n", err)
		os.Exit(1)
	}

	var result struct {
		Key                    uint8  `json:"key"`
		UpdateAuthority        string `json:"update_authority"`
		Mint                   string `json:"mint"`
		Name                   string `json:"name"`
		Symbol                 string `json:"symbol"`
		Uri                    string `json:"uri"`
		SellerFeeBasisPoints   uint16 `json:"seller_fee_basis_points"`
		PrimarySaleHappened    bool   `json:"primary_sale_happened"`
		IsMutable              bool   `json:"is_mutable"`
		EditionNonce           *uint8 `json:"edition_nonce"`
		TokenStandard          *uint8 `json:"token_standard"`
	}
	if err := json.Unmarshal(output, &result); err != nil {
		fmt.Fprintf(os.Stderr, "parse result: %v\n", err)
		os.Exit(1)
	}

	// Print
	fmt.Println()
	fmt.Printf("Name:        %s\n", result.Name)
	fmt.Printf("Symbol:      %s\n", result.Symbol)
	fmt.Printf("URI:         %s\n", result.Uri)
	fmt.Printf("Mutable:     %v\n", result.IsMutable)
	fmt.Printf("Update Auth: %s\n", result.UpdateAuthority)
	if result.EditionNonce != nil {
		fmt.Printf("Edition:     Master (nonce=%d)\n", *result.EditionNonce)
	}
	if result.TokenStandard != nil {
		fmt.Printf("Token Std:   %d\n", *result.TokenStandard)
	}
	fmt.Printf("\nExplorer: https://explorer.solana.com/address/%s?cluster=devnet\n", mintAddr)
}
```

- [ ] **Step 2: Build to verify**

```bash
go build ./...
```
Expected: Compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add main.go && git commit -m "feat: implement get command (fetch and parse NFT metadata)"
```

---

### Task 10: Add Makefile and end-to-end test

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Create `Makefile`**

```makefile
.PHONY: build-wasm build-go mint get clean

WASM_SRC = $(wildcard wasm/src/*.rs) wasm/Cargo.toml
WASM_BIN = wasm/target/wasm32-unknown-unknown/release/solana_nft_wasm.wasm

$(WASM_BIN): $(WASM_SRC)
	cd wasm && cargo build --release --target wasm32-unknown-unknown

build-wasm: $(WASM_BIN)

build-go:
	go build -o demo-binary .

build: build-wasm build-go

# Example: make mint NAME="My NFT" SYMBOL="DEMO" URI="https://example.com/metadata.json"
mint: $(WASM_BIN)
	go run . mint --name "$(NAME)" --symbol "$(SYMBOL)" --uri "$(URI)"

# Example: make get MINT=<mint_address>
get: $(WASM_BIN)
	go run . get --mint "$(MINT)"

clean:
	rm -rf wasm/target demo-binary
```

- [ ] **Step 2: Test WASM build**

```bash
make build-wasm
ls -la wasm/target/wasm32-unknown-unknown/release/solana_nft_wasm.wasm
```
Expected: WASM binary exists, size reported.

- [ ] **Step 3: Commit**

```bash
git add Makefile && git commit -m "chore: add Makefile with build/mint/get targets"
```

---

### Task 11: Integration test (dry-run on Devnet)

- [ ] **Step 1: Build everything**

```bash
make build
```
Expected: WASM and Go binary both build successfully.

- [ ] **Step 2: Prepare a test metadata URI**

Create a simple JSON file or use a public metadata URI. For quick testing, use a known Arweave/IPFS URI or create one with:

```bash
# Use a simple test URI - any publicly accessible JSON works
URI="https://arweave.net/this-is-a-test-uri-for-demo"
```

- [ ] **Step 3: Mint the NFT**

```bash
make mint NAME="Demo NFT" SYMBOL="DEMO" URI="$URI"
```
Expected: Prints wallet address, mint address, metadata address, explorer link, and transaction signature. Note the MINT address.

- [ ] **Step 4: Read back the NFT**

```bash
make get MINT="<MINT_ADDRESS_FROM_STEP_3>"
```
Expected: Prints name "Demo NFT", symbol "DEMO", and the metadata URI.

- [ ] **Step 5: Verify on Solana Explorer**

Navigate to: `https://explorer.solana.com/address/<MINT_ADDRESS>?cluster=devnet`

Expected: The explorer shows the token as an NFT with name, symbol, and metadata.

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A && git commit -m "chore: integration test notes and final adjustments"
```

---

### File Map

```
local-solana-wasm/
├── main.go                 # Go CLI: wazero host, mint/get commands, RPC
├── go.mod
├── go.sum
├── Makefile
└── wasm/
    ├── Cargo.toml
    └── src/
        ├── lib.rs          # WASM exports: alloc, dealloc, build_mint_nft, parse_metadata
        ├── instructions.rs # Instruction builders for SPL Token, ATA, System, Metaplex
        ├── pda.rs          # find_program_address (SHA256-based PDA derivation)
        ├── nft.rs          # High-level mint build logic
        └── parser.rs       # On-chain metadata account parser
```
