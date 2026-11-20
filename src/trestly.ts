import { getKasanova } from './detect';
import type {
  Kcc20SignRequest,
  Kcc20State,
  TrestlyPoolState,
  TrestlyPositionState,
} from './types';

export interface TrestlySigningRequest {
  network: 'mainnet' | 'testnet-10';
  address: string;
  txJsonString: string;
  signInputs: readonly number[];
  /** Ordered builder outputs, after substituting the connected wallet's owner key. */
  outputs: ReadonlyArray<{
    token?: Kcc20State | null;
    position?: TrestlyPositionState | null;
    pool?: TrestlyPoolState | null;
  }>;
  /** Index and original state of each spent liquidity position. */
  positionInputs?: ReadonlyArray<{ index: number; state: TrestlyPositionState }>;
}

function integer(value: string | bigint | number, signed = false): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new Error('Inexact transaction integer.');
  }
  const text = String(value);
  const pattern = signed ? /^(0|-?[1-9][0-9]*)$/ : /^(0|[1-9][0-9]*)$/;
  if (!pattern.test(text)) throw new Error('Invalid transaction integer.');
  return text;
}

function positionState(state: TrestlyPositionState) {
  return { ...state, shares: integer(state.shares) };
}

function poolState(pool: TrestlyPoolState) {
  return {
    tokenCovid: pool.tokenCovid,
    admin: pool.admin,
    guardian: pool.guardian,
    paused: pool.paused,
    kasReserve: integer(pool.kasReserve),
    tokenReserve: integer(pool.tokenReserve),
    totalShares: integer(pool.totalShares),
    protocolKas: integer(pool.protocolKas),
    protocolTokens: integer(pool.protocolTokens),
    baseValue: integer(pool.baseValue),
    maxOutBps: integer(pool.maxOutBps),
    windowLen: integer(pool.windowLen),
    windowCredit: integer(pool.windowCredit),
    windowRef: integer(pool.windowRef),
    windowOut: integer(pool.windowOut, true),
  };
}

/** Returns signed SafeJSON. Trestly assembles its witnesses and submits it. */
export async function signTrestlyPskt(request: TrestlySigningRequest): Promise<string> {
  const wallet = getKasanova();
  if (!wallet?.signPskt) {
    throw new Error('Open the site in a Kasanova wallet with KCC-20 signing support.');
  }
  const network = await wallet.kasware.getNetwork();
  const matchingNetwork =
    (request.network === 'mainnet' && network === 'kaspa_mainnet') ||
    (request.network === 'testnet-10' && ['kaspa_testnet', 'kaspa_testnet_10'].includes(network));
  if (!matchingNetwork) throw new Error('Kasanova and Trestly are on different networks.');
  const [account] = await wallet.kasware.getAccounts();
  if (!account || account !== request.address) throw new Error('Reconnect the selected Kasanova account.');

  const options: Required<Kcc20SignRequest['options']> = {
    signInputs: request.signInputs.map(index => ({ index, sighashType: 1 })),
    positionInputs: (request.positionInputs ?? []).map(({ index, state }) => ({ index, state: positionState(state) })),
    tokenOutputs: [],
    positionOutputs: [],
    poolOutputs: [],
  };
  request.outputs.forEach(({ token, position, pool }, index) => {
    if (token) {
      options.tokenOutputs.push({ index, state: { ...token, amount: integer(token.amount) } });
    }
    if (position) options.positionOutputs.push({ index, state: positionState(position) });
    if (pool) options.poolOutputs.push({ index, state: poolState(pool) });
  });
  return wallet.signPskt({ txJsonString: request.txJsonString, options });
}
