// Estado compartido entre ventanas: localStorage + BroadcastChannel (mismo origen, Live Server).
const KEY = 'servisos_v1';
const ch = new BroadcastChannel('servisos');
export const vacio = () => ({ ped: [], compras: 1047, seq: 0, cod: {}, metodo: {}, abierta: null, pausa: false, rid: 0 });
export function leer() { try { return Object.assign(vacio(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return vacio(); } }
export function guardar(e) { try { localStorage.setItem(KEY, JSON.stringify(e)); } catch (x) {} ch.postMessage(1); }
export function alCambiar(fn) { ch.onmessage = () => fn(leer()); addEventListener('storage', v => { if (v.key === KEY) fn(leer()); }); }
export function reiniciar() { const e = vacio(); e.rid = Date.now(); guardar(e); }
export const ahora = () => Date.now();
// pedido: { id, compra, neg, items[], modo, hora, fase:'sol'|'ord', est, minExtra, t0, delay, tAcepta, tOrd, tInicio, tLista }
