// ABOUTME: React hook and component example for Kasanova wallet integration
// ABOUTME: Shows detect → connect → send → sign flow with React state management

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types (copy from @kasanovaio/dapp-sdk or define inline)
// ---------------------------------------------------------------------------

interface KaspaBalance {
  total: number;
  confirmed: number;
  unconfirmed: number;
}

interface KaswareProvider {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<KaspaBalance>;
  getNetwork(): Promise<string>;
  sendKaspa(to: string, sompi: number, opts?: { feeRate?: number }): Promise<string>;
  signMessage(message: string, type?: 'ecdsa' | 'schnorr'): Promise<string>;
  getVersion(): Promise<string>;
  on(event: string, handler: (data?: any) => void): void;
  removeListener(event: string, handler: (data?: any) => void): void;
}

declare global {
  interface Window {
    kasware?: KaswareProvider;
  }
}

// ---------------------------------------------------------------------------
// useKasanova — React hook for wallet connection
// ---------------------------------------------------------------------------

interface KasanovaState {
  /** Whether the provider has been detected */
  detected: boolean;
  /** Whether the wallet is connected */
  connected: boolean;
  /** Connected Kaspa address (null if not connected) */
  address: string | null;
  /** Current network (e.g., 'kaspa_mainnet') */
  network: string | null;
  /** Balance in sompi */
  balance: KaspaBalance | null;
  /** True while an async operation is in progress */
  loading: boolean;
  /** Last error message (null if no error) */
  error: string | null;
}

export function useKasanova() {
  const [state, setState] = useState<KasanovaState>({
    detected: false,
    connected: false,
    address: null,
    network: null,
    balance: null,
    loading: false,
    error: null,
  });

  // Detect provider on mount
  useEffect(() => {
    const check = () => {
      if (window.kasware) {
        setState((s) => ({ ...s, detected: true }));
        return true;
      }
      return false;
    };

    if (check()) return;

    // Wait for initialization event
    const onInit = () => check();
    window.addEventListener('kasware#initialized', onInit);
    window.addEventListener('kasanova:ready', onInit);

    const timeout = setTimeout(() => {
      if (!window.kasware) {
        setState((s) => ({
          ...s,
          error: 'Kasanova wallet not detected. Open this page inside Kasanova.',
        }));
      }
    }, 3000);

    return () => {
      window.removeEventListener('kasware#initialized', onInit);
      window.removeEventListener('kasanova:ready', onInit);
      clearTimeout(timeout);
    };
  }, []);

  // Subscribe to provider events
  useEffect(() => {
    const kasware = window.kasware;
    if (!kasware) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState((s) => ({ ...s, connected: false, address: null, balance: null }));
      } else {
        setState((s) => ({ ...s, address: accounts[0] }));
      }
    };

    const onNetworkChanged = (network: string) => {
      setState((s) => ({ ...s, network }));
    };

    const onDisconnect = () => {
      setState((s) => ({ ...s, connected: false, address: null, balance: null }));
    };

    kasware.on('accountsChanged', onAccountsChanged);
    kasware.on('networkChanged', onNetworkChanged);
    kasware.on('disconnect', onDisconnect);

    return () => {
      kasware.removeListener('accountsChanged', onAccountsChanged);
      kasware.removeListener('networkChanged', onNetworkChanged);
      kasware.removeListener('disconnect', onDisconnect);
    };
  }, [state.detected]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!window.kasware) return;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const accounts = await window.kasware.requestAccounts();
      const network = await window.kasware.getNetwork();
      const balance = await window.kasware.getBalance();

      setState((s) => ({
        ...s,
        connected: true,
        address: accounts[0],
        network,
        balance,
        loading: false,
      }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Connection rejected',
      }));
    }
  }, []);

  // Send KAS
  const sendKaspa = useCallback(
    async (toAddress: string, amountKas: number): Promise<string | null> => {
      if (!window.kasware) return null;
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const sompi = Math.round(amountKas * 100_000_000);
        const txid = await window.kasware.sendKaspa(toAddress, sompi);
        setState((s) => ({ ...s, loading: false }));
        return txid;
      } catch (err: any) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
        return null;
      }
    },
    [],
  );

  // Sign message
  const signMessage = useCallback(
    async (message: string, type: 'schnorr' | 'ecdsa' = 'schnorr'): Promise<string | null> => {
      if (!window.kasware) return null;
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const sig = await window.kasware.signMessage(message, type);
        setState((s) => ({ ...s, loading: false }));
        return sig;
      } catch (err: any) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
        return null;
      }
    },
    [],
  );

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!window.kasware) return;
    try {
      const balance = await window.kasware.getBalance();
      setState((s) => ({ ...s, balance }));
    } catch (err: any) {
      setState((s) => ({ ...s, error: err.message }));
    }
  }, []);

  return {
    ...state,
    connect,
    sendKaspa,
    signMessage,
    refreshBalance,
  };
}

// ---------------------------------------------------------------------------
// Example Component — drop this into your React app
// ---------------------------------------------------------------------------

export default function KasanovaWallet() {
  const {
    detected,
    connected,
    address,
    network,
    balance,
    loading,
    error,
    connect,
    sendKaspa,
    signMessage,
    refreshBalance,
  } = useKasanova();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('Hello from my dApp!');
  const [lastResult, setLastResult] = useState<string | null>(null);

  const balanceKas = balance ? (balance.confirmed / 100_000_000).toFixed(4) : '—';

  if (!detected) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
        {error || 'Detecting Kasanova wallet...'}
      </div>
    );
  }

  if (!connected) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <button onClick={connect} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect to Kasanova'}
        </button>
        {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      {/* Wallet Info */}
      <div style={{ marginBottom: 16 }}>
        <div><strong>Address:</strong> {address}</div>
        <div><strong>Network:</strong> {network}</div>
        <div>
          <strong>Balance:</strong> {balanceKas} KAS{' '}
          <button onClick={refreshBalance} style={{ fontSize: 12 }}>Refresh</button>
        </div>
      </div>

      {/* Send KAS */}
      <div style={{ marginBottom: 16 }}>
        <h3>Send KAS</h3>
        <input
          placeholder="Recipient address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{ width: '100%', marginBottom: 4 }}
        />
        <input
          type="number"
          placeholder="Amount (KAS)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: '100%', marginBottom: 4 }}
        />
        <button
          disabled={loading}
          onClick={async () => {
            const txid = await sendKaspa(recipient, parseFloat(amount));
            if (txid) setLastResult(`Sent! txid: ${txid}`);
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Sign Message */}
      <div style={{ marginBottom: 16 }}>
        <h3>Sign Message</h3>
        <input
          placeholder="Message to sign"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: '100%', marginBottom: 4 }}
        />
        <button
          disabled={loading}
          onClick={async () => {
            const sig = await signMessage(message, 'schnorr');
            if (sig) setLastResult(`Signature: ${sig}`);
          }}
        >
          Sign (Schnorr)
        </button>
      </div>

      {/* Results */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {lastResult && (
        <pre style={{ fontSize: 12, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
          {lastResult}
        </pre>
      )}
    </div>
  );
}
