const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function camera(fitZoom=14.25) {
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/mapHtml.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,module);
  const calls=[];
  let time=0, sequence=0;const frames=new Map(),positions=[];
  const point=(x,y)=>({x,y,add(p){return point(x+p.x,y+p.y);},subtract(p){return point(x-p.x,y-p.y);},divideBy(n){return point(x/n,y/n);}});
  const map={options:{zoomSnap:1},getBoundsZoom:()=>fitZoom,project:(p)=>point(p[1],p[0]),unproject:p=>[p.y,p.x],setView:(position,zoom,options)=>{calls.push(['set',position,zoom,options]);return map;},getCenter:()=>[-23.55,-46.63],getZoom:()=>13,
    on:()=>map,getPane:()=>({style:{setProperty(){}}}),getSize:()=>({x:390,y:650}),stop:()=>calls.push(['stop']),
    latLngToContainerPoint:()=>point(195,325),panBy:(offset,options)=>calls.push(['pan',offset,options]),
    getBearing:()=>map.bearing||0,setBearing:value=>{map.bearing=value;calls.push(['bearing',value]);},setPitch:value=>calls.push(['pitch',value]),
    removeLayer(){},flyTo:(center,zoom,options)=>calls.push(['fly',center,zoom,options]),fitBounds:(_bounds,options)=>calls.push(['fit',options])};
  const layer=()=>({addTo(){return this;},clearLayers(){},bindTooltip(){return this;},setLatLng(point){positions.push(point);return this;},getBounds(){return {};}});
  const window={addEventListener(){},matchMedia:()=>({matches:false})};
  const box={performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),window,parent:{postMessage(){}},document:{getElementById:()=>({style:{}})},fetch:()=>new Promise(()=>{}),
    L:{point,latLngBounds:points=>({getSouthWest:()=>points[0],getNorthEast:()=>points.at(-1)}),map:()=>map,layerGroup:layer,polyline:layer,marker:layer,circleMarker:layer,divIcon:()=>({})}};
  vm.runInNewContext(module.exports.mapHtml.split('<script>')[1].split('</script>')[0],box);
  calls.length=0;
  return {calls,map,positions,frames,step(ms){time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));},update:window.updateMap};
}
const origin={latitude:-23.66,longitude:-46.71},destination={latitude:-23.68,longitude:-46.7};
const waiting={simulation:true,reports:[],origin:null,destination:null,route:null,selected:null};
const offer={...waiting,origin,destination,route:[[-46.71,-23.66],[-46.7,-23.68]],driver:origin,bottomInset:330,topInset:180};

test('prepares a close view then flies once; movement updates do not restart camera',()=>{
  const {update,calls}=camera();
  update(waiting);update({...waiting,simulationPreview:offer.route,bottomInset:offer.bottomInset,topInset:offer.topInset});update({...waiting,simulationPreview:offer.route,bottomInset:offer.bottomInset,topInset:offer.topInset});
  assert.equal(calls.filter(c=>c[0]==='set'&&Math.abs(c[2]-14.9)<0.001).length,1);
  update(offer);update({...offer,driver:destination});
  assert.equal(calls.filter(c=>c[0]==='fly').length,1);
  assert.equal(calls.find(c=>c[0]==='fly')[3].duration,0.9);
  update({...offer,bottomInset:230});
  assert.equal(calls.filter(c=>c[0]==='fly').length,1);
  update(waiting);update({...waiting,simulationPreview:offer.route,bottomInset:offer.bottomInset,topInset:offer.topInset});update(offer);
  assert.equal(calls.filter(c=>c[0]==='fly').length,2);
});
test('leaving during camera flight stops it and restores the previous viewport',()=>{
  const {update,calls}=camera();update(waiting);update(offer);
  update({...waiting,simulation:false});
  assert.equal(calls.at(-2)[0],'stop');assert.equal(calls.at(-1)[0],'set');assert.equal(calls.at(-1)[2],13);
});
test('reduced motion frames the route without flying',()=>{
  const {update,calls}=camera();update({...offer,reduceMotion:true});
  assert.equal(calls.filter(c=>c[0]==='fly').length,0);
  assert.equal(calls.find(c=>c[0]==='set')[3].animate,false);
});

test('camera opening stays small and follows the route framing for short and long trips',()=>{
  const results=[15.5,11.25].map(fitZoom=>{
    const {update,calls}=camera(fitZoom);
    update({...waiting,simulationPreview:offer.route,bottomInset:offer.bottomInset,topInset:offer.topInset});update(offer);
    const start=calls.find(c=>c[0]==='set'),end=calls.find(c=>c[0]==='fly');
    assert.ok(Math.abs(start[2]-end[2]-0.65)<0.001);
    assert.deepEqual(start[1],end[1]);
    assert.equal(end[2],fitZoom);
    return end[2];
  });
  assert.ok(results[0]>results[1]);
});
test('fractional framing is scoped to the simulation',()=>{
  const {update,map}=camera();update(waiting);assert.equal(map.options.zoomSnap,0);
  update({...waiting,simulation:false});assert.equal(map.options.zoomSnap,1);
});


test('driver animation draws intermediate frames along road bends, not a straight shortcut',()=>{
  const scene=camera();
  const coordinates=[[0,0],[1,0],[1,1]];
  const base={...offer,driverMotion:{key:'pickup',coordinates,elapsed:0,duration:1,running:true}};
  scene.update(base);scene.step(250);
  scene.update({...base,driverMotion:{...base.driverMotion,elapsed:1}});
  for(let i=0;i<15;i++)scene.step(1000/60);
  assert.ok(scene.positions.length>=15);
  for(const [lat,lon] of scene.positions)assert.ok(Math.abs(lat)<1e-9||Math.abs(lon-1)<1e-9,'must stay on either road segment');
  const last=scene.positions.at(-1);assert.ok(Math.abs(last[0]-1)<1e-9);assert.ok(Math.abs(last[1]-1)<1e-9);
});

test('pause, boarding, reduced motion and exit cancel pending driver animation frames',()=>{
  const scene=camera();
  const base={...offer,driverMotion:{key:'pickup',coordinates:offer.route,elapsed:0,duration:14,running:true}};
  scene.update(base);scene.update({...base,driverMotion:{...base.driverMotion,elapsed:1}});scene.step(80);
  scene.update({...base,driverMotion:{...base.driverMotion,elapsed:1,running:false}});
  assert.equal(scene.frames.size,0);const count=scene.positions.length;scene.step(1000);assert.equal(scene.positions.length,count);
  scene.update({...base,reduceMotion:true});assert.equal(scene.frames.size,0);
  scene.update({...base,passengerOnboard:true,driverMotion:null});assert.equal(scene.frames.size,0);
  scene.update(base);scene.update({...waiting,simulation:false});assert.equal(scene.frames.size,0);
});


test('driver POV rotates toward travel and boarding preserves the navigation camera',()=>{
  const scene=camera();
  const base={...offer,navigation:true,driverMotion:{key:'pickup',coordinates:[[0,0],[1,0]],elapsed:0,duration:14,running:true}};
  scene.update(base);scene.step(16);
  assert.equal(scene.calls.filter(c=>c[0]==='fly').length,0);
  assert.ok(scene.calls.some(c=>c[0]==='pitch'&&c[1]===38));
  assert.ok(scene.calls.some(c=>c[0]==='bearing'&&c[1]===-90));
  assert.ok(scene.calls.some(c=>c[0]==='set'&&c[2]===16.8));
  assert.ok(scene.calls.some(c=>c[0]==='pan'));
  const sets=scene.calls.filter(c=>c[0]==='set').length;
  scene.update({...base,passengerOnboard:true,driverMotion:null});
  assert.equal(scene.calls.filter(c=>c[0]==='set').length,sets);
  scene.update(waiting);
  assert.ok(scene.calls.some(c=>c[0]==='pitch'&&c[1]===0));
  assert.equal(scene.map.getBearing(),0);
});

test('navigation still follows if the optional perspective plugin fails to load',()=>{
  const scene=camera();delete scene.map.setPitch;delete scene.map.setBearing;delete scene.map.getBearing;
  scene.update({...offer,navigation:true,driverMotion:{key:'pickup',coordinates:offer.route,elapsed:0,duration:14,running:true}});
  scene.step(16);assert.ok(scene.calls.some(c=>c[0]==='pan'));
  scene.update({...waiting,simulation:false});assert.equal(scene.frames.size,0);
});
