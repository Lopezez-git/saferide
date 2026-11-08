const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const box={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/simulation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,box);
const {simulationReducer:reduce,pointAlong}=box.exports;
function advance(state,ticks){for(let i=0;i<ticks;i++)state=reduce(state,{type:'tick'});return state;}
test('five seconds of intro precede a separate five-second search',()=>{
  let state={phase:'intro',elapsed:0};
  state=advance(state,19);assert.equal(state.phase,'intro');
  state=advance(state,1);assert.equal(state.phase,'searching');assert.equal(state.elapsed,0);
  state=advance(state,19);assert.equal(state.phase,'searching');
  state=advance(state,1);assert.equal(state.phase,'offer');assert.equal(state.elapsed,0);
});
test('offers arrive after five active seconds and each search starts fresh',()=>{
  let state=reduce({phase:'done',elapsed:0},{type:'phase',phase:'searching'});
  state=advance(state,19);assert.equal(state.phase,'searching');
  state=advance(state,1);assert.equal(state.phase,'offer');assert.equal(state.elapsed,0);
  state=advance(state,39);assert.equal(state.phase,'offer');
  assert.equal(advance(state,1).phase,'searching');
});
test('unanswered offers loop every ten seconds with a fresh five-second search',()=>{
  let state={phase:'offer',elapsed:0,offerIndex:0};
  for(let cycle=0;cycle<7;cycle++){
    state=advance(state,39);assert.equal(state.phase,'offer');
    state=advance(state,1);assert.equal(state.phase,'searching');assert.equal(state.offerIndex,(cycle+1)%3);
    state=advance(state,19);assert.equal(state.phase,'searching');
    state=advance(state,1);assert.equal(state.phase,'offer');
  }
});
test('accepting just before expiry freezes the offer until its record is saved',()=>{
  let state=advance({phase:'offer',elapsed:0,offerIndex:2},39);
  state=reduce(state,{type:'phase',phase:'accepting'});state=advance(state,100);
  assert.equal(state.phase,'accepting');assert.equal(state.offerIndex,2);
  state=reduce(state,{type:'phase',phase:'pickup'});state=advance(state,56+112);
  assert.equal(state.phase,'done');assert.equal(state.offerIndex,2);
  state=advance(state,100);assert.equal(state.phase,'done');
  state=reduce(state,{type:'next'});assert.equal(state.phase,'searching');assert.equal(state.offerIndex,0);
});
test('accepted trip reaches pickup then destination',()=>{let state=reduce({phase:'offer',elapsed:20},{type:'phase',phase:'pickup'});assert.equal(state.elapsed,0);state=advance(state,56);assert.equal(state.phase,'trip');assert.equal(advance(state,112).phase,'done');});
test('cancelled and idle simulations do not move',()=>{for(const phase of ['idle','declined','expired','done'])assert.equal(advance({phase,elapsed:0},100).elapsed,0);});
test('marker progresses by segment distance, not point count',()=>{const point=pointAlong([[0,0],[1,0],[10,0]],.5);assert.equal(point.longitude,5);assert.equal(pointAlong([[0,0],[10,0]],1).longitude,10);assert.equal(pointAlong([],1),null);});
test('all three prerecorded routes have usable road geometry and durations',()=>{const data=JSON.parse(fs.readFileSync('src/lib/simulation-routes.json'));assert.equal(data.routes.length,3);for(const route of data.routes)for(const leg of [route.pickup,route.trip]){assert.ok(leg.duration>0&&leg.distance>0);assert.ok(leg.geometry.coordinates.length>2);}});

test('history progress keeps the completed pickup when the passenger trip starts', () => {
  const { legProgress } = box.exports;
  assert.equal(legProgress('offer', 9).pickup, 0);
  assert.equal(legProgress('pickup', 7).pickup, 0.5);
  assert.equal(legProgress('trip', 0).pickup, 1);
  assert.equal(legProgress('trip', 14).trip, 0.5);
  assert.equal(legProgress('done', 0).trip, 1);
});
