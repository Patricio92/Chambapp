export const colonies = ['Roma Norte','Roma Sur','Condesa','Del Valle','Narvarte','Coyoacán','Centro','Polanco','Santa María la Ribera','Otra colonia'];
export const labels = {pending:'Buscando profesional',claimed:'Profesional asignado',quoted:'Cotización recibida',accepted:'En proceso',rejected:'Cotización rechazada',completed:'Servicio terminado'};
export function transition(job, action, data = {}) {
  const expected = {claim:'pending',quote:'claimed',accept:'quoted',reject:'quoted',complete:'accepted',rate:'completed'};
  if (job.status !== expected[action]) throw new Error('El estado de la solicitud cambió. Vuelve a intentarlo.');
  if (action === 'claim') {if (!data.professional) throw new Error('Registra tu perfil primero.'); return {...job,status:'claimed',professional:data.professional};}
  if (action === 'quote') {if (!Number.isFinite(data.amount) || data.amount <= 0 || data.amount > 100000 || !data.detail?.trim()) throw new Error('Escribe un precio válido y qué incluye.');return {...job,status:'quoted',quote:{amount:data.amount,detail:data.detail.trim()}};}
  if (action === 'rate') {if(job.rating || !Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) throw new Error('Selecciona una calificación de 1 a 5.');return {...job,rating:data.rating};}
  return {...job,status:{accept:'accepted',reject:'rejected',complete:'completed'}[action]};
}
