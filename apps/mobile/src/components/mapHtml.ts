export type MapPoint = { latitude: number; longitude: number };
export type MapData = {
  simulation?: boolean;
  navigation?: boolean;
  simulationPreview?: number[][] | null;
  reduceMotion?: boolean;
  driver?: MapPoint | null;
  driverMotion?: { key: string; coordinates: number[][]; elapsed: number; duration: number; running: boolean } | null;
  passengerOnboard?: boolean;
  approachRoute?: number[][];
  bottomInset?: number;
  topInset?: number;
  placeFocus?: (MapPoint & { key: number }) | null;
  position?: (MapPoint & { accuracy: number | null }) | null;
  locationFocus?: number;
  reports: { id: string; latitude: number; longitude: number; title: string }[];
  origin: MapPoint | null;
  destination: MapPoint | null;
  selected: MapPoint | null;
  route: number[][] | null;
  routeMinutes?: number;
};
export type MapProps = {
  html?: string;
  height?: number;
  data: MapData;
  onPick: (point: MapPoint) => void;
  onReport: (id: string) => void;
};
export const mapHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}.leaflet-bottom{bottom:0}.leaflet-top .leaflet-control-zoom{margin-top:140px}.leaflet-container{background:#dfe4e5}.leaflet-tile-pane svg path[stroke-width="1.5"]{stroke-width:calc(1.5px / var(--tile-scale,1))}.leaflet-tile-pane svg path[stroke-width="3"]{stroke-width:calc(3px / var(--tile-scale,1))}.location-marker{box-sizing:border-box;border:3px solid white;border-radius:50%;background:#087f71;box-shadow:0 0 0 6px #087f7126,0 2px 5px #0003}.driver-arrow{width:34px;height:34px;filter:drop-shadow(0 2px 3px #0005)}.driver-arrow svg{width:34px;height:34px}.location-marker.manual{background:#fff;border:4px solid #243536;box-shadow:0 0 0 5px #2435361a}.endpoint{background:#111;border:2px solid white}.endpoint-label{border:0;box-shadow:0 1px 5px #0002;font:11px Arial;padding:5px 7px;color:#111}body{background:#dfe4e5;font:14px sans-serif}#hint{position:absolute;z-index:999;bottom:30px;left:10px;background:white;padding:8px;border-radius:8px;max-width:75%}</style></head><body><div id="map"></div><div id="hint">Carregando mapa…</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://unpkg.com/leaflet-rotate@0.5.3/dist/leaflet-rotate.js"></script><script src="https://unpkg.com/leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.bundled.js"></script><script>
function send(data){var message=JSON.stringify({saferide:true,...data});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else parent.postMessage(message,'*');}
if(typeof L==='undefined'){document.getElementById('hint').textContent='Mapa indisponível. Use os pontos de referência e a lista abaixo.';}else{
var simLayer=null,simDriver=null,simKey='',simFocusKey='',simRouteKey='',savedView=null;
var baseLayer=null,navigationLayer=null;
var navigationData=null,navigationActive=false,driverHeading=0;
var driverFrame=null,driverMotionKey='',driverPoints=[],driverLengths=[],driverTotal=0,driverTime=0;
function stopDriver(){if(driverFrame!==null)cancelAnimationFrame(driverFrame);driverFrame=null;}
function drawDriver(seconds,duration){
 var remaining=driverTotal*Math.max(0,Math.min(1,seconds/duration));
 for(var i=0;i<driverLengths.length;i++){
  var length=driverLengths[i];
  if(length>0&&remaining<=length){var t=remaining/length;var a=driverPoints[i],b=driverPoints[i+1];placeDriver([a[1]+(b[1]-a[1])*t,a[0]+(b[0]-a[0])*t],Math.atan2((b[0]-a[0])*Math.cos(a[1]*Math.PI/180),b[1]-a[1])*180/Math.PI);return;}
  remaining-=length;
 }
 var last=driverPoints[driverPoints.length-1];if(last)placeDriver([last[1],last[0]],driverHeading);
}
function animateDriver(motion,reduced){
 stopDriver();
 if(!motion){driverMotionKey='';return;}
 if(motion.key!==driverMotionKey){
  driverMotionKey=motion.key;driverPoints=motion.coordinates;driverLengths=[];driverTotal=0;driverTime=motion.elapsed;
  for(var i=1;i<driverPoints.length;i++){var a=driverPoints[i-1],b=driverPoints[i];var length=Math.hypot((b[0]-a[0])*Math.cos(b[1]*Math.PI/180),b[1]-a[1]);driverLengths.push(length);driverTotal+=length;}
 }
 if(!motion.running||reduced){driverTime=motion.elapsed;drawDriver(driverTime,motion.duration);return;}
 var from=driverTime,to=motion.elapsed,started=performance.now();
 function frame(now){
  var progress=Math.min(1,Math.max(0,(now-started)/250));driverTime=from+(to-from)*progress;
  drawDriver(driverTime,motion.duration);
  if(progress<1)driverFrame=requestAnimationFrame(frame);else driverFrame=null;
 }
 driverFrame=requestAnimationFrame(frame);
}
function placeDriver(position,heading){
 driverHeading=heading;simDriver.setLatLng(position);
 if(!navigationActive)return;
 var bearing=map.getBearing?map.getBearing():0;
 if(map.setBearing){
  var delta=((-heading-bearing+540)%360+360)%360-180;
  map.setBearing(navigationData.reduceMotion||!navigationData.driverMotion||!navigationData.driverMotion.running?-heading:bearing+delta*0.16);
 }
 var icon=simDriver.getElement&&simDriver.getElement();
 if(icon){var arrow=icon.querySelector('svg');if(arrow)arrow.style.transform='rotate('+(heading+(map.getBearing?map.getBearing():0))+'deg)';}
 var size=map.getSize(),top=Math.min(navigationData.topInset||158,size.y*.3);
 var bottom=Math.min(navigationData.bottomInset||250,size.y-top-100);
 var target=L.point(size.x/2,top+(size.y-top-bottom)*0.72);
 var offset=map.latLngToContainerPoint(position).subtract(target);
 if(Math.abs(offset.x)>0.5||Math.abs(offset.y)>0.5)map.panBy(offset,{animate:false});
}
function setNavigation(d){
 navigationData=d;
 if(!!d.navigation===navigationActive)return;
 navigationActive=!!d.navigation;map.stop();
 if(baseLayer&&navigationLayer){map.removeLayer(navigationActive?baseLayer:navigationLayer);(navigationActive?navigationLayer:baseLayer).addTo(map);}
 if(map.setPitch)map.setPitch(navigationActive?38:0);
 if(!navigationActive){if(map.setBearing)map.setBearing(0);return;}
 if(d.driver)map.setView([d.driver.latitude,d.driver.longitude],16.8,{animate:false});
 var coordinates=d.driverMotion&&d.driverMotion.coordinates;
 if(coordinates&&coordinates.length>1){var a=coordinates[0],b=coordinates[1];driverHeading=Math.atan2((b[0]-a[0])*Math.cos(a[1]*Math.PI/180),b[1]-a[1])*180/Math.PI;if(map.setBearing)map.setBearing(-driverHeading);}
}
var map=L.map('map',{zoomControl:false,rotate:true,rotateControl:false,shiftKeyRotate:false,pitchDrag:false,touchRotate:false,touchPitch:false}).setView([-23.5505,-46.6333],13);var layer=L.layerGroup().addTo(map);var routeLayer=null;var lastRoute='';var lastFocus=0;var lastPlace=0;
function simulationFrame(points,d){
 var bounds=L.latLngBounds(points.map(p=>[p[1],p[0]]));
 var h=map.getSize().y;var top=Math.min(d.topInset||170,h*.3);var bottom=Math.min(d.bottomInset||300,h-top-100);
 var before=L.point(26,top),after=L.point(26,bottom);
 var zoom=Math.min(17,map.getBoundsZoom(bounds,false,before.add(after)));
 var center=map.unproject(map.project(bounds.getSouthWest(),zoom).add(map.project(bounds.getNorthEast(),zoom)).divideBy(2).add(after.subtract(before).divideBy(2)),zoom);
 return {center:center,zoom:zoom};
}
function updateTileScale(){map.getPane('tilePane').style.setProperty('--tile-scale',String(Math.pow(2,Math.max(0,map.getZoom()-(navigationActive?16:14)))));}map.on('zoom',updateTileScale);updateTileScale();
fetch('https://tiles.openfreemap.org/planet').then(r=>{if(!r.ok)throw Error();return r.json();}).then(info=>{
var styles={};(info.vector_layers||[]).forEach(l=>styles[l.id]=[]);
styles.water={fill:true,fillColor:'#c7d1d5',fillOpacity:1,stroke:false};styles.park={fill:true,fillColor:'#d5dddd',fillOpacity:1,stroke:false};
styles.transportation=function(p,z){if(p.class==='rail')return [];var major=['motorway','trunk','primary','secondary'].includes(p.class);return {color:'#fff',weight:major?3:1.5,opacity:1,lineCap:'round',lineJoin:'round',fill:false};};
var options={rendererFactory:L.svg.tile,vectorTileLayerStyles:styles,maxNativeZoom:14,maxZoom:19,attribution:'<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'};
baseLayer=L.vectorGrid.protobuf(info.tiles[0],options);
// Render z14 vectors into 1024px tiles at z16, instead of enlarging a 256px texture.
var NavigationGrid=L.VectorGrid.Protobuf.extend({_getVectorTilePromise:function(coords){return L.VectorGrid.Protobuf.prototype._getVectorTilePromise.call(this,{x:coords.x,y:coords.y,z:coords.z-2});}});
navigationLayer=new NavigationGrid(info.tiles[0],{...options,tileSize:1024,minZoom:2,maxNativeZoom:16});
(navigationActive?navigationLayer:baseLayer).addTo(map);
}).catch(()=>{document.getElementById('hint').style.display='block';document.getElementById('hint').textContent='Mapa indisponível. Verifique a conexão.';});
document.getElementById('hint').style.display='none';
map.on('click',e=>send({type:'pick',latitude:e.latlng.lat,longitude:e.latlng.lng}));
window.updateMap=function(d){
if(d.simulation){
 if(!simLayer){map.stop();savedView={center:map.getCenter(),zoom:map.getZoom(),zoomSnap:map.options.zoomSnap};map.options.zoomSnap=0;simLayer=L.layerGroup().addTo(map);layer.clearLayers();if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}}
 setNavigation(d);
 if(!d.route){
  if(simRouteKey){map.stop();simRouteKey='';simFocusKey='';}
  if(d.simulationPreview&&d.simulationPreview.length){var focusKey=JSON.stringify([d.simulationPreview,d.bottomInset,d.topInset]);if(focusKey!==simFocusKey){simFocusKey=focusKey;var preview=simulationFrame(d.simulationPreview,d);map.stop();map.setView(preview.center,Math.min(18,preview.zoom+0.65),{animate:false});}}
 }
 var key=JSON.stringify([d.origin,d.destination,d.route,d.bottomInset,d.topInset,d.passengerOnboard,d.navigation]);
 if(key!==simKey){stopDriver();driverMotionKey='';simKey=key;simLayer.clearLayers();simDriver=null;
  if(d.route&&d.route.length){
   L.polyline(d.route.map(p=>[p[1],p[0]]),{color:d.navigation?'#087f71':'#24383e',weight:d.navigation?7:5}).addTo(simLayer);
   if(!navigationActive){
   var framing=simulationFrame(d.route,d);
   var routeKey=JSON.stringify([d.origin,d.destination,d.route]);var newOffer=routeKey!==simRouteKey;simRouteKey=routeKey;
   var reduced=!!d.reduceMotion||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
   map.stop();
   if(newOffer&&!reduced)map.flyTo(framing.center,framing.zoom,{duration:0.9,animate:true});
   else map.setView(framing.center,framing.zoom,{animate:!reduced,duration:0.45});
   }
  }
  if(d.approachRoute)L.polyline(d.approachRoute.map(p=>[p[1],p[0]]),{color:'#087dd5',weight:d.navigation?7:5,dashArray:d.navigation?null:'7 6'}).addTo(simLayer);
  if(d.origin&&!d.passengerOnboard)L.marker([d.origin.latitude,d.origin.longitude],{icon:L.divIcon({className:'',html:'<div style="width:38px;height:38px;border-radius:50%;background:#087dd5;border:3px solid white;display:grid;place-items:center;box-shadow:0 2px 8px #0004"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="6" r="4"/><path d="M5 22v-7a7 7 0 0114 0v7z"/></svg></div>',iconSize:[44,44],iconAnchor:[22,22]})}).addTo(simLayer).bindTooltip('Passageiro · embarque simulado');
  if(d.destination)L.circleMarker([d.destination.latitude,d.destination.longitude],{radius:10,fillColor:'#24383e',color:'white',weight:3,fillOpacity:1}).addTo(simLayer).bindTooltip('Destino do passageiro');
 }
 if(d.driver){
  if(!simDriver){
   var badge=d.passengerOnboard?'<span style="position:absolute;right:-8px;top:-10px;background:#087f71;border:2px solid white;border-radius:50%;color:white;width:19px;height:19px;text-align:center;font-size:13px;line-height:19px">✓</span>':'';
   var arrow=d.navigation?'<svg viewBox="0 0 34 34"><path d="M17 3L29 29L17 24L5 29Z" fill="#087f71" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>':'';
   var size=d.navigation?34:20;
   simDriver=L.marker([d.driver.latitude,d.driver.longitude],{icon:L.divIcon({className:d.navigation?'driver-arrow':'location-marker',html:arrow+badge,iconSize:[size,size],iconAnchor:[size/2,size/2]})}).addTo(simLayer).bindTooltip(d.passengerOnboard?'Passageiro a bordo':'Motorista simulado');
  }
  if(!d.driverMotion)placeDriver([d.driver.latitude,d.driver.longitude],driverHeading);
  animateDriver(d.driverMotion,!!d.reduceMotion);
 }else{stopDriver();driverMotionKey='';}
 return;
}
if(simLayer){setNavigation({navigation:false});stopDriver();driverMotionKey='';map.stop();map.removeLayer(simLayer);simLayer=null;simDriver=null;simKey='';simFocusKey='';simRouteKey='';lastRoute='';if(savedView){map.options.zoomSnap=savedView.zoomSnap;map.setView(savedView.center,savedView.zoom,{animate:false});}}
layer.clearLayers();d.reports.forEach(r=>{var marker=L.circleMarker([r.latitude,r.longitude],{radius:10,color:'#fff',weight:2,fillColor:'#bd6c20',fillOpacity:1}).addTo(layer);var label=document.createElement('span');label.textContent=r.title;marker.bindTooltip(label);marker.on('click',()=>send({type:'report',id:r.id}));});
function point(p,label){if(p)L.marker([p.latitude,p.longitude],{icon:L.divIcon({className:'endpoint',iconSize:[8,8],iconAnchor:[4,4]})}).addTo(layer).bindTooltip(label,{permanent:true,direction:'right',className:'endpoint-label'});}
point(d.origin,'Partida');point(d.destination,d.routeMinutes?'Chegada · ~'+d.routeMinutes+' min':'Destino');point(d.selected,'Relato');
var markerPosition=d.position||d.origin;if(markerPosition)L.marker([markerPosition.latitude,markerPosition.longitude],{icon:L.divIcon({className:'location-marker'+(d.position?'':' manual'),iconSize:[20,20],iconAnchor:[10,10]})}).addTo(layer).bindTooltip(d.position?'Sua posição (última consulta)':'Origem selecionada — não é GPS');
if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}if(d.route&&d.route.length){routeLayer=L.polyline(d.route.map(p=>[p[1],p[0]]),{color:'#111111',weight:3.5}).addTo(map);var key=JSON.stringify([d.route[0],d.route[d.route.length-1]]);if(lastRoute!==key){map.fitBounds(routeLayer.getBounds(),{paddingTopLeft:[40,110],paddingBottomRight:[110,50]});lastRoute=key;}}
if(!d.route)lastRoute='';
if(d.position){var p=d.position;var xy=[p.latitude,p.longitude];if(Number.isFinite(p.accuracy)&&p.accuracy>0)L.circle(xy,{radius:p.accuracy,color:'#737e80',weight:1,dashArray:'4 4',fillOpacity:0,interactive:false}).addTo(layer);if(!d.route&&d.locationFocus&&d.locationFocus!==lastFocus){map.setView(xy,Math.max(11,Math.min(16,Math.floor(Math.log2(40075016/(Math.max(p.accuracy||30,30)*4))))));lastFocus=d.locationFocus;}}
if(!d.route&&d.placeFocus&&d.placeFocus.key!==lastPlace){map.setView([d.placeFocus.latitude,d.placeFocus.longitude],16);lastPlace=d.placeFocus.key;}
};window.addEventListener('message',e=>{if(e.source!==parent)return;try{var d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(d.type==='update')window.updateMap(d.data);}catch{}});send({type:'ready'});
}
</script></body></html>`;
