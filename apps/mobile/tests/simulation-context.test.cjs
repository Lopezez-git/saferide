const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const box = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/simulationContext.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, box);
const { policeSummary, pavementSummary, trafficSummary } = box.exports;

test('police count uses only the current hour and wraps the caption at midnight', () => {
  const summary = policeSummary({ status: 'AVAILABLE', currentTimeWindow: '23', windows: {
    '22': { theft: 97 }, '23': { theft: 2, robbery: 1 },
  } });
  assert.equal(summary.value, '3 BOs');
  assert.equal(summary.caption, 'Histórico · 23h–00h');
});

test('missing or malformed police data never becomes zero or an object string', () => {
  assert.equal(policeSummary().value, 'Consultando…');
  for (const data of [null, { status: 'UNAVAILABLE' },
    { status: 'AVAILABLE', currentTimeWindow: '23', windows: {} },
    { status: 'AVAILABLE', currentTimeWindow: '24', windows: { '24': { theft: 2 } } },
    { status: 'AVAILABLE', currentTimeWindow: '23', windows: { '23': { theft: {} } } },
    { status: 'AVAILABLE', currentTimeWindow: '23', windows: { '23': { theft: -1 } } },
  ]) assert.equal(policeSummary(data).value, 'Indisponível');
});

test('a genuine zero remains a historical count, never a safe classification', () => {
  const summary = policeSummary({ status: 'AVAILABLE', currentTimeWindow: '08', windows: { '08': { theft: 0, robbery: 0 } } });
  assert.equal(summary.value, '0 BOs');
  assert.match(summary.caption, /Histórico/);
});

test('pavement excludes completed requests and distinguishes unavailable data', () => {
  assert.equal(pavementSummary({ status: 'AVAILABLE', statuses: { Aberto: 2, 'Em andamento': 3, Finalizado: 40 } }), '5 solicitações');
  assert.equal(pavementSummary(null), 'Indisponível');
  assert.equal(pavementSummary(), 'Consultando…');
});

test('traffic only labels an available provider result', () => {
  assert.equal(trafficSummary({ status: 'AVAILABLE', condition: 'CONGESTIONADO' }), 'Congestionado');
  assert.equal(trafficSummary({ status: 'UNAVAILABLE', condition: 'LEVE' }), 'Indisponível');
  assert.equal(trafficSummary({ status: 'AVAILABLE', condition: 'UNKNOWN' }), 'Indisponível');
});

test('gross rates use the entire offer and handle incomplete route data', () => {
  const { grossRates } = box.exports;
  const rates = grossRates(11.02, 4100, 13 * 60);
  assert.equal(rates.perKm.toFixed(2), '2.69');
  assert.equal(rates.perMinute.toFixed(2), '0.85');
  assert.equal(rates.perHour.toFixed(2), '50.86');
  assert.equal(grossRates(11.03, 5700, 960).perKm.toFixed(2), '1.94');
  assert.equal(grossRates(12, 0, 60), null);
  assert.equal(grossRates(12, 1000, 0), null);
  assert.equal(grossRates(NaN, 1000, 60), null);
});
