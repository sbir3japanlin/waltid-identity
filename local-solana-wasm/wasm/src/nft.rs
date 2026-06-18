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
