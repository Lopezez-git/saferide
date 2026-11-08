const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function camera(fitZoom=14.25) {
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/mapHtml.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,module);
  const calls=[];
  const point=(x,y)=>({x,y,add(p){return point(x+p.x,y+p.y);},subtract(p){return point(x-p.x,y-p.y);},divideBy(n){return point(x/n,y/n);}});
  const map={options:{zoomSnap:1},getBoundsZoom:()=>fitZoom,project:(p)=>point(p[1],p[0]),unproject:p=>[p.y,p.x],setView:(position,zoom,options)=>{calls.push(['set',position,zoom,options]);return map;},getCenter:()=>[-23.55,-46.63],getZoom:()=>13,
    on:()=>map,getPane:()=>({style:{setProperty(){}}}),getSize:()=>({y:650}),stop:()=>calls.push(['stop']),
    removeLayer(){},flyTo:(center,zoom,options)=>calls.push(['fly',center,zoom,options]),fitBounds:(_bounds,options)=>calls.push(['fit',options])};
  const layer=()=>({addTo(){return this;},clearLayers(){},bindTooltip(){return this;},setLatLng(){return this;},getBounds(){return {};}});
  const window={addEventListener(){},matchMedia:()=>({matches:false})};
  const box={window,parent:{postMessage(){}},document:{getElementById:()=>({style:{}})},fetch:()=>new Promise(()=>{}),
    L:{point,latLngBounds:points=>({getSouthWest:()=>points[0],getNorthEast:()=>points.at(-1)}),map:()=>map,layerGroup:layer,polyline:layer,marker:layer,circleMarker:layer,divIcon:()=>({})}};
  vm.runInNewContext(module.exports.mapHtml.split('<script>')[1].split('</script>')[0],box);
  calls.length=0;
  return {calls,map,update:window.updateMap};
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
