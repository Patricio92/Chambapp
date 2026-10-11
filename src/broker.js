import {distanceKm,validPoint} from './geo.js';
export const activeStatuses=['claimed','quoted','accepted','traveling','working'];
export function isBusy(profile,jobs){return jobs.some(j=>j.professional?.id===profile.id&&activeStatuses.includes(j.status));}
export function canServe(request,profile,jobs=[]){
 if(!profile || profile.available===false || request.service!==profile.service || isBusy(profile,jobs))return false;
 const distance=distanceKm(request.point,profile.point);
 if(distance===null)return false;
 const radius=Number(profile.radiusKm??10);
 return Number.isFinite(radius)&&radius>=1&&radius<=50&&distance<=radius;
}
export function rankedProfessionals(request,profiles,jobs=[]){
 if(!validPoint(request.point))return [];
 return profiles.filter(p=>canServe(request,p,jobs)).map(p=>({...p,distanceKm:distanceKm(request.point,p.point)})).sort((a,b)=>a.distanceKm-b.distanceKm||a.name.localeCompare(b.name,'es'));
}
