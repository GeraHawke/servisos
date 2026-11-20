// Negocios simulados (todos menos CFG.MANUAL): aceptan en 3-10 s y avanzan sus órdenes solos.
import { CFG } from './datos.js';
import { ahora } from './estado.js';
export function tick(e) {
  const t = ahora(); let c = false;
  for (const p of e.ped) {
    if (p.fase === 'sol') {
      if (p.est === 'pendiente') {
        if (p.neg !== CFG.MANUAL && t >= p.t0 + p.delay * 1000) { p.est = 'aceptada'; p.tAcepta = t; c = true; }
        else if (t > p.t0 + CFG.ESPERA_MAX_S * 1000) { p.est = 'sinresp'; c = true; }
      } else if (p.est === 'aceptada' && t > p.tAcepta + CFG.VIGENCIA_S * 1000) { p.est = 'caducada'; c = true; }
    } else if (p.neg !== CFG.MANUAL) {
      if (p.est === 'recibida' && t >= p.tOrd + p.delay * 2000) { p.est = 'preparando'; p.tInicio = t; c = true; }
      else if (p.est === 'preparando' && t >= p.tOrd + p.delay * 5000) { p.est = 'lista'; p.tLista = t; c = true; }
      else if (p.est === 'lista' && t >= p.tLista + p.delay * 5000) { p.est = 'entregada'; p.tEntrega = t; c = true; } // el cliente "pasa a recoger" solo
    }
  }
  return c;
}
