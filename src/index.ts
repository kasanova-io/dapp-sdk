// ABOUTME: Main entry point for the Kasanova dApp SDK
// ABOUTME: Re-exports types and detection utilities

export type {
  KasanovaNamespace,
  KaswareProvider,
  KaspaBalance,
  SendKaspaOptions,
  SignPsbtOptions,
  KaswareEvent,
  KaspaNetwork,
  SignatureType,
} from './types';

export {
  isKasanova,
  isKaswareAvailable,
  getKasanova,
  getKaswareProvider,
  waitForKasware,
} from './detect';
