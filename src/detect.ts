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

/**
 * Wait for the KasWare provider to become available.
 *
 * Kasanova dispatches `kasware#initialized` when the provider is injected.
 * This function resolves immediately if the provider already exists,
 * otherwise waits for the initialization event.
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
 * } catch {
 *   console.log('Kasanova wallet not found');
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

    const cleanup = () => {
      window.removeEventListener('kasware#initialized', onInit);
      window.removeEventListener('kasanova:ready', onInit);
    };

    const onInit = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (isKaswareAvailable()) {
        resolve(window.kasware!);
      } else {
        reject(new Error('Provider initialization event fired but window.kasware is not set'));
      }
    };

    window.addEventListener('kasware#initialized', onInit);
    window.addEventListener('kasanova:ready', onInit);

    setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Kasanova wallet not detected. Is the dApp open inside Kasanova?'));
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

    const cleanup = () => {
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
        reject(new Error('Provider initialized but isKasanova flag not set'));
      }
    };

    const onAnnounce = (event: CustomEvent) => {
      if (event.detail?.info?.rdns === 'app.kasanova') {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(event.detail.provider);
      }
    };

    window.addEventListener('ethereum#initialized', onInit);
    window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);

    // Request provider announcements from already-registered wallets
    try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch { /* SSR-safe */ }

    setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Kasanova L2 provider not detected.'));
    }, timeoutMs);
  });
}
