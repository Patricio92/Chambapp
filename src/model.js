export {services} from './data/services.js';
export const labels = {pending:'Buscando profesional',claimed:'Profesional asignado',quoted:'Cotización recibida',accepted:'Servicio confirmado',traveling:'Profesional en camino',working:'Trabajando',rejected:'Cotización rechazada',completed:'Servicio terminado'};
export function transition(job, action, data = {}) {
  const expected = {claim:'pending',quote:'claimed',accept:'quoted',reject:'quoted',travel:'accepted',arrive:'traveling',complete:['accepted','working'],rate:'completed'};
  if (!Object.hasOwn(expected,action) || !(Array.isArray(expected[action])?expected[action].includes(job.status):job.status===expected[action])) throw new Error('El estado de la solicitud cambió. Vuelve a intentarlo.');
  if (action === 'claim') {if (!data.professional?.id && !data.professional?.name) throw new Error('Registra tu perfil primero.'); return {...job,status:'claimed',professional:data.professional};}
  if (action === 'quote') {if (!Number.isFinite(data.amount) || data.amount <= 0 || data.amount > 100000 || !data.detail?.trim()) throw new Error('Escribe un precio válido y qué incluye.');return {...job,status:'quoted',quote:{amount:data.amount,detail:data.detail.trim()}};}
  if (action === 'rate') {if(job.rating || !Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) throw new Error('Selecciona una calificación de 1 a 5.');return {...job,rating:data.rating};}
  return {...job,status:{accept:'accepted',reject:'rejected',travel:'traveling',arrive:'working',complete:'completed'}[action]};
}
