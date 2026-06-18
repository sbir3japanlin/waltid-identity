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
    creators: Option<Vec<CreatorRaw>>,
    // Note: collection and uses are NOT part of Data; they're separate fields
    // in the TokenMetadataAccount struct after primary_sale_happened/is_mutable.
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

    let key: u8 = <u8 as BorshDeserialize>::deserialize(&mut cursor).unwrap();
    let update_authority: [u8; 32] = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let mint: [u8; 32] = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let data: MetadataData = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let primary_sale_happened: bool = BorshDeserialize::deserialize(&mut cursor).unwrap();
    let is_mutable: bool = BorshDeserialize::deserialize(&mut cursor).unwrap();

    // edition_nonce: Option<u8>
    let edition_nonce: Option<u8> = if cursor.len() >= 1 {
        BorshDeserialize::deserialize(&mut cursor).unwrap()
    } else {
        None
    };

    // token_standard: Option<u8>
    let token_standard: Option<u8> = if cursor.len() >= 1 {
        BorshDeserialize::deserialize(&mut cursor).unwrap()
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
