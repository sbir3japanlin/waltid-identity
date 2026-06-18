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
pub extern "C" fn build_mint_nft(ptr: *const u8, len: u32) -> u64 {
    let input: nft::MintInput = read_input(ptr, len);
    let result = nft::build(&input);
    let json = serde_json::to_string(&result).unwrap();
    write_json_return(&json)
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
