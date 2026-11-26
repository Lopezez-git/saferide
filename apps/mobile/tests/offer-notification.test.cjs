const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const box = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/localCardLevel.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, box);
const { offerNotification } = box.exports;
const police = { status:'AVAILABLE', stale:false, total:90, categories:{Furto:82,Roubo:8},
  periodStart:'2026-01', periodEnd:'2026-09', unknownTimeTotal:33, currentTimeWindow:'03', windows:{'03':{Roubo:1}} };
const pavement = {status:'AVAILABLE', stale:false, totalRequests:5, statuses:{Finalizada:5}};
test('notification uses São Paulo hours at both rush-hour boundaries and on weekends', () => {
  const hours = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/trafficHours.ts','utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS},
  }).outputText, hours);
  for (const [instant, peak] of [
    ['2026-11-26T09:59Z',false], ['2026-11-26T10:00Z',true], ['2026-11-26T13:00Z',false],
    ['2026-11-26T19:59Z',false], ['2026-11-26T20:00Z',true], ['2026-11-26T23:00Z',false],
    ['2026-11-28T10:00Z',false], ['2026-11-29T20:00Z',false],
  ]) {
    const {label,level} = hours.exports.trafficByHour(Date.parse(instant));
    const text = offerNotification(police,pavement,label,level);
    assert.ok(text.includes(peak ? 'Trânsito: 🟡 Horário típico de pico' : 'Trânsito: 🔵 Fora do pico típico'),instant);
  }
});
test('oferta diferencia histórico e hora, roubo e furto, e pendências encerradas', () => {
  const text = offerNotification(police, pavement);
  assert.match(text,/🔴 Veículos · 82 furtos, 8 roubos/);
  assert.match(text,/03h–04h · 1 roubo/);
  assert.match(text,/🟢 Tapa-buraco · sem pedidos pendentes/);
});
test('bases desatualizadas, incompletas e horas desconhecidas ficam neutras', () => {
  const text = offerNotification({...police,stale:true},{...pavement,statuses:{}});
  assert.match(text,/⚪ Veículos · base desatualizada/);
  assert.match(text,/⚪ Tapa-buraco · sem avaliação/);
  assert.doesNotMatch(text,/Horário:/);
  assert.match(offerNotification({...police,unknownTimeTotal:90},null),/⚪ Veículos/);
});
