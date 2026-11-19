import type { KaswareProvider } from '../dist/index';

declare const wallet: KaswareProvider;
wallet.signPsbt('00', { inputIndexes: [1], sigHashType: 1 });
wallet.signPsbts(['00', '00'], { inputIndex: 1 });
// @ts-expect-error Kasanova requires its KCOM input selector.
wallet.signPsbt('00', { toSignInputs: [{ index: 1 }] });
// @ts-expect-error One option object applies to the batch.
wallet.signPsbts(['00'], [{ inputIndex: 1 }]);
// @ts-expect-error The two input selectors are mutually exclusive.
wallet.signPsbt('00', { inputIndex: 1, inputIndexes: [0] });
