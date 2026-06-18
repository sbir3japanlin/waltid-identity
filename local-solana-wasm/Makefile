.PHONY: build-wasm build-go mint get clean

WASM_SRC = $(wildcard wasm/src/*.rs) wasm/Cargo.toml
WASM_BIN = wasm/target/wasm32-unknown-unknown/release/solana_nft_wasm.wasm

$(WASM_BIN): $(WASM_SRC)
	cd wasm && cargo build --release --target wasm32-unknown-unknown

build-wasm: $(WASM_BIN)

build-go:
	go build -o demo-binary .

build: build-wasm build-go

mint: $(WASM_BIN)
	go run . mint --name "$(NAME)" --symbol "$(SYMBOL)" --uri "$(URI)"

get: $(WASM_BIN)
	go run . get --mint "$(MINT)"

clean:
	rm -rf wasm/target demo-binary
