// ABOUTME: TypeScript type definitions for Kasanova's wallet provider APIs
// ABOUTME: Covers KasWare-compatible L1 API and EIP-1193 L2 API

// ============================================================================
// KasWare-compatible Provider (window.kasware) — Kaspa L1
// ============================================================================

/** Balance information returned by getBalance() */
export interface KaspaBalance {
  /** Total balance in sompi (1 KAS = 100,000,000 sompi) */
  total: number;
  /** Confirmed balance in sompi */
  confirmed: number;
  /** Unconfirmed balance in sompi */
  unconfirmed: number;
}

/** Options for sendKaspa() */
export interface SendKaspaOptions {
  /** Fee rate override (optional) */
  feeRate?: number;
}

/** Options for signPsbt() / signPsbts() */
export interface SignPsbtOptions {
  /** Whether to auto-finalize after signing */
  autoFinalized?: boolean;
  /** Specific input indices to sign */
  toSignInputs?: Array<{
    index: number;
    address?: string;
    publicKey?: string;
    sighashTypes?: number[];
  }>;
}

/** Event names emitted by the KasWare provider */
export type KaswareEvent =
  | 'connect'
  | 'disconnect'
  | 'unlock'
  | 'lock'
  | 'accountsChanged'
  | 'networkChanged';

/** Network identifiers used by KasWare API */
export type KaspaNetwork =
  | 'kaspa_mainnet'
  | 'kaspa_testnet'
  | 'kaspa_devnet'
  | 'kaspa_simnet';

/** Signature algorithm for signMessage() */
export type SignatureType = 'ecdsa' | 'schnorr';

/**
 * KasWare-compatible wallet provider.
 *
 * Kasanova injects this as `window.kasware` inside its in-app dApp browser.
 * The API is fully compatible with KasWare, so any dApp that works with
 * KasWare will work with Kasanova without code changes.
 */
export interface KaswareProvider {
  // === Account Methods ===

  /**
   * Request wallet connection. Shows approval UI to the user.
   * @returns Array with the connected Kaspa address
   */
  requestAccounts(): Promise<string[]>;

  /**
   * Get currently connected accounts (no approval needed).
   * Returns empty array if not connected.
   */
  getAccounts(): Promise<string[]>;

  /**
   * Get the connected account's public key (hex-encoded, X-only).
   */
  getPublicKey(): Promise<string>;

  /**
   * Get the connected account's balance.
   */
  getBalance(): Promise<KaspaBalance>;

  // === Network Methods ===

  /**
   * Get the current network.
   * @returns Network string like 'kaspa_mainnet' or 'kaspa_testnet'
   */
  getNetwork(): Promise<KaspaNetwork>;

  /**
   * Request a network switch.
   * @remarks Not yet implemented — will throw an error.
   * @param network - Target network identifier
   */
  switchNetwork(network: KaspaNetwork): Promise<KaspaNetwork>;

  // === Transaction Methods ===

  /**
   * Send KAS to an address. Shows approval UI with amount and fee breakdown.
   * @param toAddress - Recipient Kaspa address
   * @param sompi - Amount in sompi (1 KAS = 100,000,000 sompi)
   * @param options - Optional fee rate override
   * @returns Transaction ID
   */
  sendKaspa(toAddress: string, sompi: number, options?: SendKaspaOptions): Promise<string>;

  /**
   * Sign a PSKT (Partially Signed Kaspa Transaction). Shows approval UI.
   * @remarks Not yet implemented — will throw an error.
   * @param psbtHex - Hex-encoded PSKT
   * @param options - Signing options
   * @returns Signed PSKT hex
   */
  signPsbt(psbtHex: string, options?: SignPsbtOptions): Promise<string>;

  /**
   * Sign multiple PSKTs. Shows approval UI.
   * @remarks Not yet implemented — will throw an error.
   * @param psbtHexs - Array of hex-encoded PSKTs
   * @param options - Array of signing options (one per PSKT)
   * @returns Array of signed PSKT hexes
   */
  signPsbts(psbtHexs: string[], options?: SignPsbtOptions[]): Promise<string[]>;

  /**
   * Broadcast a raw transaction to the network.
   * @remarks Not yet implemented — will throw an error.
   * @param rawTx - Raw transaction hex
   * @returns Transaction ID
   */
  pushTx(rawTx: string): Promise<string>;

  /**
   * Finalize and broadcast a signed PSKT.
   * @remarks Not yet implemented — will throw an error.
   * @param psbtHex - Signed PSKT hex
   * @returns Transaction ID
   */
  pushPsbt(psbtHex: string): Promise<string>;

  // === Message Signing ===

  /**
   * Sign a message with the connected wallet. Shows approval UI.
   * @param message - Message to sign (UTF-8 string)
   * @param type - Signature algorithm: 'schnorr' (default) or 'ecdsa'
   * @returns Signature hex string
   */
  signMessage(message: string, type?: SignatureType): Promise<string>;

  // === Utility ===

  /**
   * Get the wallet version string.
   */
  getVersion(): Promise<string>;

  // === Event Handling ===

  /**
   * Subscribe to a provider event.
   *
   * Events:
   * - `connect` — Provider ready
   * - `disconnect` — Connection lost
   * - `accountsChanged` — Active account changed (data: string[])
   * - `networkChanged` — Network switched (data: string)
   * - `lock` — Wallet locked (session expired)
   * - `unlock` — Wallet unlocked (biometric passed)
   */
  on(event: KaswareEvent, handler: (data?: any) => void): void;

  /**
   * Unsubscribe from a provider event.
   */
  removeListener(event: KaswareEvent, handler: (data?: any) => void): void;

}

// ============================================================================
// EIP-1193 Provider (window.ethereum) — Kasplex L2
// ============================================================================

/** EIP-1193 JSON-RPC request */
export interface EthereumRequestArgs {
  method: string;
  params?: any[];
}

/** EIP-1193 event names */
export type EthereumEvent =
  | 'connect'
  | 'disconnect'
  | 'chainChanged'
  | 'accountsChanged'
  | 'message';

/**
 * EIP-1193 compatible Ethereum provider for Kasplex L2.
 *
 * Kasanova injects this as `window.ethereum` when browsing L2 dApps.
 * Compatible with MetaMask and other EIP-1193 wallets.
 *
 * Identifies itself via:
 * - `isMetaMask: true` (for compatibility)
 * - `isKasanova: true` (for detection)
 */
export interface KasanovaEthereumProvider {
  /** EIP-1193 standard request method */
  request(args: EthereumRequestArgs): Promise<any>;

  /** Legacy MetaMask enable() method */
  enable(): Promise<string[]>;

  /** Legacy send method (supports both calling conventions) */
  send(methodOrPayload: string | EthereumRequestArgs, params?: any[]): Promise<any>;

  /** Legacy async send */
  sendAsync(payload: any, callback: (error: Error | null, result: any) => void): void;

  /** Subscribe to events */
  on(event: EthereumEvent, handler: (data?: any) => void): this;

  /** Unsubscribe from events */
  removeListener(event: EthereumEvent, handler: (data?: any) => void): this;

  /** Remove all listeners for an event (or all events) */
  removeAllListeners(event?: EthereumEvent): this;

  /** True — for MetaMask compatibility */
  readonly isMetaMask: boolean;

  /** True — identifies Kasanova specifically */
  readonly isKasanova: boolean;

  /** Current chain ID (hex string, e.g., '0x1') */
  readonly chainId: string | null;

  /** Currently selected address */
  readonly selectedAddress: string | null;

  /** Network version (decimal string) */
  readonly networkVersion: string | null;

  /** Whether the provider is connected */
  readonly isConnected: boolean;
}

// ============================================================================
// Kasanova Namespace (window.kasanova)
// ============================================================================

/**
 * Kasanova namespace object.
 *
 * **Work in Progress** — not yet available in production builds.
 *
 * Injected as `window.kasanova` alongside the KasWare-compatible provider.
 * Provides direct detection and references to all injected providers.
 */
export interface KasanovaNamespace {
  /** Always true — confirms this is Kasanova */
  readonly isKasanova: true;
  /** Kasanova bridge version */
  readonly version: string;
  /** Reference to the KasWare-compatible L1 provider */
  readonly kasware: KaswareProvider;
}

// ============================================================================
// Global type augmentation
// ============================================================================

declare global {
  interface Window {
    /** Kasanova namespace — the simplest way to detect Kasanova */
    kasanova?: KasanovaNamespace;
    /** KasWare-compatible Kaspa L1 provider (injected by Kasanova) */
    kasware?: KaswareProvider;
    /** EIP-1193 Ethereum provider for Kasplex L2 (injected by Kasanova, in development) */
    ethereum?: KasanovaEthereumProvider;
  }
}
