import test from 'node:test';
import assert from 'node:assert/strict';
import { transition } from '../src/model.js';
test('solicitud completa: asignación, cotización, aceptación, finalización y calificación',()=>{
 let job={status:'pending'};
 job=transition(job,'claim',{professional:{id:'pro',name:'Ana'}});
 job=transition(job,'quote',{amount:650,detail:'Reparación de fuga'});
 assert.equal(job.quote.amount,650);
 job=transition(job,'accept');job=transition(job,'complete');job=transition(job,'rate',{rating:5});
 assert.equal(job.status,'completed');assert.equal(job.rating,5);
 assert.throws(()=>transition(job,'rate',{rating:4}));
});
test('rechazar cotización evita completar el servicio',()=>{
 const job=transition({status:'quoted',quote:{amount:700}},'reject');
 assert.equal(job.status,'rejected');assert.throws(()=>transition(job,'complete'));
});
test('no permite saltar estados ni precios o calificaciones inválidos',()=>{
 assert.throws(()=>transition({status:'pending'},'complete'));
 assert.throws(()=>transition({status:'pending'},'claim',{}));
 for(const amount of [-1,0,NaN,Infinity,100001])assert.throws(()=>transition({status:'claimed'},'quote',{amount,detail:'Trabajo'}));
 assert.throws(()=>transition({status:'claimed'},'quote',{amount:500,detail:' '}));
 assert.throws(()=>transition({status:'completed'},'rate',{rating:6}));
});
