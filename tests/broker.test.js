import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceKm,inDemoArea,formPoint} from '../src/geo.js';
import {rankedProfessionals,canServe,isBusy} from '../src/broker.js';
import {transition} from '../src/model.js';
const point={lat:19.4326,lng:-99.1332};
const request={status:'pending',service:'Plomería',point};
const professional={id:'pro',name:'Ana',service:'Plomería',point:{lat:19.433,lng:-99.132},available:true,radiusKm:10};
test('distancia geográfica, coordenadas vacías y área aproximada',()=>{
 assert.equal(distanceKm(point,point),0);assert(Math.abs(distanceKm({lat:0,lng:0},{lat:0,lng:1})-111.195)<0.01);
 assert.equal(distanceKm(null,point),null);assert.equal(formPoint({latitude:'',longitude:''}),null);assert.equal(formPoint({latitude:'abc',longitude:'1'}),null);
 assert(inDemoArea(point));assert(!inDemoArea({lat:20.67,lng:-103.35}));
});
test('filtra especialidad, disponibilidad, distancia y profesionales ocupados',()=>{
 assert(canServe(request,professional));
 assert(!canServe(request,{...professional,available:false}));assert(!canServe(request,{...professional,service:'Pintura'}));
 assert(!canServe(request,{...professional,point:{lat:19.60,lng:-99.30},radiusKm:1}));assert(!canServe(request,{...professional,point:null}));
 assert(!canServe(request,{...professional,radiusKm:NaN}));
 for(const status of ['claimed','quoted','accepted','traveling','working']){assert(isBusy(professional,[{professional,status}]));assert(!canServe(request,professional,[{professional,status}]));}
 for(const status of ['rejected','completed'])assert(canServe(request,professional,[{professional,status}]));
});
test('ordena por cercanía sin excluir una alcaldía vecina',()=>{
 const profiles=[{...professional,id:'far',point:{lat:19.44,lng:-99.14},borough:'Benito Juárez'},{...professional,id:'near',borough:'Cuauhtémoc'},{...professional,id:'off',available:false}];
 const result=rankedProfessionals({...request,borough:'Cuauhtémoc'},profiles);
 assert.deepEqual(result.map(p=>p.id),['near','far']);assert(result[0].distanceKm<result[1].distanceKm);
 assert.deepEqual(rankedProfessionals({...request,point:null},profiles),[]);
});
test('flujo de intermediación: confirmar, salir, llegar y completar',()=>{
 let job=transition(request,'claim',{professional});job=transition(job,'quote',{amount:800,detail:'Reparación'});job=transition(job,'accept');
 assert.throws(()=>transition(job,'arrive'));job=transition(job,'travel');assert.equal(job.status,'traveling');
 assert.throws(()=>transition(job,'complete'));job=transition(job,'arrive');assert.equal(job.status,'working');job=transition(job,'complete');job=transition(job,'rate',{rating:5});assert.equal(job.rating,5);
 assert.throws(()=>transition(job,'unknown'));
});
