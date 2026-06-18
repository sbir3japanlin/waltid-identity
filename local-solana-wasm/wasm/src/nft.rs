use crate::instructions::{self, InstructionOut, decode_b58_32};
use serde::{Serialize, Deserialize};

#[derive(Deserialize)]
pub struct MintInput {
    pub wallet_pubkey: String,       // base58
    pub mint_pubkey: String,         // base58 — Go generates this keypair
    pub ata: String,                 // base58 — Go derives this PDA
    pub metadata_pda: String,        // base58 — Go derives this PDA
    pub master_edition_pda: String,  // base58 — Go derives this PDA
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

pub fn build(input: &MintInput) -> BuildResult {
    let wallet = decode_b58_32(&input.wallet_pubkey);
    let mint = decode_b58_32(&input.mint_pubkey);
    let ata = decode_b58_32(&input.ata);
    let metadata_pda = decode_b58_32(&input.metadata_pda);
    let edition_pda = decode_b58_32(&input.master_edition_pda);

    let token_prog_id = decode_b58_32(instructions::TOKEN_PROGRAM_ID);

    let mint_rent = 1_461_600u64; // 82 bytes mint account

    let instructions = vec![
        // 1. Create mint account
        instructions::system_create_account(&wallet, &mint, mint_rent, 82, &token_prog_id),
        // 2. Initialize mint (0 decimals = NFT, freeze_authority = wallet)
        instructions::initialize_mint(&mint, &wallet, &wallet, 0),
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
