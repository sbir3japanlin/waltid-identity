package main

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
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
	priv, err := solana.PrivateKeyFromSolanaKeygenFile(walletPath)
	if err != nil {
		return nil, fmt.Errorf("load wallet: %w", err)
	}
	return &solana.Wallet{PrivateKey: priv}, nil
}

// --- Instruction conversion types ---

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
	Instructions  []WasmInstruction `json:"instructions"`
	Mint          string            `json:"mint"`
	Metadata      string            `json:"metadata"`
	MasterEdition string            `json:"master_edition"`
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

// --- Mint keypair derivation ---

func deriveMintKeypair(wallet *solana.Wallet, name string) *solana.Wallet {
	h := sha256.New()
	h.Write(wallet.PrivateKey)
	h.Write([]byte(name))
	h.Write([]byte("mint-seed-v1"))
	seed := h.Sum(nil)

	priv := ed25519.NewKeyFromSeed(seed)
	return &solana.Wallet{PrivateKey: solana.PrivateKey(priv)}
}

// --- Flag parsing ---

func flagArg(name string) string {
	for i, a := range os.Args {
		if a == name && i+1 < len(os.Args) {
			return os.Args[i+1]
		}
	}
	return ""
}

// --- Main CLI dispatch ---

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

func cmdMint(ctx context.Context) {
	// 1. Parse flags
	name := flagArg("--name")
	symbol := flagArg("--symbol")
	uri := flagArg("--uri")

	if name == "" || uri == "" {
		fmt.Fprintln(os.Stderr, "Usage: go run . mint --name <name> --symbol <symbol> --uri <uri>")
		os.Exit(1)
	}

	// 2. Load wallet
	wallet, err := loadWallet()
	if err != nil {
		fmt.Fprintf(os.Stderr, "load wallet: %v\n", err)
		os.Exit(1)
	}

	// 3. Load WASM module
	wasm, err := loadWasm(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "load wasm: %v\n", err)
		os.Exit(1)
	}
	defer wasm.Close(ctx)

	// 4. Derive mint keypair deterministically
	mintKP := deriveMintKeypair(wallet, name)
	mintPubkey := mintKP.PublicKey()
	fmt.Fprintf(os.Stderr, "Mint:       %s\n", mintPubkey.String())

	// 4b. Check if mint already exists on-chain (make demo re-runnable)
	checkClient := rpc.New(rpc.DevNet_RPC)
	acctInfo, _ := checkClient.GetAccountInfo(ctx, mintPubkey)
	if acctInfo != nil && acctInfo.GetBinary() != nil {
		fmt.Fprintf(os.Stderr, "Mint already exists, skipping creation.\n")
		fmt.Printf("Mint address: %s\n", mintPubkey.String())
		return
	}

	// 5. Derive PDAs using solana-go (verified on-chain implementation)
	metaProgID := solana.MustPublicKeyFromBase58("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
	tokenProgID := solana.MustPublicKeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
	ataProgID := solana.MustPublicKeyFromBase58("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")

	metadataPDA, _, err := solana.FindProgramAddress(
		[][]byte{[]byte("metadata"), metaProgID.Bytes(), mintPubkey.Bytes()},
		metaProgID,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "derive metadata PDA: %v\n", err)
		os.Exit(1)
	}

	editionPDA, _, err := solana.FindProgramAddress(
		[][]byte{[]byte("metadata"), metaProgID.Bytes(), mintPubkey.Bytes(), []byte("edition")},
		metaProgID,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "derive edition PDA: %v\n", err)
		os.Exit(1)
	}

	ataAddr, _, err := solana.FindProgramAddress(
		[][]byte{wallet.PublicKey().Bytes(), tokenProgID.Bytes(), mintPubkey.Bytes()},
		ataProgID,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "derive ATA: %v\n", err)
		os.Exit(1)
	}
	fmt.Fprintf(os.Stderr, "ATA:        %s\n", ataAddr.String())
	fmt.Fprintf(os.Stderr, "Metadata:   %s\n", metadataPDA.String())

	// 6. Build input and call WASM build_mint_nft
	inputMap := map[string]string{
		"wallet_pubkey":        wallet.PublicKey().String(),
		"mint_pubkey":          mintPubkey.String(),
		"ata":                  ataAddr.String(),
		"metadata_pda":         metadataPDA.String(),
		"master_edition_pda":   editionPDA.String(),
		"name":                 name,
		"symbol":               symbol,
		"uri":                  uri,
	}
	inputJSON, err := json.Marshal(inputMap)
	if err != nil {
		fmt.Fprintf(os.Stderr, "marshal input: %v\n", err)
		os.Exit(1)
	}

	output, err := wasm.callWasm(ctx, "build_mint_nft", inputJSON)
	if err != nil {
		fmt.Fprintf(os.Stderr, "wasm call: %v\n", err)
		os.Exit(1)
	}

	// 6. Parse the BuildResultJSON
	var result BuildResultJSON
	if err := json.Unmarshal(output, &result); err != nil {
		fmt.Fprintf(os.Stderr, "parse wasm output: %v\n", err)
		os.Exit(1)
	}

	// 7. Convert WASM instructions to solana-go types
	solInstrs, err := toSolanaInstructions(result.Instructions)
	if err != nil {
		fmt.Fprintf(os.Stderr, "convert instructions: %v\n", err)
		os.Exit(1)
	}

	// 8. Create RPC client
	rpcClient := rpc.New(rpc.DevNet_RPC)

	// 9. Fetch recent blockhash
	recent, err := rpcClient.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		fmt.Fprintf(os.Stderr, "get recent blockhash: %v\n", err)
		os.Exit(1)
	}

	// 10. Build transaction
	tx, err := solana.NewTransaction(
		solInstrs,
		recent.Value.Blockhash,
		solana.TransactionPayer(wallet.PublicKey()),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "build transaction: %v\n", err)
		os.Exit(1)
	}

	// 11. Sign with wallet and mint keypair
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
		fmt.Fprintf(os.Stderr, "sign transaction: %v\n", err)
		os.Exit(1)
	}

	// 12. Send transaction (with preflight checks)
	sig, err := rpcClient.SendTransaction(ctx, tx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "send transaction: %v\n", err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "Transaction sent: %s\n", sig.String())
	fmt.Fprintf(os.Stderr, "Explorer: https://explorer.solana.com/tx/%s?cluster=devnet\n", sig.String())

	// 13. Confirm by polling GetSignatureStatuses
	fmt.Fprintf(os.Stderr, "Waiting for confirmation")
	for i := 0; i < 30; i++ {
		time.Sleep(1 * time.Second)

		status, err := rpcClient.GetSignatureStatuses(ctx, false, sig)
		if err != nil {
			fmt.Fprintf(os.Stderr, ".")
			continue
		}

		if len(status.Value) > 0 && status.Value[0] != nil {
			s := status.Value[0]
			if s.Err != nil {
				fmt.Fprintf(os.Stderr, "\nTransaction failed: %v\n", s.Err)
				os.Exit(1)
			}
			if s.ConfirmationStatus == rpc.ConfirmationStatusConfirmed ||
				s.ConfirmationStatus == rpc.ConfirmationStatusFinalized {
				fmt.Fprintf(os.Stderr, "\nTransaction confirmed in slot %d!\n", s.Slot)
				fmt.Printf("Mint address: %s\n", result.Mint)
				return
			}
		}
		fmt.Fprintf(os.Stderr, ".")
	}

	fmt.Fprintln(os.Stderr, "\nTransaction not confirmed after 30 seconds")
	fmt.Printf("Mint address: %s\n", result.Mint)
}

// ParseResultJSON mirrors the Rust ParseResult struct from the WASM module.
type ParseResultJSON struct {
	Key                  uint8  `json:"key"`
	UpdateAuthority      string `json:"update_authority"`
	Mint                 string `json:"mint"`
	Name                 string `json:"name"`
	Symbol               string `json:"symbol"`
	Uri                  string `json:"uri"`
	SellerFeeBasisPoints uint16 `json:"seller_fee_basis_points"`
	PrimarySaleHappened  bool   `json:"primary_sale_happened"`
	IsMutable            bool   `json:"is_mutable"`
	EditionNonce         *uint8 `json:"edition_nonce"`
	TokenStandard        *uint8 `json:"token_standard"`
}

func cmdGet(ctx context.Context) {
	// 1. Parse --mint flag
	mintB58 := flagArg("--mint")
	if mintB58 == "" {
		fmt.Fprintln(os.Stderr, "Usage: go run . get --mint <mint_address>")
		os.Exit(1)
	}

	// 2. Load WASM
	wasm, err := loadWasm(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "load wasm: %v\n", err)
		os.Exit(1)
	}
	defer wasm.Close(ctx)

	// 3. Create RPC client
	rpcClient := rpc.New(devnetRPC)

	// 4. Parse mint public key
	mintPK, err := solana.PublicKeyFromBase58(mintB58)
	if err != nil {
		fmt.Fprintf(os.Stderr, "parse mint pubkey: %v\n", err)
		os.Exit(1)
	}

	// 5. Derive metadata PDA
	metaProgID := solana.MustPublicKeyFromBase58("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
	metadataPDA, _, err := solana.FindProgramAddress(
		[][]byte{[]byte("metadata"), metaProgID.Bytes(), mintPK.Bytes()},
		metaProgID,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "derive metadata PDA: %v\n", err)
		os.Exit(1)
	}
	fmt.Fprintf(os.Stderr, "Metadata PDA: %s\n", metadataPDA.String())

	// 6. Fetch metadata account data
	result, err := rpcClient.GetAccountInfo(ctx, metadataPDA)
	if err != nil {
		fmt.Fprintf(os.Stderr, "get account info: %v\n", err)
		os.Exit(1)
	}

	// 7. Get binary data and base64-encode it for WASM
	data := result.GetBinary()
	if data == nil {
		fmt.Fprintln(os.Stderr, "account data is empty")
		os.Exit(1)
	}
	dataB64 := base64.StdEncoding.EncodeToString(data)

	// 8. Build input and call WASM parse_metadata
	inputMap := map[string]string{
		"metadata_account_data": dataB64,
	}
	inputJSON, err := json.Marshal(inputMap)
	if err != nil {
		fmt.Fprintf(os.Stderr, "marshal input: %v\n", err)
		os.Exit(1)
	}

	output, err := wasm.callWasm(ctx, "parse_metadata", inputJSON)
	if err != nil {
		fmt.Fprintf(os.Stderr, "wasm call: %v\n", err)
		os.Exit(1)
	}

	// 9. Parse the result
	var resultJSON ParseResultJSON
	if err := json.Unmarshal(output, &resultJSON); err != nil {
		fmt.Fprintf(os.Stderr, "parse wasm output: %v\n", err)
		os.Exit(1)
	}

	// 10. Print all fields
	fmt.Printf("key: %d\n", resultJSON.Key)
	fmt.Printf("update_authority: %s\n", resultJSON.UpdateAuthority)
	fmt.Printf("mint: %s\n", resultJSON.Mint)
	fmt.Printf("name: %s\n", strings.TrimRight(resultJSON.Name, "\x00"))
	fmt.Printf("symbol: %s\n", strings.TrimRight(resultJSON.Symbol, "\x00"))
	fmt.Printf("uri: %s\n", strings.TrimRight(resultJSON.Uri, "\x00"))
	fmt.Printf("seller_fee_basis_points: %d\n", resultJSON.SellerFeeBasisPoints)
	fmt.Printf("primary_sale_happened: %t\n", resultJSON.PrimarySaleHappened)
	fmt.Printf("is_mutable: %t\n", resultJSON.IsMutable)

	if resultJSON.EditionNonce != nil {
		fmt.Printf("edition_nonce: %d\n", *resultJSON.EditionNonce)
	} else {
		fmt.Printf("edition_nonce: null\n")
	}

	if resultJSON.TokenStandard != nil {
		fmt.Printf("token_standard: %d\n", *resultJSON.TokenStandard)
	} else {
		fmt.Printf("token_standard: null\n")
	}

	// 11. Print explorer link
	fmt.Printf("Explorer: https://explorer.solana.com/address/%s?cluster=devnet\n", metadataPDA.String())
}
