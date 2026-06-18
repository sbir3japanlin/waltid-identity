package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"os"

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

// --- Mint keypair derivation (matches Rust derive_mint) ---

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
	fmt.Fprintln(os.Stderr, "not implemented yet")
	os.Exit(1)
}

func cmdGet(ctx context.Context) {
	fmt.Fprintln(os.Stderr, "not implemented yet")
	os.Exit(1)
}
