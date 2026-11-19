// ABOUTME: TypeScript type definitions for Kasanova's wallet provider APIs
// ABOUTME: Covers the KasWare-compatible Kaspa L1 API

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

/** A KCC-20 holder state from Trestly's transaction builder. */
export interface Kcc20State {
  amount: string | number | bigint;
  owner: string;
  ownerScheme: number;
  borrowScheme: number;
  borrowGuard: string;
  extensionCommitment: string;
}

export interface TrestlyPositionState {
  tokenCovid: string;
  shares: string | number | bigint;
  owner: string;
}

export interface TrestlyPoolState {
  tokenCovid: string;
  admin: string;
  guardian: string;
  paused: boolean;
  kasReserve: string | number | bigint;
  tokenReserve: string | number | bigint;
  totalShares: string | number | bigint;
  protocolKas: string | number | bigint;
  protocolTokens: string | number | bigint;
  baseValue: string | number | bigint;
  maxOutBps: string | number | bigint;
  windowLen: string | number | bigint;
  windowCredit: string | number | bigint;
  windowRef: string | number | bigint;
  windowOut: string | number | bigint;
}

type WireState<T> = { [K in keyof T]: bigint extends T[K] ? string : T[K] };
type IndexedState<T> = { index: number; state: WireState<T> };

export interface Kcc20SignRequest {
  txJsonString: string;
  options: {
    signInputs: Array<{ index: number; sighashType: 1 }>;
    tokenOutputs: Array<IndexedState<Kcc20State>>;
    positionInputs?: Array<IndexedState<TrestlyPositionState>>;
    positionOutputs?: Array<IndexedState<TrestlyPositionState>>;
    poolOutputs?: Array<IndexedState<TrestlyPoolState>>;
  };
}

/** Options for signPsbt() / signPsbts() */
export interface SignPsbtOptions {
  /** Kasanova KCOM signing scope. */
  inputIndexes?: number[];
  inputIndex?: number;
  sigHashType?: 1 | 129;
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
  | 'kaspa_testnet';

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
   * @param psbtHex - Hex-encoded PSKT
   * @param options - Signing options
   * @returns Signed PSKT hex
   */
  signPsbt(psbtHex: string, options?: SignPsbtOptions): Promise<string>;

  /**
   * Sign multiple PSKTs. Shows approval UI.
   * @param psbtHexs - Array of hex-encoded PSKTs
   * @param options - Shared signing options for the batch in Kasanova
   * @returns Array of signed PSKT hexes
   */
  signPsbts(psbtHexs: string[], options?: SignPsbtOptions | SignPsbtOptions[]): Promise<string[]>;

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
// Kasanova Namespace (window.kasanova)
// ============================================================================

/**
 * Kasanova namespace object.
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
  /** Present when this wallet supports KCC-20 SafeJSON signing with state proofs. */
  signPskt?(request: Kcc20SignRequest): Promise<string>;
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
  }
}
