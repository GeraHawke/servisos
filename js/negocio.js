import { CFG, CLIENTE } from './datos.js';
import { leer, guardar, alCambiar, reiniciar, ahora } from './estado.js';

let E = leer(), last = '', tab = 'pedidos';
const app = document.getElementById('app'), btnPausa = document.getElementById('pausa'), valid = document.getElementById('valid');
const ETQ = { recibida: 'Recibida', preparando: 'Preparando', lista: 'Lista', entregada: 'Entregada', cancelada: 'Cancelada por el cliente', canceladaneg: 'Cancelada por el negocio', norecogida: 'No recogido' };
const money = n => '$' + n;
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const base = p => Math.max(...p.items.map(i => i.min));
const lista = p => p.items.map(i => `${i.nombre} x${i.cant}`).join(', ');
const tot = p => p.items.reduce((s, i) => s + i.cant * i.precio, 0);
const neto = p => tot(p) - (p.desc || 0);
const slot = p => p.modo === 'ahora' ? 'Ahora' : 'Para las ' + p.hora;
const fh = t => t ? new Date(t).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
function mut(fn) { E = leer(); fn(E); guardar(E); draw(); }

function vPedidos(mis) {
  const sol = mis.filter(p => p.fase === 'sol' && ['pendiente', 'cambio', 'aceptada'].includes(p.est));
  const ord = mis.filter(p => p.fase === 'ord' && ['recibida', 'preparando', 'lista'].includes(p.est));
  const nAhora = ord.filter(p => p.modo === 'ahora').length, nProg = ord.filter(p => p.modo === 'prog').length;
  let hs = '<h2>Solicitudes</h2>';
  if (!sol.length) hs += '<p class="mut">No hay solicitudes nuevas.</p>';
  hs += sol.map(p => { const b = base(p);
    if (p.est === 'aceptada') return `<div class="ord"><b>Orden #${p.compra} · ${lista(p)}</b><small>${slot(p)}</small><p class="verde">Aceptada · esperando que el cliente pague</p><div class="btns"><button class="peligro" data-act="retirar" data-id="${p.id}">Cancelar aceptación</button></div></div>`;
    const esp = p.est === 'cambio';
    return `<div class="ord"><b>Orden #${p.compra} · ${lista(p)}</b><small>Plantilla: ${b} min · ${p.modo === 'ahora' ? 'Ahora' : 'Hora pedida ' + p.hora}</small>
<div class="big">${b + p.minExtra}:00</div>${p.minExtra ? `<small>+${p.minExtra} min sobre la plantilla (solo esta orden)</small>` : ''}
${esp ? '<p class="ambar">Esperando que el cliente acepte el cambio de tiempo…</p>' : `<div class="ctl"><button class="menos" data-act="menos" data-id="${p.id}">−1</button><div class="oval"><button data-act="mas" data-v="1" data-id="${p.id}">+1</button><button data-act="mas" data-v="5" data-id="${p.id}">+5</button><button data-act="mas" data-v="10" data-id="${p.id}">+10</button></div></div>
<div class="btns"><button class="primary" data-act="aceptar" data-id="${p.id}">Aceptar orden</button><button class="peligro" data-act="rechazar" data-id="${p.id}">Rechazar</button></div>`}</div>`; }).join('');
  let ho = '<h2>Órdenes pagadas</h2>';
  if (!ord.length) ho += '<p class="mut">Aún no hay órdenes pagadas.</p>';
  ho += ord.map(p => { let ex = '', bt = '';
    if (p.est === 'recibida') bt = `<button class="primary" data-act="empezar" data-id="${p.id}">Empezar a preparar</button>`;
    if (p.est === 'preparando') { const r = (p.tInicio + (base(p) + p.minExtra) * 60000 - ahora()) / 1000; ex = `<div class="big">${r > 0 ? mmss(r) : 'Tiempo estimado cumplido'}</div>`; bt = `<button class="primary" data-act="lista" data-id="${p.id}">Lista para recoger</button>`; }
    if (p.est === 'lista') { ex = '<small class="verde">Lista · esperando que el cliente pase con su código</small>'; bt = `<button class="ghost" data-act="norec" data-id="${p.id}">No recogido</button>`; }
    return `<div class="ord"><b>Orden #${p.compra} · ${lista(p)}</b><small>${(p.cliente || CLIENTE).nombre} · ${slot(p)} · <span class="chip ${p.est}">${ETQ[p.est]}</span></small>${ex}<div class="btns">${bt}<button class="peligro" data-act="cancelneg" data-id="${p.id}">Cancelar orden</button></div></div>`; }).join('');
  return `<p class="cap mut">Ahora ${nAhora}/${CFG.CAP} · Programadas ${nProg}${E.pausa ? ' · <b class="rojo">Pedidos pausados</b>' : ''}</p><div class="grid"><div>${hs}</div><div>${ho}</div></div>`;
}
function vVentas(mis) {
  const v = mis.filter(p => p.fase === 'ord').sort((a, b) => b.tOrd - a.tOrd);
  const ent = v.filter(p => p.est === 'entregada'), proc = v.filter(p => ['recibida', 'preparando', 'lista'].includes(p.est)), perd = v.filter(p => ['norecogida', 'canceladaneg', 'cancelada'].includes(p.est));
  const h = `<h2>Registro de ventas</h2><div class="resumen"><div><small>Vendido (entregado)</small><b>${money(ent.reduce((a, p) => a + neto(p), 0))}</b></div><div><small>Entregadas</small><b>${ent.length}</b></div><div><small>En proceso</small><b>${proc.length}</b></div><div><small>Canceladas / no recogidas</small><b>${perd.length}</b></div></div>`;
  if (!v.length) return h + '<p class="mut">Todavía no hay ventas.</p>';
  return h + `<div class="tblw"><table class="tbl"><thead><tr><th>Orden</th><th>Cliente</th><th>Pedido</th><th>Total</th><th>Método de pago</th><th>Pagada</th><th>Estado</th><th>Cierre</th></tr></thead><tbody>`
    + v.map(p => { const c = p.cliente || CLIENTE;
      return `<tr><td>#${p.compra}</td><td><b>${c.nombre}</b><small>${c.cuenta} · ${c.edad} años</small><small>${c.carrera}, ${c.facultad}</small></td><td>${p.items.map(i => `${i.nombre} x${i.cant}`).join('<br>')}<small>${slot(p)}</small></td><td>${money(neto(p))}${p.desc ? `<small>bonif. −${money(p.desc)}</small>` : ''}</td><td>${(E.metodo || {})[p.compra] || '—'}</td><td>${fh(p.tOrd)}</td><td><span class="chip ${p.est}">${ETQ[p.est]}</span>${p.est === 'cancelada' ? `<small>${p.cargo ? 'con cargo' : 'sin cargo'}</small>` : ''}${p.est === 'canceladaneg' ? '<small>reembolso + 50% próximo pedido</small>' : ''}</td><td>${fh(p.tEntrega || p.tCierre)}</td></tr>`; }).join('') + '</tbody></table></div>';
}
function draw() {
  const mis = E.ped.filter(p => p.neg === CFG.MANUAL);
  btnPausa.textContent = E.pausa ? 'Reanudar pedidos' : 'Pausar'; btnPausa.className = E.pausa ? 'peligro' : 'ghost';
  valid.hidden = tab !== 'pedidos';
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const h = tab === 'pedidos' ? vPedidos(mis) : vVentas(mis);
  if (h === last) return; last = h; app.innerHTML = h;
}
const set = (id, fn) => mut(e => { const p = e.ped.find(x => x.id === id); if (p) fn(p, e); });
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; last = ''; draw(); return; }
  const el = ev.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, id = +el.dataset.id;
  if (a === 'mas') set(id, p => p.minExtra += +el.dataset.v);
  if (a === 'menos') set(id, p => p.minExtra = Math.max(0, p.minExtra - 1));
  if (a === 'aceptar') set(id, p => { p.est = p.minExtra > 0 ? 'cambio' : 'aceptada'; p.tAcepta = ahora(); });
  if (a === 'rechazar' || a === 'retirar') set(id, p => { p.est = 'rechazada'; });
  if (a === 'empezar') set(id, p => { p.est = 'preparando'; p.tInicio = ahora(); });
  if (a === 'lista') set(id, p => { p.est = 'lista'; p.tLista = ahora(); });
  if (a === 'norec' && confirm('¿Marcar como NO RECOGIDO? La orden se destruye sin compensación y pasa al historial.')) set(id, p => { p.est = 'norecogida'; p.tCierre = ahora(); });
  if (a === 'cancelneg' && confirm('¿Cancelar esta orden? El cliente recibe reembolso del 100% y 50% de bonificación en su próximo pedido.'))
    set(id, (p, e) => { p.est = 'canceladaneg'; p.tCierre = ahora(); (e.cupones = e.cupones || []).push({ neg: p.neg, pct: 50, usado: false, compra: p.compra }); });
});
const msg = document.getElementById('msg'), inp = document.getElementById('codigo');
function validar() { const c = inp.value.trim(); E = leer(); const mis = E.ped.filter(p => p.neg === CFG.MANUAL && p.fase === 'ord'), mismos = mis.filter(p => E.cod[p.compra] === c);
  const oks = mismos.filter(p => p.est === 'lista');
  if (c && oks.length) { mut(e => { oks.forEach(o => { const p = e.ped.find(x => x.id === o.id); p.est = 'entregada'; p.tEntrega = ahora(); }); }); msg.className = 'verde'; msg.innerHTML = `✓ Código válido. Entregar: <b>${oks.map(lista).join(' + ')}</b>`; inp.value = ''; return; }
  msg.className = 'rojo';
  msg.textContent = mismos.some(p => ['recibida', 'preparando'].includes(p.est)) ? 'Ese pedido todavía no está marcado como listo.'
    : mismos.some(p => p.est === 'entregada') ? 'Ese pedido ya fue entregado.'
    : mismos.length ? 'Esa orden fue cancelada o marcada como no recogida.' : 'Código no válido para este negocio.'; }
document.getElementById('validar').onclick = validar;
inp.addEventListener('keydown', e => { if (e.key === 'Enter') validar(); });
btnPausa.onclick = () => mut(e => { e.pausa = !e.pausa; });
document.getElementById('reset').onclick = () => { if (confirm('¿Borrar todos los pedidos y reiniciar la prueba?')) { reiniciar(); E = leer(); draw(); } };
alCambiar(e => { E = e; draw(); });
setInterval(() => { E = leer(); draw(); }, 1000);
draw();
