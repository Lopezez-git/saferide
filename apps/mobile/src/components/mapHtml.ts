export type MapPoint = { latitude: number; longitude: number };
export type MapData = {
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
  height?: number;
  data: MapData;
  onPick: (point: MapPoint) => void;
  onReport: (id: string) => void;
};
export const mapHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}.leaflet-bottom{bottom:0}.leaflet-top .leaflet-control-zoom{margin-top:140px}.leaflet-container{background:#dfe4e5}.leaflet-tile-pane svg path[stroke-width="1.5"]{stroke-width:calc(1.5px / var(--tile-scale,1))}.leaflet-tile-pane svg path[stroke-width="3"]{stroke-width:calc(3px / var(--tile-scale,1))}.location-marker{box-sizing:border-box;border:3px solid white;border-radius:50%;background:#087f71;box-shadow:0 0 0 6px #087f7126,0 2px 5px #0003}.location-marker.manual{background:#fff;border:4px solid #243536;box-shadow:0 0 0 5px #2435361a}.endpoint{background:#111;border:2px solid white}.endpoint-label{border:0;box-shadow:0 1px 5px #0002;font:11px Arial;padding:5px 7px;color:#111}body{background:#dfe4e5;font:14px sans-serif}#hint{position:absolute;z-index:999;bottom:30px;left:10px;background:white;padding:8px;border-radius:8px;max-width:75%}</style></head><body><div id="map"></div><div id="hint">Carregando mapa…</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://unpkg.com/leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.bundled.js"></script><script>
function send(data){var message=JSON.stringify({saferide:true,...data});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else parent.postMessage(message,'*');}
if(typeof L==='undefined'){document.getElementById('hint').textContent='Mapa indisponível. Use os pontos de referência e a lista abaixo.';}else{
var map=L.map('map',{zoomControl:false}).setView([-23.5505,-46.6333],13);var layer=L.layerGroup().addTo(map);var routeLayer=null;var lastRoute='';var lastFocus=0;var lastPlace=0;
function updateTileScale(){map.getPane('tilePane').style.setProperty('--tile-scale',String(Math.pow(2,Math.max(0,map.getZoom()-14))));}map.on('zoom',updateTileScale);updateTileScale();
fetch('https://tiles.openfreemap.org/planet').then(r=>{if(!r.ok)throw Error();return r.json();}).then(info=>{
var styles={};(info.vector_layers||[]).forEach(l=>styles[l.id]=[]);
styles.water={fill:true,fillColor:'#c7d1d5',fillOpacity:1,stroke:false};styles.park={fill:true,fillColor:'#d5dddd',fillOpacity:1,stroke:false};
styles.transportation=function(p,z){if(p.class==='rail')return [];var major=['motorway','trunk','primary','secondary'].includes(p.class);return {color:'#fff',weight:major?3:1.5,opacity:1,lineCap:'round',lineJoin:'round',fill:false};};
L.vectorGrid.protobuf(info.tiles[0],{rendererFactory:L.svg.tile,vectorTileLayerStyles:styles,maxNativeZoom:14,maxZoom:19,attribution:'<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'}).addTo(map);
}).catch(()=>{document.getElementById('hint').style.display='block';document.getElementById('hint').textContent='Mapa indisponível. Verifique a conexão.';});
document.getElementById('hint').style.display='none';
map.on('click',e=>send({type:'pick',latitude:e.latlng.lat,longitude:e.latlng.lng}));
window.updateMap=function(d){layer.clearLayers();d.reports.forEach(r=>{var marker=L.circleMarker([r.latitude,r.longitude],{radius:10,color:'#fff',weight:2,fillColor:'#bd6c20',fillOpacity:1}).addTo(layer);var label=document.createElement('span');label.textContent=r.title;marker.bindTooltip(label);marker.on('click',()=>send({type:'report',id:r.id}));});
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
