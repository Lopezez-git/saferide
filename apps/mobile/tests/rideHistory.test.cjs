const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const source=ts.transpileModule(fs.readFileSync('src/lib/rideHistory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
test('offline record survives app reload and synchronizes without duplication',async()=>{
 const storage=new Map(),server=new Map();let online=true;
 const api=async(path,options={})=>{if(!online)throw Error('offline');if(path==='/rides/key')return {key:'device-or-ride-key'};if(options.method==='PUT'){server.set(options.body.id,{...options.body,pending:false});return server.get(options.body.id);}return [...server.values()];};
 function boot(){const box={exports:{},require:(id)=>id==='./client'?{api}:{rideStorage:{get:async key=>storage.get(key)??null,set:async(key,value)=>storage.set(key,value)}},Date,Promise};vm.runInNewContext(source,box);return box.exports;}
 let app=boot();await app.createRideId();online=false;
 const ride={id:'ride-1',status:'CANCELLED',passenger:'Teste',createdAt:new Date().toISOString(),distanceMeters:350,activeSeconds:5};
 assert.equal(await app.saveRide(ride),false);assert.equal(server.size,0);
 app=boot();let result=await app.loadRides();assert.equal(result.offline,true);assert.equal(result.items[0].distanceMeters,350);assert.equal(result.items[0].pending,true);
 online=true;result=await app.loadRides();assert.equal(result.offline,false);assert.equal(result.items[0].pending,false);assert.equal(server.size,1);
 await app.loadRides();assert.equal(server.size,1);
});
