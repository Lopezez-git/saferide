const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const box={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/simulation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,box);
const {simulationReducer:reduce,pointAlong}=box.exports;
function advance(state,ticks){for(let i=0;i<ticks;i++)state=reduce(state,{type:'tick'});return state;}
test('expires an unanswered offer without accepting it',()=>{assert.equal(advance({phase:'offer',elapsed:0},180).phase,'expired');});
test('accepted trip reaches pickup then destination',()=>{let state=reduce({phase:'offer',elapsed:20},{type:'phase',phase:'pickup'});assert.equal(state.elapsed,0);state=advance(state,56);assert.equal(state.phase,'trip');assert.equal(advance(state,112).phase,'done');});
test('cancelled and idle simulations do not move',()=>{for(const phase of ['idle','declined','expired','done'])assert.equal(advance({phase,elapsed:0},100).elapsed,0);});
test('marker progresses by segment distance, not point count',()=>{const point=pointAlong([[0,0],[1,0],[10,0]],.5);assert.equal(point.longitude,5);assert.equal(pointAlong([[0,0],[10,0]],1).longitude,10);assert.equal(pointAlong([],1),null);});
test('all three prerecorded routes have usable road geometry and durations',()=>{const data=JSON.parse(fs.readFileSync('src/lib/simulation-routes.json'));assert.equal(data.routes.length,3);for(const route of data.routes)for(const leg of [route.pickup,route.trip]){assert.ok(leg.duration>0&&leg.distance>0);assert.ok(leg.geometry.coordinates.length>2);}});
