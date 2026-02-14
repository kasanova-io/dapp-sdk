# Kasanova dApp SDK

TypeScript types, detection helpers, and examples for integrating **Kasanova** as a wallet provider in your Kaspa dApp.

Kasanova's dApp browser injects a **KasWare-compatible** `window.kasware` provider (L1) and an **EIP-1193 compatible** `window.ethereum` provider (L2). If your dApp already works with KasWare or MetaMask, it works with Kasanova — zero code changes needed.

This SDK gives you:
- Full TypeScript types for both provider APIs
- Detection and connection helpers
- Working examples (vanilla JS + React)

## Quick Start

### Install

```bash
npm install @aspect-build/kasanova-dapp-sdk
```

### Detect & Connect (TypeScript)

```ts
import { waitForKasware } from '@aspect-build/kasanova-dapp-sdk';

async function connect() {
  try {
    const kasware = await waitForKasware();
    const accounts = await kasware.requestAccounts(); // Shows approval UI
    console.log('Connected:', accounts[0]);

    const balance = await kasware.getBalance();
    console.log('Balance:', balance.confirmed / 1e8, 'KAS');
  } catch {
    console.log('Kasanova wallet not found');
  }
}
```

### Detect & Connect (Plain JavaScript)

No build step needed — just check `window.kasware`:

```html
<script>
  function onReady() {
    window.kasware.requestAccounts().then(accounts => {
      console.log('Connected:', accounts[0]);
    });
  }

  if (window.kasware) {
    onReady();
  } else {
    window.addEventListener('kasware#initialized', onReady);
  }
</script>
```

## How It Works

When a user opens your dApp inside Kasanova's built-in browser, the app injects JavaScript providers into the page before your code runs:

```
┌───────────────────────────────────────────────┐
│              Kasanova Mobile App               │
│  ┌─────────────────────────────────────────┐  │
│  │         In-App WebView (your dApp)      │  │
│  │                                         │  │
│  │   window.kasware  ← L1 KasWare API     │  │
│  │   window.ethereum ← L2 EIP-1193 API    │  │
│  │                                         │  │
│  │   Your dApp code calls these providers  │  │
│  │   ↓                                     │  │
│  │   Kasanova shows approval UI            │  │
│  │   ↓                                     │  │
│  │   User swipes to confirm                │  │
│  │   ↓                                     │  │
│  │   Transaction signed & broadcast        │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

**Sensitive operations** (connect, send, sign) show a native approval sheet that the user must confirm. Read-only operations (getBalance, getNetwork) resolve immediately.

## API Reference — L1 (window.kasware)

The KasWare-compatible provider for Kaspa L1 operations.

### Account Methods

#### `requestAccounts()`
Request wallet connection. Shows an approval UI to the user.

```ts
const accounts: string[] = await window.kasware.requestAccounts();
// accounts[0] = "kaspa:qr..."
```

- First call for an origin shows the connection approval sheet
- Subsequent calls return the cached address (until the user revokes)
- Throws if the user rejects

#### `getAccounts()`
Get connected accounts without triggering approval.

```ts
const accounts: string[] = await window.kasware.getAccounts();
// Returns [] if not connected
```

#### `getPublicKey()`
Get the connected account's X-only public key (hex).

```ts
const pubkey: string = await window.kasware.getPublicKey();
// "a1b2c3..." (64-character hex string)
```

#### `getBalance()`
Get the connected account's balance.

```ts
const balance = await window.kasware.getBalance();
// { total: 1234500000, confirmed: 1234500000, unconfirmed: 0 }

const kas = balance.confirmed / 100_000_000; // Convert sompi to KAS
```

> **Note:** 1 KAS = 100,000,000 sompi

### Network Methods

#### `getNetwork()`
Get the current Kaspa network.

```ts
const network: string = await window.kasware.getNetwork();
// "kaspa_mainnet" | "kaspa_testnet" | "kaspa_simnet"
```

| Network String   | Environment |
|-----------------|-------------|
| `kaspa_mainnet` | Mainnet     |
| `kaspa_testnet` | Testnet 11  |
| `kaspa_simnet`  | Local dev   |

#### `switchNetwork(network)`
Request a network switch. Shows approval UI.

```ts
await window.kasware.switchNetwork('kaspa_testnet');
```

### Transaction Methods

#### `sendKaspa(toAddress, sompi, options?)`
Send KAS. Shows approval UI with amount, recipient, and fee breakdown.

```ts
const txid: string = await window.kasware.sendKaspa(
  'kaspa:qr...recipient',
  500_000_000, // 5 KAS in sompi
  { feeRate: undefined } // optional fee override
);
console.log('Transaction:', txid);
```

- Amount is in **sompi** (multiply KAS by 100,000,000)
- Fee is calculated automatically
- User sees the full breakdown before confirming
- Returns the transaction ID on success

#### `signPsbt(psbtHex, options?)`
Sign a PSKT (Partially Signed Kaspa Transaction). Shows approval UI.

```ts
const signedPsbt: string = await window.kasware.signPsbt(psbtHex, {
  autoFinalized: true,
  toSignInputs: [{ index: 0 }],
});
```

#### `signPsbts(psbtHexs, options?)`
Sign multiple PSKTs in batch.

```ts
const signed: string[] = await window.kasware.signPsbts(
  [psbt1Hex, psbt2Hex],
  [{ autoFinalized: true }, { autoFinalized: true }],
);
```

#### `pushTx(rawTx)`
Broadcast a raw transaction.

```ts
const txid: string = await window.kasware.pushTx(rawTransactionHex);
```

#### `pushPsbt(psbtHex)`
Finalize and broadcast a signed PSKT.

```ts
const txid: string = await window.kasware.pushPsbt(signedPsbtHex);
```

### Message Signing

#### `signMessage(message, type?)`
Sign a text message. Shows approval UI with the message content.

```ts
// Schnorr signature (default)
const sig: string = await window.kasware.signMessage('Hello dApp!');

// ECDSA signature
const sigEcdsa: string = await window.kasware.signMessage('Hello dApp!', 'ecdsa');
```

- Default signature type is `'schnorr'` (Kaspa native)
- `'ecdsa'` is available for compatibility

### Utility

#### `getVersion()`
Get the wallet version.

```ts
const version: string = await window.kasware.getVersion();
// "1.2.3"
```

### Events

Subscribe to wallet state changes:

```ts
// Account changed (user switched wallet)
window.kasware.on('accountsChanged', (accounts: string[]) => {
  console.log('Active account:', accounts[0]);
});

// Network changed
window.kasware.on('networkChanged', (network: string) => {
  console.log('Network:', network);
});

// Wallet disconnected
window.kasware.on('disconnect', () => {
  console.log('Wallet disconnected');
});

// Wallet locked (session expired)
window.kasware.on('lock', () => {
  console.log('Wallet locked — user needs to re-authenticate');
});

// Wallet unlocked (biometric passed)
window.kasware.on('unlock', () => {
  console.log('Wallet unlocked');
});
```

| Event              | Data       | Description                     |
|--------------------|------------|---------------------------------|
| `connect`          | `{}`       | Provider ready                  |
| `disconnect`       | error      | Connection lost                 |
| `accountsChanged`  | `string[]` | Active account changed          |
| `networkChanged`   | `string`   | Network switched                |
| `lock`             | —          | Wallet locked (session expired) |
| `unlock`           | —          | Wallet unlocked                 |

Unsubscribe:

```ts
const handler = (accounts) => { /* ... */ };
window.kasware.on('accountsChanged', handler);
window.kasware.removeListener('accountsChanged', handler);
```

## API Reference — L2 (window.ethereum)

For Kasplex L2 / EVM-compatible dApps, Kasanova injects an EIP-1193 provider.

### Detection

```ts
// Check if it's Kasanova specifically (not just any MetaMask-compatible wallet)
if (window.ethereum?.isKasanova) {
  console.log('Running inside Kasanova L2 browser');
}
```

Kasanova also announces itself via [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963):

```ts
window.addEventListener('eip6963:announceProvider', (event) => {
  if (event.detail.info.rdns === 'app.kasanova') {
    const provider = event.detail.provider;
    // Use provider...
  }
});

// Request announcement
window.dispatchEvent(new Event('eip6963:requestProvider'));
```

### Standard EIP-1193 Usage

```ts
// Connect
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts',
});

// Get chain ID
const chainId = await window.ethereum.request({
  method: 'eth_chainId',
});

// Send transaction
const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    to: '0x...',
    value: '0x...',
    data: '0x...',
  }],
});
```

### Properties

| Property          | Type      | Description                     |
|-------------------|-----------|---------------------------------|
| `isMetaMask`      | `boolean` | Always `true` (compatibility)   |
| `isKasanova`      | `boolean` | Always `true` (Kasanova-specific) |
| `chainId`         | `string`  | Current chain ID (hex)          |
| `selectedAddress` | `string`  | Connected address               |
| `isConnected`     | `boolean` | Connection status               |

## Provider Detection Pattern

Here's the recommended pattern for supporting multiple wallets:

```ts
async function connectWallet() {
  // Option 1: Running inside Kasanova's dApp browser
  if (window.kasware) {
    const accounts = await window.kasware.requestAccounts();
    return { provider: 'kasanova', address: accounts[0] };
  }

  // Option 2: KasWare browser extension
  // (same API — window.kasware is the standard)
  // Already handled above since the API is identical

  // Option 3: No wallet found
  throw new Error('No Kaspa wallet detected. Please install Kasanova or KasWare.');
}
```

For L2 dApps, distinguish Kasanova from other Ethereum wallets:

```ts
function getProvider() {
  if (window.ethereum?.isKasanova) {
    return { name: 'Kasanova', provider: window.ethereum };
  }
  if (window.ethereum?.isMetaMask) {
    return { name: 'MetaMask', provider: window.ethereum };
  }
  return null;
}
```

## Examples

### Vanilla JavaScript
See [`examples/vanilla/index.html`](./examples/vanilla/index.html) — a self-contained HTML page with connect, send, and sign flows. Open it inside Kasanova's dApp browser.

### React
See [`examples/react/KasanovaWallet.tsx`](./examples/react/KasanovaWallet.tsx) — a `useKasanova()` hook and example component. Drop it into any React app.

## Getting Listed in Kasanova

Kasanova's dApp browser has a discovery screen with curated dApps. To get your dApp listed:

1. Make sure your dApp works with `window.kasware` (this guide)
2. Your site must be served over HTTPS
3. Contact the Kasanova team to submit your dApp for listing

Listed dApps appear in the discovery grid with:
- Icon, name, and description
- Category badge (games, marketplace, defi, social, etc.)
- Layer indicator (L1 or L2)

Users can also browse to any URL directly — listing is not required for compatibility.

## Sompi Conversion Reference

| KAS       | Sompi           |
|-----------|-----------------|
| 0.001 KAS | 100,000         |
| 0.01 KAS  | 1,000,000       |
| 0.1 KAS   | 10,000,000      |
| 1 KAS     | 100,000,000     |
| 10 KAS    | 1,000,000,000   |
| 100 KAS   | 10,000,000,000  |

```ts
// KAS to sompi
const sompi = Math.round(kasAmount * 100_000_000);

// Sompi to KAS
const kas = sompi / 100_000_000;
```

## Security Notes

- **Private keys never leave the device.** All signing happens inside Kasanova's secure enclave.
- **Every sensitive operation requires user confirmation.** Your dApp cannot silently send transactions or sign messages.
- **Origin-based permissions.** Users grant access per-origin and can revoke at any time from Settings.
- **HTTPS required.** Kasanova rejects HTTP URLs (except `localhost` during development).

## KasWare Compatibility

Kasanova implements the same `window.kasware` API as the KasWare browser extension. This means:

- **Any dApp built for KasWare works in Kasanova** without code changes
- **Any dApp built for Kasanova works in KasWare** without code changes
- The API surface, method signatures, and return types are identical

The only difference is the transport: KasWare uses browser extension messaging, while Kasanova uses an in-app WebView bridge. This is transparent to your dApp code.

## License

MIT
