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
pub fn initialize_mint(mint: &[u8; 32], mint_authority: &[u8; 32], freeze_authority: &[u8; 32], decimals: u8) -> InstructionOut {
    let mut data = vec![0u8]; // tag
    data.push(decimals);
    data.extend_from_slice(mint_authority);
    data.push(1); // COption::Some for freeze_authority (required by Metaplex for NFTs)
    data.extend_from_slice(freeze_authority);
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
