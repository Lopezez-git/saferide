const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const spatial = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/spatial.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, spatial);
const box = { exports: {}, require(id){assert.equal(id,'./spatial');return spatial.exports;} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/localCardLevel.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, box);
const { offerNotification } = box.exports;
const police = { status:'AVAILABLE', stale:false, total:90, categories:{Furto:82,Roubo:8},
  periodStart:'2026-01', periodEnd:'2026-09', unknownTimeTotal:33, currentTimeWindow:'03', windows:{'03':{Roubo:1}} };
const pavement = {status:'AVAILABLE', stale:false, totalRequests:5, statuses:{Finalizada:5}};
test('offer and Android use the same active road signal within 300 m of a segment',()=>{
  const route=[[-46.65,-23.56],[-46.64,-23.56]], now=Date.parse('2026-11-27T08:00:00Z');
  const report={category:'ALAGAMENTO',title:'Alagamento',latitude:-23.561,longitude:-46.645,reviewedAt:'2026-11-27T07:00:00Z',validUntil:'2026-11-27T10:00:00Z'};
  function signal(reports,source=pavement){return box.exports.offerPavement(source,reports,route,now);}
  const flood=signal([report]);
  assert.equal(flood.level,'high');
  assert.match(offerNotification(police,pavement,undefined,'unknown',flood),/🔴 Pavimento · Alagamento/);
  assert.equal(signal([{...report,latitude:-23.57},{...report,validUntil:'2026-11-27T08:00:00Z'}]).level,'noPendingRepairs');
  assert.equal(signal([{...report,category:'PAVIMENTO',title:'Via sem asfalto'}]).level,'high');
  assert.equal(signal([{...report,category:'PAVIMENTO',title:'Buracos'}]).level,'low');
  assert.equal(signal(null).level,'unknown');
  assert.equal(signal([],null).level,'unknown');
  assert.equal(signal(null,{...pavement,statuses:{Aberto:5}}).label,'5 pedidos pendentes');
});
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
