import {cityCenter,inDemoArea,validPoint} from './geo.js';
const L=window.L;
const tileURL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
function icon(type){return L.divIcon({className:'map-pin '+type,html:type==='client'?'⌂':'✓',iconSize:[30,30],iconAnchor:[15,15]});}
function baseMap(element,center){
 const map=L.map(element,{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([center.lat,center.lng],13);
 L.tileLayer(tileURL,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).on('tileerror',()=>{
  const message=element.parentElement.querySelector('[data-tile-warning]');if(message){message.hidden=false;message.textContent='No se pudo cargar el mapa de calles. Revisa tu conexión. Puedes usar “Mi ubicación” o volver a intentarlo.';}
 }).addTo(map);
 return map;
}
function textPopup(text){const div=document.createElement('div');div.textContent=text;return div;}
export function mountPicker(element,{point,onPick}){
 const map=baseMap(element,validPoint(point)?point:cityCenter);
 let marker=null;
 let confirmed=validPoint(point)?point:null;
 const candidates=L.layerGroup().addTo(map);
 const select=next=>{
  if(!inDemoArea(next)){if(marker&&confirmed)marker.setLatLng([confirmed.lat,confirmed.lng]);onPick(null,'El punto está fuera del área aproximada de CDMX que cubre esta demo.');return;}
  if(!marker){marker=L.marker([next.lat,next.lng],{icon:icon('client'),draggable:true}).addTo(map);marker.on('dragend',()=>{const p=marker.getLatLng();select({lat:p.lat,lng:p.lng});});}
  else marker.setLatLng([next.lat,next.lng]);
  confirmed=next;
  onPick(next);
 };
 if(validPoint(point))marker=L.marker([point.lat,point.lng],{icon:icon('client'),draggable:true}).addTo(map);
 if(marker)marker.on('dragend',()=>{const p=marker.getLatLng();select({lat:p.lat,lng:p.lng});});
 map.on('click',e=>select({lat:e.latlng.lat,lng:e.latlng.lng}));
 element.addEventListener('keydown',e=>{if(e.target===element&&e.key==='Enter'){e.preventDefault();const p=map.getCenter();select({lat:p.lat,lng:p.lng});}});
 return {
  locate(next){if(!inDemoArea(next)){onPick(null,'Tu ubicación está fuera del área aproximada de CDMX de esta demo. Marca otro punto.');return;}map.setView([next.lat,next.lng],16,{animate:false});select(next);},
  candidates(items){candidates.clearLayers();for(const p of items){if(validPoint(p.point))L.marker([p.point.lat,p.point.lng],{icon:icon('professional')}).bindPopup(textPopup(p.name+' · '+p.distanceKm.toFixed(1)+' km en línea recta')).addTo(candidates);}},
  destroy(){map.stop();map.remove();}
 };
}
export function mountJobMap(element,{point,professional}){
 const map=baseMap(element,point);
 const points=[[point.lat,point.lng]];
 L.marker(points[0],{icon:icon('client')}).bindPopup(textPopup('Lugar del servicio')).addTo(map);
 if(validPoint(professional?.point)){
  const end=[professional.point.lat,professional.point.lng];points.push(end);
  L.marker(end,{icon:icon('professional')}).bindPopup(textPopup(professional.name+' · última ubicación guardada')).addTo(map);
  L.polyline(points,{color:'#126b52',dashArray:'6 8',weight:2}).addTo(map);
  map.fitBounds(points,{padding:[30,30],maxZoom:15,animate:false});
 }
 return {destroy(){map.stop();map.remove();}};
}
