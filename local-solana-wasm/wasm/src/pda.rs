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
