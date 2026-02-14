// ABOUTME: Provider detection and connection utilities for Kasanova wallet
// ABOUTME: Handles both L1 (KasWare) and L2 (EIP-1193) provider detection

import type { KaswareProvider, KasanovaEthereumProvider, KasanovaNamespace } from './types';

/**
 * Check if running inside Kasanova's dApp browser.
 * This is the simplest and most reliable detection method.
 */
export function isKasanova(): boolean {
  return typeof window !== 'undefined' && typeof window.kasanova !== 'undefined';
}

/**
 * Check if the KasWare-compatible provider (L1) is available.
 * Works with both Kasanova and KasWare wallets.
 */
export function isKaswareAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.kasware !== 'undefined';
}

/**
 * Check if the Kasanova-specific Ethereum provider (L2) is available.
 * Returns true only for Kasanova (not generic MetaMask).
 */
export function isKasanovaL2Available(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.ethereum !== 'undefined' &&
    (window.ethereum as KasanovaEthereumProvider).isKasanova === true
  );
}

/**
 * Get the Kasanova namespace if available.
 * @returns The namespace object or null
 */
export function getKasanova(): KasanovaNamespace | null {
  if (!isKasanova()) return null;
  return window.kasanova!;
}

/**
 * Get the KasWare provider if available.
 * @returns The provider instance or null
 */
export function getKaswareProvider(): KaswareProvider | null {
  if (!isKaswareAvailable()) return null;
  return window.kasware!;
}

/**
 * Get the Kasanova Ethereum provider if available.
 * @returns The provider instance or null
 */
export function getKasanovaL2Provider(): KasanovaEthereumProvider | null {
  if (!isKasanovaL2Available()) return null;
  return window.ethereum as KasanovaEthereumProvider;
}

/** Minimal shape check to verify an object looks like a KasWare provider. */
function hasKaswareShape(obj: unknown): obj is KaswareProvider {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as KaswareProvider).requestAccounts === 'function' &&
    typeof (obj as KaswareProvider).getAccounts === 'function' &&
    typeof (obj as KaswareProvider).on === 'function'
  );
}

/** Minimal shape check to verify an object looks like an EIP-1193 provider. */
function hasEthereumProviderShape(obj: unknown): obj is KasanovaEthereumProvider {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as KasanovaEthereumProvider).request === 'function' &&
    typeof (obj as KasanovaEthereumProvider).on === 'function'
  );
}

/**
 * Wait for the KasWare provider to become available.
 *
 * Kasanova dispatches `kasware#initialized` (and `kasanova:ready`)
 * when the provider is injected. This function resolves immediately
 * if the provider already exists, otherwise waits for the
 * initialization event.
 *
 * @param timeoutMs - Maximum time to wait (default: 3000ms)
 * @returns The provider instance
 * @throws Error if the provider is not available within the timeout
 *
 * @example
 * ```ts
 * try {
 *   const kasware = await waitForKasware();
 *   const accounts = await kasware.requestAccounts();
 *   console.log('Connected:', accounts[0]);
 * } catch (err) {
 *   console.error('Wallet connection failed:', err);
 * }
 * ```
 */
export function waitForKasware(timeoutMs = 3000): Promise<KaswareProvider> {
  return new Promise((resolve, reject) => {
    // Already available
    if (isKaswareAvailable()) {
      resolve(window.kasware!);
      return;
    }

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('kasware#initialized', onInit);
      window.removeEventListener('kasanova:ready', onInit);
    };

    const onInit = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const provider = window.kasware;
      if (provider && hasKaswareShape(provider)) {
        resolve(provider);
      } else {
        reject(
          new Error(
            'Provider initialization event fired but window.kasware does not implement the expected API. ' +
              'Ensure Kasanova or KasWare is properly installed.',
          ),
        );
      }
    };

    window.addEventListener('kasware#initialized', onInit);
    window.addEventListener('kasanova:ready', onInit);

    // Re-check after listener registration to close the race window
    if (isKaswareAvailable() && hasKaswareShape(window.kasware)) {
      onInit();
      return;
    }

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error(
          `Kasanova wallet not detected after ${timeoutMs}ms. ` +
            `window.kasware is ${typeof window.kasware}. ` +
            'Is the dApp open inside Kasanova?',
        ),
      );
    }, timeoutMs);
  });
}

/**
 * Wait for the Kasanova L2 (Ethereum) provider.
 *
 * @param timeoutMs - Maximum time to wait (default: 3000ms)
 * @returns The EIP-1193 provider instance
 * @throws Error if the provider is not available within the timeout
 */
export function waitForKasanovaL2(timeoutMs = 3000): Promise<KasanovaEthereumProvider> {
  return new Promise((resolve, reject) => {
    if (isKasanovaL2Available()) {
      resolve(window.ethereum as KasanovaEthereumProvider);
      return;
    }

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('ethereum#initialized', onInit);
      window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener);
    };

    const onInit = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (isKasanovaL2Available()) {
        resolve(window.ethereum as KasanovaEthereumProvider);
      } else {
        reject(
          new Error(
            'ethereum#initialized fired but window.ethereum.isKasanova is not true. ' +
              `window.ethereum is ${typeof window.ethereum}` +
              (window.ethereum ? `, isKasanova=${(window.ethereum as KasanovaEthereumProvider).isKasanova}` : '') +
              '. Another wallet extension may have claimed window.ethereum.',
          ),
        );
      }
    };

    const onAnnounce = (event: CustomEvent) => {
      if (event.detail?.info?.rdns === 'app.kasanova') {
        if (settled) return;
        const provider = event.detail?.provider;
        if (!provider || !hasEthereumProviderShape(provider)) {
          console.warn(
            '[@kasanovaio/dapp-sdk] eip6963:announceProvider with rdns=app.kasanova ' +
              'delivered a provider missing required methods (request, on). Ignoring.',
          );
          return;
        }
        settled = true;
        cleanup();
        resolve(provider as KasanovaEthereumProvider);
      }
    };

    window.addEventListener('ethereum#initialized', onInit);
    window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);

    // Re-check after listener registration to close the race window
    if (isKasanovaL2Available()) {
      onInit();
      return;
    }

    // Request provider announcements from already-registered wallets
    if (typeof window !== 'undefined' && typeof Event !== 'undefined') {
      try {
        window.dispatchEvent(new Event('eip6963:requestProvider'));
      } catch (err) {
        console.warn(
          '[@kasanovaio/dapp-sdk] Failed to dispatch eip6963:requestProvider:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error(
          `Kasanova L2 provider not detected after ${timeoutMs}ms. ` +
            `window.ethereum is ${typeof window.ethereum}` +
            (window.ethereum ? `, isKasanova=${(window.ethereum as KasanovaEthereumProvider).isKasanova}` : '') +
            '.',
        ),
      );
    }, timeoutMs);
  });
}
