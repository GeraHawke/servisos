import { NEG, CFG, HORAS, METODOS, neg } from './datos.js';
import { leer, guardar, alCambiar, ahora } from './estado.js';
import { tick } from './simulador.js';

let E = leer(), rid = E.rid, pant = 'inicio', nid = null, modo = 'ahora', hora = HORAS[3], car = {}, modal = false, det = null, last = '';
const sucio = new Set();
const app = document.getElementById('app'), nav = document.getElementById('nav');
const money = n => '$' + n;
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const rnd = () => CFG.RESP_MIN_S + Math.random() * (CFG.RESP_MAX_S - CFG.RESP_MIN_S);
const items = id => Object.entries(car[id] || {}).filter(([, c]) => c > 0).map(([i, c]) => { const m = neg(id).menu.find(x => x.id === i); return { id: i, nombre: m.nombre, cant: c, precio: m.precio, min: m.min }; });
const cantTotal = () => NEG.reduce((a, n) => a + items(n.id).reduce((s, i) => s + i.cant, 0), 0);
const totalCar = () => NEG.reduce((a, n) => a + items(n.id).reduce((s, i) => s + i.cant * i.precio, 0), 0);
const sols = () => E.ped.filter(p => p.fase === 'sol' && p.compra === E.abierta);
const ords = () => E.ped.filter(p => p.fase === 'ord');
const base = p => Math.max(...p.items.map(i => i.min));
const tot = p => p.items.reduce((s, i) => s + i.cant * i.precio, 0);
const lista = p => p.items.map(i => `${i.nombre} x${i.cant}`).join(', ');
const cerrado = n => n.estado === 'pausado' || (n.id === CFG.MANUAL && E.pausa);
const vig = () => { const a = sols().filter(p => p.est === 'aceptada'); return a.length ? Math.min(...a.map(p => (p.tAcepta + CFG.VIGENCIA_S * 1000 - ahora()) / 1000)) : null; };
function mut(fn) { E = leer(); fn(E); guardar(E); draw(); }

const vInicio = () => '<h2>¿Qué se te antoja?</h2>' + NEG.map(n => `<button class="card ${cerrado(n) ? 'off' : ''}" data-act="neg" data-id="${n.id}"><div class="ph">${n.nombre[0]}</div><div><b>${n.nombre}</b><small>${n.sub}</small><small>${cerrado(n) ? '<span class="rojo">Pausado por saturación</span>' : 'Abierto · Entrega: ' + n.entrega}</small></div></button>`).join('');

const cartBtn = () => `<button class="primary foot" data-act="carrito" ${cantTotal() ? '' : 'disabled'}>Ver carrito (${cantTotal()}) · ${money(totalCar())}</button>`;
const vMenu = () => { const n = neg(nid); return `<div class="bar"><button class="link" data-act="inicio">←</button><b>${n.nombre}</b><small>${n.entrega}</small></div>
<div class="seg"><button class="${modo === 'ahora' ? 'on' : ''}" data-act="modo" data-v="ahora">Ahora</button><button class="${modo === 'prog' ? 'on' : ''}" data-act="modo" data-v="prog">Programar</button></div>
${modo === 'prog' ? `<label class="hora">Hora de recogida <select data-act="hora">${HORAS.map(h => `<option ${h === hora ? 'selected' : ''}>${h}</option>`).join('')}</select></label>` : ''}`
  + n.menu.map(m => { const c = (car[nid] || {})[m.id] || 0;
    return m.agotado ? `<div class="row off"><div><b>${m.nombre}</b><small class="rojo">Agotado</small></div><span>☹</span></div>`
      : `<div class="row"><div><b>${m.nombre}</b><small>~${m.min} min</small></div><span>${money(m.precio)}</span><div class="qty"><button data-act="menos" data-id="${m.id}">−</button><i>${c}</i><button data-act="mas" data-id="${m.id}">+</button></div></div>`; }).join('') + cartBtn(); };

const rowSol = p => { const n = neg(p.neg), b = base(p); let st = '', bt = '';
  if (p.est === 'pendiente') st = `<span class="spin"></span> Esperando respuesta… (sin respuesta en ${mmss(CFG.ESPERA_MAX_S - (ahora() - p.t0) / 1000)})`;
  else if (p.est === 'aceptada') st = '<b class="verde">✓ Aceptado</b>';
  else if (p.est === 'cambio') { st = `<b class="ambar">Tardará ${b + p.minExtra} min en lugar de ${b}</b>`;
    bt = `<div class="btns"><button class="primary" data-act="okcambio" data-id="${p.id}">Aceptar</button><button class="ghost" data-act="sust" data-id="${p.id}">Sustituir</button><button class="peligro" data-act="quitar" data-id="${p.id}">Cancelar</button></div>`; }
  else if (p.est === 'caducada') { st = '<b class="rojo">Caducó la vigencia</b>'; bt = `<div class="btns"><button class="primary" data-act="reintentar" data-id="${p.id}">Solicitar de nuevo</button></div>`; }
  else { st = `<b class="rojo">${p.est === 'sinresp' ? 'Sin respuesta' : 'No disponible'}</b>`; bt = `<div class="btns"><button class="ghost" data-act="quitar" data-id="${p.id}">Quitar</button></div>`; }
  return `<div class="ord sol ${p.est}"><div style="display:flex;justify-content:space-between"><b>${n.nombre}</b><span>${money(tot(p))}</span></div><small>${lista(p)} · ${p.modo === 'ahora' ? 'Ahora' : 'Para las ' + p.hora}</small><div style="margin-top:6px">${st}</div>${bt}</div>`; };

const vCarrito = () => { const s = sols(); if (!s.length) return '<div style="text-align:center;padding:60px 10px"><div style="font-size:44px">🫙</div><h2>Demasiado vacío…</h2><p class="mut">Añade algo delicioso y vuelve.</p><button class="primary" data-act="inicio">Ver negocios</button></div>';
  const v = vig(), listo = s.every(p => p.est === 'aceptada'), f = s.filter(p => p.est !== 'aceptada').length;
  return `<div class="bar"><button class="link" data-act="inicio">←</button><h2 style="margin:0;flex:1">Mi carrito</h2>${v !== null ? `<small class="rojo">Vigencia ${mmss(v)}</small>` : ''}</div>`
    + s.map(rowSol).join('') + `<div class="tot"><span>Total</span><span>${money(s.reduce((a, p) => a + tot(p), 0))}</span></div>`
    + `<button class="primary foot" data-act="pago" ${listo ? '' : 'disabled'}>${listo ? 'Pagar' : `Pagar (faltan ${f} respuesta${f > 1 ? 's' : ''})`}</button>`; };

const vPago = () => { const s = sols(); if (!s.length) return vCarrito();
  return `<div class="alerta">Aviso importante: lo que no recojas antes del cierre (${CFG.CIERRE}) se destruye sin compensación.</div><h2 style="margin-top:16px">Pago</h2>`
    + s.map(p => `<div class="row"><div><b>${neg(p.neg).nombre}</b><small>${lista(p)}</small></div><span>${money(tot(p))}</span></div>`).join('')
    + `<div class="tot"><span>Total</span><span>${money(s.reduce((a, p) => a + tot(p), 0))}</span></div><small>Pago simulado con saldo de prueba</small><button class="primary foot" data-act="pagar">Pagar</button>`; };
const vModal = () => `<div class="modal"><div><h2>¿Pagar ${money(sols().reduce((a, p) => a + tot(p), 0))}?</h2><p>El pedido será destruido si no se recoge antes de la hora de cierre.</p><div class="btns"><button class="ghost" data-act="cerrar">Cancelar</button><button class="primary" data-act="confirmar">Pagar</button></div></div></div>`;

const ETQ = { recibida: 'Recibida', preparando: 'Preparando', lista: 'Lista para recoger', entregada: 'Entregada', cancelada: 'Cancelada' };
const rowOrd = p => { if (p.est === 'entregada' || p.est === 'cancelada') return `<button class="card" data-act="detalle" data-id="${p.id}"><div><b>${neg(p.neg).nombre}</b><small>${lista(p)}</small><span class="chip ${p.est}">${ETQ[p.est]}</span></div><span class="mut">Ver detalles ›</span></button>`;
  let ex = '';
  if (p.est === 'preparando' && p.neg === CFG.MANUAL) { const r = (p.tInicio + (base(p) + p.minExtra) * 60000 - ahora()) / 1000; ex = r > 0 ? `<small>Tiempo estimado restante ${mmss(r)}</small>` : '<small>Tiempo estimado cumplido</small>'; }
  if (p.est === 'lista') ex = '<small class="verde">Pasa a recoger con tu código</small>';
  if (p.est === 'cancelada') ex = `<small>${p.cargo ? 'Cancelada con cargo' : 'Cancelada sin cargo'}</small>`;
  const bt = p.est === 'recibida' ? `<button class="ghost" data-act="cancelord" data-id="${p.id}">Cancelar (sin cargo)</button>` : p.est === 'preparando' ? `<button class="peligro" data-act="cancelord" data-id="${p.id}">Cancelar (con cargo)</button>` : '';
  return `<div class="ord"><div><b>${neg(p.neg).nombre}</b><small>${lista(p)}</small><span class="chip ${p.est}">${ETQ[p.est]}</span>${ex}</div>${bt}</div>`; };
const activo = p => ['recibida', 'preparando', 'lista'].includes(p.est);
const vPedidos = () => { const o = ords(), g = {}; o.forEach(p => (g[p.compra] = g[p.compra] || []).push(p));
  if (!o.length) return '<h2>Mis pedidos</h2><p class="mut">Aún no tienes pedidos.</p>';
  const aviso = o.some(activo) ? `<p class="alerta">Cierre ${CFG.CIERRE}. Lo no recogido se destruye sin compensación.</p>` : '';
  return '<h2>Mis pedidos</h2>' + Object.keys(g).sort((a, b) => b - a).map(c => (g[c].some(activo) ? `<div class="code"><span>Compra #${c} · Código de recogida</span><b>${E.cod[c]}</b></div>` : `<small style="margin:10px 2px 6px">Compra #${c}</small>`) + g[c].map(rowOrd).join('')).join('') + aviso; };
const fh = t => t ? new Date(t).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : '—';
const vDet = () => { const p = E.ped.find(x => x.id === det); if (!p) return '';
  return `<div class="modal"><div><h2>${neg(p.neg).nombre}</h2><table class="det"><tr><td>Estado</td><td>${ETQ[p.est]}${p.est === 'cancelada' ? (p.cargo ? ' (con cargo)' : ' (sin cargo)') : ''}</td></tr>`
   + `<tr><td>Pedido</td><td>${p.items.map(i => `${i.nombre} x${i.cant} · ${money(i.cant * i.precio)}`).join('<br>')}</td></tr><tr><td>Total pagado</td><td>${money(tot(p))}</td></tr>`
   + `<tr><td>Método de pago</td><td>${(E.metodo || {})[p.compra] || '—'}</td></tr><tr><td>Pagado el</td><td>${fh(p.tOrd)}</td></tr>`
   + (p.est === 'entregada' ? `<tr><td>Código usado</td><td>${E.cod[p.compra]}</td></tr><tr><td>Recogido el</td><td>${fh(p.tEntrega)}</td></tr>` : '')
   + `</table><div class="btns"><button class="primary" data-act="cerrardet">Cerrar</button></div></div></div>`; };

function draw() {
  const html = { inicio: vInicio, menu: vMenu, carrito: vCarrito, pago: vPago, pedidos: vPedidos }[pant]() + (modal ? vModal() : '') + (det ? vDet() : '');
  const n = `<button class="${pant === 'inicio' || pant === 'menu' ? 'on' : ''}" data-act="inicio">Inicio</button><button class="${pant === 'carrito' || pant === 'pago' ? 'on' : ''}" data-act="carrito">Carrito (${cantTotal()})</button><button class="${pant === 'pedidos' ? 'on' : ''}" data-act="pedidos">Mis pedidos</button>`;
  if (html + n === last) return; last = html + n; app.innerHTML = html; nav.innerHTML = n;
}
function enviar() { mut(e => { if (!e.abierta) e.abierta = ++e.compras;
  NEG.forEach(n => { const it = items(n.id), tiene = e.ped.some(p => p.fase === 'sol' && p.compra === e.abierta && p.neg === n.id);
    if (sucio.has(n.id) || (it.length && !tiene)) { e.ped = e.ped.filter(p => !(p.fase === 'sol' && p.compra === e.abierta && p.neg === n.id));
      if (it.length) e.ped.push({ id: ++e.seq, compra: e.abierta, neg: n.id, items: it, modo, hora: modo === 'prog' ? hora : null, fase: 'sol', est: 'pendiente', minExtra: 0, t0: ahora(), delay: rnd() }); } });
  sucio.clear(); }); }
const quitar = id => mut(e => { const p = e.ped.find(x => x.id === id); if (p) { car[p.neg] = {}; sucio.add(p.neg); e.ped = e.ped.filter(x => x.id !== id); } });

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT') return;
  const a = el.dataset.act, id = el.dataset.id, pid = +id;
  switch (a) {
    case 'inicio': pant = 'inicio'; draw(); break;
    case 'neg': if (cerrado(neg(id))) return; nid = id; pant = 'menu'; draw(); break;
    case 'modo': modo = el.dataset.v; NEG.forEach(n => sucio.add(n.id)); draw(); break;
    case 'mas': case 'menos': car[nid] = car[nid] || {}; car[nid][id] = Math.max(0, (car[nid][id] || 0) + (a === 'mas' ? 1 : -1)); sucio.add(nid); draw(); break;
    case 'carrito': pant = 'carrito'; if (cantTotal()) enviar(); else draw(); break;
    case 'okcambio': mut(e => { const p = e.ped.find(x => x.id === pid); p.est = 'aceptada'; p.tAcepta = ahora(); }); break;
    case 'sust': { const p = E.ped.find(x => x.id === pid); nid = p.neg; pant = 'menu'; quitar(pid); break; }
    case 'quitar': quitar(pid); break;
    case 'reintentar': mut(e => { const p = e.ped.find(x => x.id === pid); p.est = 'pendiente'; p.t0 = ahora(); p.delay = rnd(); }); break;
    case 'pago': if (sols().length && sols().every(p => p.est === 'aceptada')) { pant = 'pago'; draw(); } break;
    case 'pagar': modal = true; draw(); break;
    case 'cerrar': modal = false; draw(); break;
    case 'confirmar': car = {}; sucio.clear(); modal = false; pant = 'pedidos';
      mut(e => { e.ped.filter(p => p.fase === 'sol' && p.compra === e.abierta).forEach(p => { p.fase = 'ord'; p.est = 'recibida'; p.tOrd = ahora(); });
        e.cod[e.abierta] = String(10000 + Math.floor(Math.random() * 89999)); e.metodo = e.metodo || {}; e.metodo[e.abierta] = METODOS[Math.floor(Math.random() * METODOS.length)]; e.abierta = null; }); break;
    case 'pedidos': pant = 'pedidos'; draw(); break;
    case 'detalle': det = pid; draw(); break;
    case 'cerrardet': det = null; draw(); break;
    case 'cancelord': mut(e => { const p = e.ped.find(x => x.id === pid); p.cargo = p.est === 'preparando'; p.est = 'cancelada'; }); break;
  }
});
document.addEventListener('change', ev => { if (ev.target.dataset.act === 'hora') { hora = ev.target.value; NEG.forEach(n => sucio.add(n.id)); } });
alCambiar(e => { E = e; if (e.rid !== rid) { rid = e.rid; car = {}; sucio.clear(); pant = 'inicio'; modal = false; det = null; } if (pant !== 'menu') draw(); });
setInterval(() => { E = leer(); if (tick(E)) guardar(E); if (pant !== 'menu') draw(); }, 1000);
draw();
