// ABOUTME: Main entry point for the Kasanova dApp SDK
// ABOUTME: Re-exports types and detection utilities

export type {
  KaswareProvider,
  KaspaBalance,
  SendKaspaOptions,
  SignPsbtOptions,
  KaswareEvent,
  KaspaNetwork,
  SignatureType,
  KasanovaEthereumProvider,
  EthereumRequestArgs,
  EthereumEvent,
} from './types';

export {
  isKaswareAvailable,
  isKasanovaL2Available,
  getKaswareProvider,
  getKasanovaL2Provider,
  waitForKasware,
  waitForKasanovaL2,
} from './detect';
