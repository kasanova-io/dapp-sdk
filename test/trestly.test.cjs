const assert = require('node:assert/strict');
const test = require('node:test');
const { signTrestlyPskt } = require('../dist/index.js');

test('Trestly forwards final output states and selected inputs without rounding', async t => {
  const token = { amount: 10, owner: 'a'.repeat(64), ownerScheme: 0, borrowScheme: 0, borrowGuard: '0'.repeat(64), extensionCommitment: '0'.repeat(64) };
  const position = { shares: 123456789012345678n, tokenCovid: '1'.repeat(64), owner: token.owner };
  const request = { network: 'testnet-10', address: 'kaspatest:test', txJsonString: '{"sequence":"18446744073709551615"}', signInputs: [1,3],
    outputs: [{}, {token}, {position}], positionInputs: [{index:3, state:position}] };
  let network = 'kaspa_testnet', account = request.address, calls = [];
  const wallet = { kasware: { getNetwork: async () => network, getAccounts: async () => [account] }, signPskt: async params => { calls.push(params); return 'signed'; } };
  global.window = { kasanova: wallet };
  t.after(() => { delete global.window; });
  for (const amount of [10, '9007199254740993', 9007199254740993n]) {
    token.amount = amount;
    assert.equal(await signTrestlyPskt(request), 'signed');
    const { txJsonString, options } = calls.at(-1);
    assert.equal(txJsonString, request.txJsonString);
    assert.deepEqual(options.signInputs, [{index:1, sighashType:1}, {index:3, sighashType:1}]);
    assert.equal(options.tokenOutputs[0].index, 1);
    assert.equal(options.tokenOutputs[0].state.amount, String(amount));
    assert.equal(options.positionOutputs[0].state.shares, String(position.shares));
    assert.equal(options.positionInputs[0].index, 3);
    assert.doesNotThrow(() => JSON.stringify(options));
  }
  token.amount = 2 ** 54;
  await assert.rejects(signTrestlyPskt(request), /Inexact/);
  network = 'kaspa_mainnet';
  await assert.rejects(signTrestlyPskt(request), /networks/);
  network = 'kaspa_testnet_10';
  account = 'kaspatest:other';
  await assert.rejects(signTrestlyPskt(request), /Reconnect/);
  assert.equal(calls.length, 3);
  delete wallet.signPskt;
  await assert.rejects(signTrestlyPskt(request), /support/);
});

test('mainnet liquidity proofs preserve signed pool fields and builder output order', async t => {
  const pool = {
    tokenCovid: '1'.repeat(64), admin: '2'.repeat(64), guardian: '3'.repeat(64),
    kasReserve: 9007199254740993n, tokenReserve: 3000000000, totalShares: '10000000000000',
    protocolKas: 100000000, protocolTokens: 100000, baseValue: 100000000,
    maxOutBps: 1000, windowLen: 36000, windowCredit: 5000000, windowRef: '9000000000000',
    windowOut: -5000000n, paused: false,
  };
  let forwarded;
  const address = 'kaspa:mainnet-test-account';
  global.window = { kasanova: {
    kasware: { getNetwork: async () => 'kaspa_mainnet', getAccounts: async () => [address] },
    signPskt: async packet => { forwarded = packet; return packet.txJsonString; },
  } };
  t.after(() => { delete global.window; });
  const request = {
    network: 'mainnet', address, txJsonString: '{"id":"fixture"}',
    signInputs: [2], outputs: [{}, {pool}, {}],
  };
  assert.equal(await signTrestlyPskt(request), request.txJsonString);
  assert.equal(forwarded.options.poolOutputs[0].index, 1);
  const state = forwarded.options.poolOutputs[0].state;
  assert.equal(state.kasReserve, '9007199254740993');
  assert.equal(state.windowOut, '-5000000');
  assert.equal(state.paused, false);
  assert.doesNotThrow(() => JSON.stringify(forwarded));
  pool.windowOut = '-01';
  await assert.rejects(signTrestlyPskt(request), /Invalid transaction integer/);
});
