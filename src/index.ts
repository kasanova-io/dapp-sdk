// ABOUTME: Main entry point for the Kasanova dApp SDK
// ABOUTME: Re-exports types and detection utilities

export type {
  Kcc20State,
  Kcc20SignRequest,
  TrestlyPoolState,
  TrestlyPositionState,
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

export { signTrestlyPskt } from './trestly';
export type { TrestlySigningRequest } from './trestly';
