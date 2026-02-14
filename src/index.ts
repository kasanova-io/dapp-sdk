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
  KasanovaEthereumProvider,
  EthereumRequestArgs,
  EthereumEvent,
} from './types';

export {
  isKasanova,
  isKaswareAvailable,
  isKasanovaL2Available,
  getKasanova,
  getKaswareProvider,
  getKasanovaL2Provider,
  waitForKasware,
  waitForKasanovaL2,
} from './detect';
