import { CFG } from './datos.js';
import { leer, guardar, alCambiar, reiniciar, ahora } from './estado.js';

let E = leer(), last = '';
const app = document.getElementById('app'), btnPausa = document.getElementById('pausa');
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const base = p => Math.max(...p.items.map(i => i.min));
const lista = p => p.items.map(i => `${i.nombre} x${i.cant}`).join(', ');
function mut(fn) { E = leer(); fn(E); guardar(E); draw(); }

function draw() {
  const mis = E.ped.filter(p => p.neg === CFG.MANUAL);
  const sol = mis.filter(p => p.fase === 'sol' && (p.est === 'pendiente' || p.est === 'cambio'));
  const ord = mis.filter(p => p.fase === 'ord' && p.est !== 'entregada' && p.est !== 'cancelada');
  const nAhora = ord.filter(p => p.modo === 'ahora').length, nProg = ord.filter(p => p.modo === 'prog').length;
  btnPausa.textContent = E.pausa ? 'Reanudar pedidos' : 'Pausar'; btnPausa.className = E.pausa ? 'peligro' : 'ghost';
  let h = `<p class="cap mut">Ahora ${nAhora}/${CFG.CAP} · Programadas ${nProg}${E.pausa ? ' · <b class="rojo">Pedidos pausados</b>' : ''}</p><h2>Solicitudes</h2>`;
  if (!sol.length) h += '<p class="mut">No hay solicitudes nuevas.</p>';
  h += sol.map(p => { const b = base(p), esp = p.est === 'cambio';
    return `<div class="ord"><b>Orden #${p.compra} · ${lista(p)}</b><small>Plantilla: ${b} min · ${p.modo === 'ahora' ? 'Ahora' : 'Hora pedida ' + p.hora}</small>
<div class="big">${b + p.minExtra}:00</div>${p.minExtra ? `<small>+${p.minExtra} min sobre la plantilla (solo esta orden)</small>` : ''}
${esp ? '<p class="ambar">Esperando que el cliente acepte el cambio de tiempo…</p>' : `<div class="ctl"><button class="menos" data-act="menos" data-id="${p.id}">−1</button><div class="oval"><button data-act="mas" data-v="1" data-id="${p.id}">+1</button><button data-act="mas" data-v="5" data-id="${p.id}">+5</button><button data-act="mas" data-v="10" data-id="${p.id}">+10</button></div></div>
<div class="btns"><button class="primary" data-act="aceptar" data-id="${p.id}">Aceptar orden</button><button class="peligro" data-act="rechazar" data-id="${p.id}">Rechazar</button></div>`}</div>`; }).join('');
  h += '<h2 style="margin-top:20px">Órdenes pagadas</h2>';
  if (!ord.length) h += '<p class="mut">Aún no hay órdenes pagadas.</p>';
  h += ord.map(p => { let ex = '', bt = '';
    if (p.est === 'recibida') bt = `<button class="primary" data-act="empezar" data-id="${p.id}">Empezar a preparar</button>`;
    if (p.est === 'preparando') { const r = (p.tInicio + (base(p) + p.minExtra) * 60000 - ahora()) / 1000; ex = `<div class="big">${r > 0 ? mmss(r) : 'Tiempo estimado cumplido'}</div>`; bt = `<button class="primary" data-act="lista" data-id="${p.id}">Lista para recoger</button>`; }
    if (p.est === 'lista') ex = '<small class="verde">Lista · esperando que el cliente pase con su código</small>';
    return `<div class="ord"><b>Orden #${p.compra} · ${lista(p)}</b><small>${p.modo === 'ahora' ? 'Ahora' : 'Para las ' + p.hora} · <span class="chip ${p.est}">${p.est}</span></small>${ex}<div class="btns">${bt}</div></div>`; }).join('');
  if (h === last) return; last = h; app.innerHTML = h;
}
const set = (id, fn) => mut(e => { const p = e.ped.find(x => x.id === id); if (p) fn(p); });
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, id = +el.dataset.id;
  if (a === 'mas') set(id, p => p.minExtra += +el.dataset.v);
  if (a === 'menos') set(id, p => p.minExtra = Math.max(0, p.minExtra - 1));
  if (a === 'aceptar') set(id, p => { p.est = p.minExtra > 0 ? 'cambio' : 'aceptada'; p.tAcepta = ahora(); });
  if (a === 'rechazar') set(id, p => { p.est = 'rechazada'; });
  if (a === 'empezar') set(id, p => { p.est = 'preparando'; p.tInicio = ahora(); });
  if (a === 'lista') set(id, p => { p.est = 'lista'; p.tLista = ahora(); });
});
const msg = document.getElementById('msg'), inp = document.getElementById('codigo');
function validar() { const c = inp.value.trim(); E = leer(); const mis = E.ped.filter(p => p.neg === CFG.MANUAL && p.fase === 'ord');
  const ok = mis.find(p => p.est === 'lista' && E.cod[p.compra] === c);
  if (ok) { mut(e => { const p = e.ped.find(x => x.id === ok.id); p.est = 'entregada'; p.tEntrega = ahora(); }); msg.className = 'verde'; msg.innerHTML = `✓ Código válido. Entregar: <b>${lista(ok)}</b>`; inp.value = ''; return; }
  msg.className = 'rojo';
  msg.textContent = mis.some(p => E.cod[p.compra] === c && (p.est === 'recibida' || p.est === 'preparando')) ? 'Ese pedido todavía no está marcado como listo.'
    : mis.some(p => E.cod[p.compra] === c && p.est === 'entregada') ? 'Ese pedido ya fue entregado.' : 'Código no válido para este negocio.'; }
document.getElementById('validar').onclick = validar;
inp.addEventListener('keydown', e => { if (e.key === 'Enter') validar(); });
btnPausa.onclick = () => mut(e => { e.pausa = !e.pausa; });
document.getElementById('reset').onclick = () => { if (confirm('¿Borrar todos los pedidos y reiniciar la prueba?')) { reiniciar(); E = leer(); draw(); } };
alCambiar(e => { E = e; draw(); });
setInterval(() => { E = leer(); draw(); }, 1000);
draw();
