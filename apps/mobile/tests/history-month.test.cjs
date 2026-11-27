const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const box={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/historyMonth.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,box);
const {monthNumber,monthLabel,ridesInMonth,completedTotal}=box.exports;
const ride=(id,status,finishedAt,fare=11.03)=>({id,status,createdAt:'2026-10-31T12:00:00Z',finishedAt,fare,distanceMeters:1000});
test('month uses completion in São Paulo, keeps legacy entries and excludes invalid dates',()=>{
 const month=monthNumber(Date.parse('2026-11-27T12:00:00Z'));
 const items=[ride('oct','COMPLETED','2026-11-01T02:59:59Z'),ride('nov','COMPLETED','2026-11-01T03:00:00Z'),
   ride('dec','COMPLETED','2026-12-01T03:00:00Z'),{...ride('legacy','COMPLETED',null),createdAt:'2026-11-02T12:00:00Z'},
   ride('invalid','COMPLETED','invalid')];
 assert.equal(ridesInMonth(items,month).map(ride=>ride.id).join(','),'legacy,nov');
 assert.equal(monthLabel(monthNumber(Date.parse('2027-01-01T02:59:59Z'))),'dezembro de 2026');
 assert.equal(monthLabel(month+2),'janeiro de 2027');
});
test('totals count only completed rides and preserve cent precision',()=>{
 const totals=completedTotal([ride('1','COMPLETED',null,0.1),ride('2','COMPLETED',null,0.2),
   ride('3','CANCELLED',null,99),ride('4','IN_PROGRESS',null,99)]);
 assert.equal(totals.fare,0.3);
 assert.equal(totals.count,2);
 assert.equal(totals.meters,2000);
 assert.equal(completedTotal([]).fare,0);
});
