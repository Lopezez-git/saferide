const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const source=ts.transpileModule(fs.readFileSync('src/lib/rideHistory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
test('offline record survives app reload and synchronizes without duplication',async()=>{
 const storage=new Map(),server=new Map();let online=false;
 const api=async(path,options={})=>{if(!online)throw Error('offline');if(path==='/rides/key')return {key:'device-or-ride-key'};if(options.method==='PUT'){server.set(options.body.id,{...options.body,pending:false});return server.get(options.body.id);}return [...server.values()];};
 function boot(){const box={crypto:require('node:crypto').webcrypto,exports:{},require:(id)=>id==='./client'?{api}:{rideStorage:{get:async key=>storage.get(key)??null,set:async(key,value)=>storage.set(key,value)}},Date,Promise};vm.runInNewContext(source,box);return box.exports;}
 let app=boot();const id=await app.createRideId();assert.match(id,/^[0-9a-f-]{36}$/);
 const ride={id,status:'CANCELLED',passenger:'Teste',createdAt:new Date().toISOString(),distanceMeters:350,activeSeconds:5};
 assert.equal(await app.saveRide(ride),false);assert.equal(server.size,0);
 app=boot();let result=await app.loadRides();assert.equal(result.offline,true);assert.equal(result.items[0].distanceMeters,350);assert.equal(result.items[0].pending,true);
 online=true;result=await app.loadRides();assert.equal(result.offline,false);assert.equal(result.items[0].pending,false);assert.equal(server.size,1);
 assert.equal(result.items[0].cachedOnly,false);
 await app.loadRides();assert.equal(server.size,1);
 server.clear();result=await app.loadRides();assert.equal(result.offline,false);assert.equal(result.items[0].cachedOnly,true);
 assert.equal(result.items[0].distanceMeters,350);
});
test('loads older pages before calculating history and monthly totals',async()=>{
 const storage=new Map([['sr-ride-owner','device-key']]);
 const rides=Array.from({length:101},(_,index)=>({id:'ride-'+index,createdAt:'2026-11-01T12:00:00Z',status:'COMPLETED',fare:11.03,distanceMeters:1000}));
 const requests=[];
 const api=async(path)=>{requests.push(path);return path==='/rides'?rides.slice(0,100):rides.slice(100);};
 const box={exports:{},require:id=>id==='./client'?{api}:{rideStorage:{get:async key=>storage.get(key)??null,set:async(key,value)=>storage.set(key,value)}},Date,Promise};
 vm.runInNewContext(source,box);
 const result=await box.exports.loadRides();
 assert.equal(result.offline,false);
 assert.equal(result.items.length,101);
 assert.equal(new Set(result.items.map(ride=>ride.id)).size,101);
 assert.equal(requests.length,2);
 assert.match(requests[1],/beforeId=ride-99/);
});
