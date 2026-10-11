export const cityCenter={lat:19.4326,lng:-99.1332};
export function validPoint(point){return Boolean(point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&Math.abs(point.lat)<=90&&Math.abs(point.lng)<=180);}
// Approximate extent for this CDMX prototype; not an administrative polygon.
export function inDemoArea(point){return validPoint(point)&&point.lat>=19.0&&point.lat<=19.65&&point.lng>=-99.4&&point.lng<=-98.9;}
export function distanceKm(a,b){
 if(!validPoint(a)||!validPoint(b))return null;
 const radians=n=>n*Math.PI/180;
 const dLat=radians(b.lat-a.lat),dLng=radians(b.lng-a.lng);
 const h=Math.sin(dLat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLng/2)**2;
 return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function formPoint(data){
 if(data.latitude===''||data.longitude===''||data.latitude==null||data.longitude==null)return null;
 const point={lat:Number(data.latitude),lng:Number(data.longitude)};
 return validPoint(point)?point:null;
}
