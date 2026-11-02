export type MapPoint = { latitude: number; longitude: number };
export type MapData = {
  position?: (MapPoint & { accuracy: number | null }) | null;
  locationFocus?: number;
  reports: { id: string; latitude: number; longitude: number; title: string }[];
  origin: MapPoint | null;
  destination: MapPoint | null;
  selected: MapPoint | null;
  route: number[][] | null;
};
export type MapProps = {
  data: MapData;
  onPick: (point: MapPoint) => void;
  onReport: (id: string) => void;
};
export const mapHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}body{background:#e5ebdf;font:14px sans-serif}#hint{position:absolute;z-index:999;bottom:30px;left:10px;background:white;padding:8px;border-radius:8px;max-width:75%}</style></head><body><div id="map"></div><div id="hint">Carregando mapa…</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
function send(data){var message=JSON.stringify({saferide:true,...data});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else parent.postMessage(message,'*');}
if(typeof L==='undefined'){document.getElementById('hint').textContent='Mapa indisponível. Use os pontos de referência e a lista abaixo.';}else{
var map=L.map('map').setView([-23.5505,-46.6333],13);var layer=L.layerGroup().addTo(map);var routeLayer=null;var lastRoute='';var lastFocus=0;
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map).on('tileerror',()=>{document.getElementById('hint').textContent='Falha ao carregar parte do mapa.';});
document.getElementById('hint').textContent='Toque no mapa para selecionar um ponto';
map.on('click',e=>send({type:'pick',latitude:e.latlng.lat,longitude:e.latlng.lng}));
window.updateMap=function(d){layer.clearLayers();d.reports.forEach(r=>{var marker=L.circleMarker([r.latitude,r.longitude],{radius:10,color:'#fff',weight:2,fillColor:'#bd6c20',fillOpacity:1}).addTo(layer);var label=document.createElement('span');label.textContent=r.title;marker.bindTooltip(label);marker.on('click',()=>send({type:'report',id:r.id}));});
function point(p,color,label){if(p){var marker=L.circleMarker([p.latitude,p.longitude],{radius:9,color:color,fillColor:color,fillOpacity:1}).addTo(layer);marker.bindTooltip(label);}}point(d.origin,'#087f71','Origem');point(d.destination,'#173e38','Destino');point(d.selected,'#b95d25','Local do relato');
if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}if(d.route&&d.route.length){routeLayer=L.polyline(d.route.map(p=>[p[1],p[0]]),{color:'#087f71',weight:5}).addTo(map);var key=JSON.stringify([d.route[0],d.route[d.route.length-1]]);if(lastRoute!==key){map.fitBounds(routeLayer.getBounds(),{padding:[35,35]});lastRoute=key;}}
if(!d.route)lastRoute='';
if(d.position){var p=d.position;var xy=[p.latitude,p.longitude];if(Number.isFinite(p.accuracy)&&p.accuracy>0)L.circle(xy,{radius:p.accuracy,color:'#2563eb',weight:1,fillOpacity:0.1,interactive:false}).addTo(layer);L.circleMarker(xy,{radius:7,color:'white',weight:2,fillColor:'#2563eb',fillOpacity:1}).addTo(layer).bindTooltip('Sua posição (última consulta)');if(d.locationFocus&&d.locationFocus!==lastFocus){map.setView(xy,Math.max(11,Math.min(16,Math.floor(Math.log2(40075016/(Math.max(p.accuracy||30,30)*4))))));lastFocus=d.locationFocus;}}
};window.addEventListener('message',e=>{if(e.source!==parent)return;try{var d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(d.type==='update')window.updateMap(d.data);}catch{}});send({type:'ready'});
}
</script></body></html>`;
