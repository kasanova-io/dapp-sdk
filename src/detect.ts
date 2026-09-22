// ABOUTME: Provider detection and connection utilities for Kasanova wallet
// ABOUTME: Handles KasWare-compatible Kaspa provider detection

import type { KaswareProvider, KasanovaNamespace } from './types';

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
