export type MapPoint = { latitude: number; longitude: number };
export type MapData = {
  simulation?: boolean;
  simulationPreview?: number[][] | null;
  reduceMotion?: boolean;
  driver?: MapPoint | null;
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
export const mapHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}.leaflet-bottom{bottom:0}.leaflet-top .leaflet-control-zoom{margin-top:140px}.leaflet-container{background:#dfe4e5}.leaflet-tile-pane svg path[stroke-width="1.5"]{stroke-width:calc(1.5px / var(--tile-scale,1))}.leaflet-tile-pane svg path[stroke-width="3"]{stroke-width:calc(3px / var(--tile-scale,1))}.location-marker{box-sizing:border-box;border:3px solid white;border-radius:50%;background:#087f71;box-shadow:0 0 0 6px #087f7126,0 2px 5px #0003}.location-marker.manual{background:#fff;border:4px solid #243536;box-shadow:0 0 0 5px #2435361a}.endpoint{background:#111;border:2px solid white}.endpoint-label{border:0;box-shadow:0 1px 5px #0002;font:11px Arial;padding:5px 7px;color:#111}body{background:#dfe4e5;font:14px sans-serif}#hint{position:absolute;z-index:999;bottom:30px;left:10px;background:white;padding:8px;border-radius:8px;max-width:75%}</style></head><body><div id="map"></div><div id="hint">Carregando mapa…</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://unpkg.com/leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.bundled.js"></script><script>
function send(data){var message=JSON.stringify({saferide:true,...data});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else parent.postMessage(message,'*');}
if(typeof L==='undefined'){document.getElementById('hint').textContent='Mapa indisponível. Use os pontos de referência e a lista abaixo.';}else{
var simLayer=null,simDriver=null,simKey='',simFocusKey='',simRouteKey='',savedView=null;
var map=L.map('map',{zoomControl:false}).setView([-23.5505,-46.6333],13);var layer=L.layerGroup().addTo(map);var routeLayer=null;var lastRoute='';var lastFocus=0;var lastPlace=0;
function simulationFrame(points,d){
 var bounds=L.latLngBounds(points.map(p=>[p[1],p[0]]));
 var h=map.getSize().y;var top=Math.min(d.topInset||170,h*.3);var bottom=Math.min(d.bottomInset||300,h-top-100);
 var before=L.point(26,top),after=L.point(26,bottom);
 var zoom=Math.min(17,map.getBoundsZoom(bounds,false,before.add(after)));
 var center=map.unproject(map.project(bounds.getSouthWest(),zoom).add(map.project(bounds.getNorthEast(),zoom)).divideBy(2).add(after.subtract(before).divideBy(2)),zoom);
 return {center:center,zoom:zoom};
}
function updateTileScale(){map.getPane('tilePane').style.setProperty('--tile-scale',String(Math.pow(2,Math.max(0,map.getZoom()-14))));}map.on('zoom',updateTileScale);updateTileScale();
fetch('https://tiles.openfreemap.org/planet').then(r=>{if(!r.ok)throw Error();return r.json();}).then(info=>{
var styles={};(info.vector_layers||[]).forEach(l=>styles[l.id]=[]);
styles.water={fill:true,fillColor:'#c7d1d5',fillOpacity:1,stroke:false};styles.park={fill:true,fillColor:'#d5dddd',fillOpacity:1,stroke:false};
styles.transportation=function(p,z){if(p.class==='rail')return [];var major=['motorway','trunk','primary','secondary'].includes(p.class);return {color:'#fff',weight:major?3:1.5,opacity:1,lineCap:'round',lineJoin:'round',fill:false};};
L.vectorGrid.protobuf(info.tiles[0],{rendererFactory:L.svg.tile,vectorTileLayerStyles:styles,maxNativeZoom:14,maxZoom:19,attribution:'<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'}).addTo(map);
}).catch(()=>{document.getElementById('hint').style.display='block';document.getElementById('hint').textContent='Mapa indisponível. Verifique a conexão.';});
document.getElementById('hint').style.display='none';
map.on('click',e=>send({type:'pick',latitude:e.latlng.lat,longitude:e.latlng.lng}));
window.updateMap=function(d){
if(d.simulation){
 if(!simLayer){map.stop();savedView={center:map.getCenter(),zoom:map.getZoom(),zoomSnap:map.options.zoomSnap};map.options.zoomSnap=0;simLayer=L.layerGroup().addTo(map);layer.clearLayers();if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}}
 if(!d.route){
  if(simRouteKey){map.stop();simRouteKey='';simFocusKey='';}
  if(d.simulationPreview&&d.simulationPreview.length){var focusKey=JSON.stringify([d.simulationPreview,d.bottomInset,d.topInset]);if(focusKey!==simFocusKey){simFocusKey=focusKey;var preview=simulationFrame(d.simulationPreview,d);map.stop();map.setView(preview.center,Math.min(18,preview.zoom+0.65),{animate:false});}}
 }
 var key=JSON.stringify([d.origin,d.destination,d.route,d.bottomInset,d.topInset]);
 if(key!==simKey){simKey=key;simLayer.clearLayers();simDriver=null;
  if(d.route&&d.route.length){
   L.polyline(d.route.map(p=>[p[1],p[0]]),{color:'#24383e',weight:5}).addTo(simLayer);
   var framing=simulationFrame(d.route,d);
   var routeKey=JSON.stringify([d.origin,d.destination,d.route]);var newOffer=routeKey!==simRouteKey;simRouteKey=routeKey;
   var reduced=!!d.reduceMotion||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
   map.stop();
   if(newOffer&&!reduced)map.flyTo(framing.center,framing.zoom,{duration:0.9,animate:true});
   else map.setView(framing.center,framing.zoom,{animate:!reduced,duration:0.45});
  }
  if(d.approachRoute)L.polyline(d.approachRoute.map(p=>[p[1],p[0]]),{color:'#087dd5',weight:5,dashArray:'7 6'}).addTo(simLayer);
  if(d.origin)L.marker([d.origin.latitude,d.origin.longitude],{icon:L.divIcon({className:'',html:'<div style="width:38px;height:38px;border-radius:50%;background:#087dd5;border:3px solid white;display:grid;place-items:center;box-shadow:0 2px 8px #0004"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="6" r="4"/><path d="M5 22v-7a7 7 0 0114 0v7z"/></svg></div>',iconSize:[44,44],iconAnchor:[22,22]})}).addTo(simLayer).bindTooltip('Passageiro · embarque simulado');
  if(d.destination)L.circleMarker([d.destination.latitude,d.destination.longitude],{radius:10,fillColor:'#24383e',color:'white',weight:3,fillOpacity:1}).addTo(simLayer).bindTooltip('Destino do passageiro');
 }
 if(d.driver){if(!simDriver)simDriver=L.marker([d.driver.latitude,d.driver.longitude],{icon:L.divIcon({className:'location-marker',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(simLayer).bindTooltip('Motorista simulado');else simDriver.setLatLng([d.driver.latitude,d.driver.longitude]);}
 return;
}
if(simLayer){map.stop();map.removeLayer(simLayer);simLayer=null;simDriver=null;simKey='';simFocusKey='';simRouteKey='';lastRoute='';if(savedView){map.options.zoomSnap=savedView.zoomSnap;map.setView(savedView.center,savedView.zoom,{animate:false});}}
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
