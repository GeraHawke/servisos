import { NEG, CFG, HORAS, METODOS, CLIENTE, neg } from './datos.js';
import { leer, guardar, alCambiar, ahora } from './estado.js';
import { tick } from './simulador.js';

// car: { 'negocio|ahora' | 'negocio|prog:5:00 pm' : { idProducto: cantidad } }  -> cada clave es una orden distinta
let E = leer(), rid = E.rid, pant = 'inicio', nid = null, modo = 'ahora', hora = HORAS[3], car = {}, sel = {}, modal = false, det = null, hist = false, copiado = null, flash = '', flashT = null, last = '';
const app = document.getElementById('app'), nav = document.getElementById('nav');
const toast = document.getElementById('toast'), btnSnd = document.getElementById('snd'), prev = {};
let sonido = true, ctx = null;
try { sonido = localStorage.getItem('servisos_snd') !== '0'; } catch (e) {}
btnSnd.textContent = sonido ? '🔔' : '🔕';
function unlock() { try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) {} }
function pita() { try { unlock(); const t = ctx.currentTime;
  [[880, 0], [1175, .18], [1568, .36]].forEach(([f, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.25, t + d + .02); g.gain.exponentialRampToValueAtTime(.001, t + d + .3);
    o.connect(g); g.connect(ctx.destination); o.start(t + d); o.stop(t + d + .32); }); } catch (e) {} }
function alerta(titulo, det) { toast.innerHTML = `🔔 <b>${titulo}</b><small style="color:#AEEEFA">${det}</small>`;
  toast.style.display = 'block'; clearTimeout(alerta.t); alerta.t = setTimeout(() => { toast.style.display = 'none'; }, 7000);
  const tel = document.querySelector('.tel'); tel.classList.remove('sacude'); void tel.offsetWidth; tel.classList.add('sacude');
  if (sonido) { pita(); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); } }
function revisa() { const li = [], ca = [];
  for (const p of E.ped) { if (p.fase !== 'ord') continue; const a = prev[p.id];
    if (a !== undefined && a !== p.est) { if (p.est === 'lista') li.push(p); if (p.est === 'canceladaneg') ca.push(p); } prev[p.id] = p.est; }
  const nom = l => l.map(p => neg(p.neg).nombre).join(', ');
  if (ca.length) alerta('Un negocio canceló tu orden', `${nom(ca)} · reembolso y 50% en tu próximo pedido`);
  else if (li.length) alerta('¡Tu pedido está listo!', `${nom(li)} · toca para verlo`); }

const money = n => '$' + n;
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const rnd = () => CFG.RESP_MIN_S + Math.random() * (CFG.RESP_MAX_S - CFG.RESP_MIN_S);
const keyActual = () => nid + '|' + (modo === 'ahora' ? 'ahora' : 'prog:' + hora);
const partes = k => { const [n, s] = k.split('|'); return { n, modo: s === 'ahora' ? 'ahora' : 'prog', hora: s === 'ahora' ? null : s.slice(5) }; };
const etq = (m, h) => m === 'ahora' ? 'Ahora' : 'Para las ' + h;
const itemsDe = k => { const { n } = partes(k); return Object.entries(car[k] || {}).filter(([, c]) => c > 0).map(([i, c]) => { const m = neg(n).menu.find(x => x.id === i); return { id: i, nombre: m.nombre, cant: c, precio: m.precio, min: m.min }; }); };
const claves = () => Object.keys(car).filter(k => itemsDe(k).length);
const subDe = k => itemsDe(k).reduce((s, i) => s + i.cant * i.precio, 0);
const cantTotal = () => claves().reduce((a, k) => a + itemsDe(k).reduce((s, i) => s + i.cant, 0), 0);
const totalCar = () => claves().reduce((a, k) => a + subDe(k), 0);
const selCant = () => Object.values(sel).reduce((a, c) => a + c, 0);
const selTotal = () => Object.entries(sel).reduce((a, [i, c]) => a + c * neg(nid).menu.find(x => x.id === i).precio, 0);
const sols = () => E.ped.filter(p => p.fase === 'sol' && p.compra === E.abierta);
const ords = () => E.ped.filter(p => p.fase === 'ord');
const base = p => Math.max(...p.items.map(i => i.min));
const tot = p => p.items.reduce((s, i) => s + i.cant * i.precio, 0);
const lista = p => p.items.map(i => `${i.nombre} x${i.cant}`).join(', ');
const cerrado = n => n.estado === 'pausado' || (n.id === CFG.MANUAL && E.pausa);
const vig = () => { const a = sols().filter(p => p.est === 'aceptada'); return a.length ? Math.min(...a.map(p => (p.tAcepta + CFG.VIGENCIA_S * 1000 - ahora()) / 1000)) : null; };
const borradores = () => claves().filter(k => !sols().some(p => p.key === k));
const activo = p => ['recibida', 'preparando', 'lista'].includes(p.est);
const cupon = n => (E.cupones || []).find(c => c.neg === n && !c.usado);
const ahorro = (p, s) => { const c = cupon(p.neg); return c && s.find(x => x.neg === p.neg) === p ? Math.round(tot(p) * c.pct / 100) : 0; };
const neto = s => s.reduce((a, p) => a + tot(p) - ahorro(p, s), 0);
function mut(fn) { E = leer(); fn(E); guardar(E); draw(); }
function copiarTxt(t) { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (e) {} x.remove(); }

const vInicio = () => { const cu = (E.cupones || []).filter(c => !c.usado);
  return (cu.length ? `<div class="bono">🎁 Tienes 50% de bonificación en tu próximo pedido en ${[...new Set(cu.map(c => neg(c.neg).nombre))].join(', ')}</div>` : '')
  + '<h2>¿Qué se te antoja?</h2>' + NEG.map(n => `<button class="card ${cerrado(n) ? 'off' : ''}" data-act="neg" data-id="${n.id}"><div class="ph">${n.nombre[0]}</div><div><b>${n.nombre}</b><small>${n.sub}</small><small>${cerrado(n) ? '<span class="rojo">Pausado por saturación</span>' : 'Abierto · Entrega: ' + n.entrega}</small></div></button>`).join(''); };

const vMenu = () => { const n = neg(nid), k = keyActual(), enviado = sols().some(p => p.key === k);
  return `<div class="bar"><button class="link" data-act="inicio">←</button><b>${n.nombre}</b><small>${n.entrega}</small></div>
<div class="seg"><button class="${modo === 'ahora' ? 'on' : ''}" data-act="modo" data-v="ahora">Ahora</button><button class="${modo === 'prog' ? 'on' : ''}" data-act="modo" data-v="prog">Programar</button></div>
${modo === 'prog' ? `<label class="hora">Hora de recogida <select data-act="hora">${HORAS.map(h => `<option ${h === hora ? 'selected' : ''}>${h}</option>`).join('')}</select></label>` : ''}
${enviado ? '<p><small class="ambar">Esta orden ya fue solicitada. Si agregas más, tendrás que solicitarla de nuevo.</small></p>' : ''}`
  + n.menu.map(m => { const c = sel[m.id] || 0, enc = (car[k] || {})[m.id] || 0;
    return m.agotado ? `<div class="row off"><div><b>${m.nombre}</b><small class="rojo">Agotado</small></div><span>☹</span></div>`
      : `<div class="row"><div><b>${m.nombre}</b><small>~${m.min} min${enc ? ` · <b class="verde">${enc} en el carrito (${etq(modo, hora)})</b>` : ''}</small></div><span>${money(m.precio)}</span><div class="qty"><button data-act="menos" data-id="${m.id}">−</button><i>${c}</i><button data-act="mas" data-id="${m.id}">+</button></div></div>`; }).join('')
  + `<button class="primary foot" data-act="agregar" ${selCant() ? '' : 'disabled'}>Agregar al carrito (${selCant()}) · ${money(selTotal())}</button>`
  + (cantTotal() ? `<button class="ghost foot" data-act="carrito">Ver carrito (${cantTotal()}) · ${money(totalCar())}</button>` : '')
  + (flash ? `<p class="verde" style="text-align:center">${flash}</p>` : ''); };

const rowSol = p => { const n = neg(p.neg), b = base(p); let st = '', bt = '';
  const cancelar = `<div class="btns"><button class="ghost" data-act="retirar" data-id="${p.id}">Cancelar solicitud</button></div>`;
  if (p.est === 'pendiente') { st = `<span class="spin"></span> Esperando respuesta… (sin respuesta en ${mmss(CFG.ESPERA_MAX_S - (ahora() - p.t0) / 1000)})`; bt = cancelar; }
  else if (p.est === 'aceptada') { st = '<b class="verde">✓ Aceptado</b>'; bt = cancelar; }
  else if (p.est === 'cambio') { st = `<b class="ambar">Tardará ${b + p.minExtra} min en lugar de ${b}</b>`;
    bt = `<div class="btns"><button class="primary" data-act="okcambio" data-id="${p.id}">Aceptar</button><button class="ghost" data-act="sust" data-id="${p.id}">Sustituir</button><button class="peligro" data-act="quitar" data-id="${p.id}">Cancelar</button></div>`; }
  else if (p.est === 'caducada') { st = '<b class="rojo">Caducó la vigencia</b>'; bt = `<div class="btns"><button class="primary" data-act="reintentar" data-id="${p.id}">Solicitar de nuevo</button><button class="ghost" data-act="quitar" data-id="${p.id}">Quitar</button></div>`; }
  else { st = `<b class="rojo">${p.est === 'sinresp' ? 'Sin respuesta' : 'No disponible'}</b>`; bt = `<div class="btns"><button class="ghost" data-act="quitar" data-id="${p.id}">Quitar</button></div>`; }
  return `<div class="ord sol ${p.est}"><div style="display:flex;justify-content:space-between"><b>${n.nombre}</b><span>${money(tot(p))}</span></div><small>${lista(p)} · ${etq(p.modo, p.hora)}</small><div style="margin-top:6px">${st}</div>${bt}</div>`; };
const rowBorr = k => { const q = partes(k);
  return `<div class="ord sol"><div style="display:flex;justify-content:space-between"><b>${neg(q.n).nombre}</b><small>Sin enviar · ${etq(q.modo, q.hora)}</small></div>`
  + itemsDe(k).map(i => `<div class="row" style="margin:8px 0 0"><div><b>${i.nombre}</b><small>${money(i.precio)} c/u</small></div><div class="qty"><button data-act="cmenos" data-k="${k}" data-id="${i.id}">−</button><i>${i.cant}</i><button data-act="cmas" data-k="${k}" data-id="${i.id}">+</button></div></div>`).join('') + '</div>'; };

const vCarrito = () => { const s = sols(), b = borradores();
  if (!s.length && !b.length) return '<div style="text-align:center;padding:60px 10px"><div style="font-size:44px">🫙</div><h2>Demasiado vacío…</h2><p class="mut">Añade algo delicioso y vuelve.</p><button class="primary" data-act="inicio">Ver negocios</button></div>';
  const v = vig(), listo = !b.length && s.every(p => p.est === 'aceptada'), f = s.filter(p => p.est !== 'aceptada').length;
  return `<div class="bar"><button class="link" data-act="inicio">←</button><h2 style="margin:0;flex:1">Mi carrito</h2>${v !== null ? `<small class="rojo">Vigencia ${mmss(v)}</small>` : ''}</div>`
    + s.map(rowSol).join('') + b.map(rowBorr).join('') + `<div class="tot"><span>Total</span><span>${money(neto(s) + b.reduce((a, k) => a + subDe(k), 0))}</span></div>`
    + (b.length ? `<button class="primary foot" data-act="solicitar">Pedir confirmación (${b.length} orden${b.length > 1 ? 'es' : ''})</button>`
      : `<button class="primary foot" data-act="pago" ${listo ? '' : 'disabled'}>${listo ? 'Pagar' : `Pagar (faltan ${f} respuesta${f > 1 ? 's' : ''})`}</button>`)
    + '<button class="ghost foot" data-act="inicio">+ Seguir agregando</button>'; };

const vPago = () => { const s = sols(); if (!s.length) return vCarrito();
  return `<div class="alerta">Aviso importante: lo que no recojas antes del cierre (${CFG.CIERRE}) se destruye sin compensación.</div><h2 style="margin-top:16px">Pago</h2>`
    + s.map(p => `<div class="row"><div><b>${neg(p.neg).nombre}</b><small>${lista(p)} · ${etq(p.modo, p.hora)}</small></div><span>${money(tot(p))}</span></div>`
      + (ahorro(p, s) ? `<div class="row"><div><b class="verde">Bonificación ${cupon(p.neg).pct}%</b><small>Por una cancelación anterior</small></div><span class="verde">−${money(ahorro(p, s))}</span></div>` : '')).join('')
    + `<div class="tot"><span>Total</span><span>${money(neto(s))}</span></div><small>Pago simulado con saldo de prueba</small><button class="primary foot" data-act="pagar">Pagar</button>`; };
const vModal = () => `<div class="modal"><div><h2>¿Pagar ${money(neto(sols()))}?</h2><p>El pedido será destruido si no se recoge antes de la hora de cierre.</p><div class="btns"><button class="ghost" data-act="cerrar">Cancelar</button><button class="primary" data-act="confirmar">Pagar</button></div></div></div>`;

const ETQ = { recibida: 'Recibida', preparando: 'Preparando', lista: 'Lista para recoger', entregada: 'Entregada', cancelada: 'Cancelada', canceladaneg: 'Cancelada por el negocio', norecogida: 'No recogido' };
const rowOrd = p => { if (!activo(p)) return `<button class="card" data-act="detalle" data-id="${p.id}"><div><b>${neg(p.neg).nombre}</b><small>${lista(p)} · ${etq(p.modo, p.hora)}</small><span class="chip ${p.est}">${ETQ[p.est]}</span></div><span class="mut">Ver detalles ›</span></button>`;
  let ex = '';
  if (p.est === 'preparando' && p.neg === CFG.MANUAL) { const r = (p.tInicio + (base(p) + p.minExtra) * 60000 - ahora()) / 1000; ex = r > 0 ? `<small>Tiempo estimado restante ${mmss(r)}</small>` : '<small>Tiempo estimado cumplido</small>'; }
  if (p.est === 'lista') ex = '<small class="verde">Pasa a recoger con tu código</small>';
  const bt = p.est === 'recibida' ? `<button class="ghost" data-act="cancelord" data-id="${p.id}">Cancelar (sin cargo)</button>` : p.est === 'preparando' ? `<button class="peligro" data-act="cancelord" data-id="${p.id}">Cancelar (con cargo)</button>` : '';
  return `<div class="ord"><div><b>${neg(p.neg).nombre}</b><small>${lista(p)} · ${etq(p.modo, p.hora)}</small><span class="chip ${p.est}">${ETQ[p.est]}</span>${ex}</div>${bt}</div>`; };
const agrupa = l => { const r = {}; l.forEach(p => (r[p.compra] = r[p.compra] || []).push(p)); return r; };
const vPedidos = () => { const o = ords(), act = o.filter(activo), old = o.filter(p => !activo(p)), ga = agrupa(act);
  let h = '<h2>Mis pedidos</h2>';
  if (!act.length) h += '<p class="mut" style="text-align:center">No tienes pedidos en curso.</p>';
  h += Object.keys(ga).sort((a, b) => b - a).map(c => `<div class="code"><span>Compra #${c} · Código de recogida</span><b>${E.cod[c]}</b><button class="ghost" data-act="copiar" data-id="${c}">${copiado === c ? 'Copiado ✓' : 'Copiar'}</button></div>` + ga[c].map(rowOrd).join('')).join('');
  if (act.length) h += `<p class="alerta">Cierre ${CFG.CIERRE}. Lo no recogido se destruye sin compensación.</p>`;
  if (old.length) { const go = agrupa(old);
    h += `<button class="ghost foot" data-act="hist">Historial (${old.length}) ${hist ? '▴' : '▾'}</button>`
      + (hist ? Object.keys(go).sort((a, b) => b - a).map(c => `<small style="margin:10px 2px 6px">Compra #${c}</small>` + go[c].map(rowOrd).join('')).join('') : ''); }
  return h; };
const fh = t => t ? new Date(t).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : '—';
const vDet = () => { const p = E.ped.find(x => x.id === det); if (!p) return '';
  const pagado = tot(p) - (p.desc || 0);
  return `<div class="modal"><div><h2>${neg(p.neg).nombre}</h2><table class="det"><tr><td>Estado</td><td>${ETQ[p.est]}${p.est === 'cancelada' ? (p.cargo ? ' (con cargo)' : ' (sin cargo)') : ''}</td></tr>`
   + `<tr><td>Pedido</td><td>${p.items.map(i => `${i.nombre} x${i.cant} · ${money(i.cant * i.precio)}`).join('<br>')}<br><small>${etq(p.modo, p.hora)}</small></td></tr>`
   + (p.desc ? `<tr><td>Bonificación</td><td>−${money(p.desc)}</td></tr>` : '') + `<tr><td>Total pagado</td><td>${money(pagado)}</td></tr>`
   + `<tr><td>Método de pago</td><td>${(E.metodo || {})[p.compra] || '—'}</td></tr><tr><td>Pagado el</td><td>${fh(p.tOrd)}</td></tr>`
   + (p.est === 'entregada' ? `<tr><td>Código usado</td><td>${E.cod[p.compra]}</td></tr><tr><td>Recogido el</td><td>${fh(p.tEntrega)}</td></tr>` : '')
   + (p.est === 'norecogida' ? `<tr><td>Resultado</td><td>No se recogió antes del cierre; se destruyó sin compensación (${fh(p.tCierre)}).</td></tr>` : '')
   + (p.est === 'canceladaneg' ? `<tr><td>Reembolso</td><td>${money(pagado)} (100%) a ${(E.metodo || {})[p.compra] || 'tu método de pago'}</td></tr><tr><td>Bonificación</td><td>50% en tu próximo pedido en ${neg(p.neg).nombre}</td></tr><tr><td>Cancelada el</td><td>${fh(p.tCierre)}</td></tr>` : '')
   + `</table><div class="btns"><button class="primary" data-act="cerrardet">Cerrar</button></div></div></div>`; };

function draw() {
  const html = { inicio: vInicio, menu: vMenu, carrito: vCarrito, pago: vPago, pedidos: vPedidos }[pant]() + (modal ? vModal() : '') + (det ? vDet() : '');
  const n = `<button class="${pant === 'inicio' || pant === 'menu' ? 'on' : ''}" data-act="inicio">Inicio</button><button class="${pant === 'carrito' || pant === 'pago' ? 'on' : ''}" data-act="carrito">Carrito (${cantTotal()})</button><button class="${pant === 'pedidos' ? 'on' : ''}" data-act="pedidos">Mis pedidos</button>`;
  if (html + n === last) return; last = html + n; app.innerHTML = html; nav.innerHTML = n;
}
function enviar() { mut(e => { if (!e.abierta) e.abierta = ++e.compras;
  claves().forEach(k => { if (e.ped.some(p => p.fase === 'sol' && p.compra === e.abierta && p.key === k)) return; const q = partes(k);
    e.ped.push({ id: ++e.seq, compra: e.abierta, key: k, neg: q.n, items: itemsDe(k), modo: q.modo, hora: q.hora, fase: 'sol', est: 'pendiente', minExtra: 0, t0: ahora(), delay: rnd() }); }); }); }
const quitar = id => mut(e => { const p = e.ped.find(x => x.id === id); if (p) { delete car[p.key]; e.ped = e.ped.filter(x => x.id !== id); } });

document.addEventListener('click', ev => {
  unlock();
  const el = ev.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT') return;
  const a = el.dataset.act, id = el.dataset.id, pid = +id;
  switch (a) {
    case 'inicio': pant = 'inicio'; draw(); break;
    case 'neg': if (cerrado(neg(id))) return; nid = id; sel = {}; flash = ''; pant = 'menu'; draw(); break;
    case 'modo': modo = el.dataset.v; draw(); break;
    case 'mas': case 'menos': sel[id] = Math.max(0, (sel[id] || 0) + (a === 'mas' ? 1 : -1)); draw(); break;
    case 'agregar': { const k = keyActual(); car[k] = car[k] || {};
      for (const [i, c] of Object.entries(sel)) if (c > 0) car[k][i] = (car[k][i] || 0) + c;
      sel = {}; flash = 'Agregado al carrito ✓'; clearTimeout(flashT); flashT = setTimeout(() => { flash = ''; if (pant === 'menu') draw(); }, 2000);
      if (sols().some(p => p.key === k)) mut(e => { e.ped = e.ped.filter(p => !(p.fase === 'sol' && p.compra === e.abierta && p.key === k)); }); else draw(); break; }
    case 'cmas': case 'cmenos': { const k = el.dataset.k; car[k][id] = Math.max(0, (car[k][id] || 0) + (a === 'cmas' ? 1 : -1)); draw(); break; }
    case 'carrito': pant = 'carrito'; draw(); break;
    case 'solicitar': enviar(); break;
    case 'retirar': mut(e => { e.ped = e.ped.filter(x => x.id !== pid); }); break;
    case 'okcambio': mut(e => { const p = e.ped.find(x => x.id === pid); p.est = 'aceptada'; p.tAcepta = ahora(); }); break;
    case 'sust': { const p = E.ped.find(x => x.id === pid); nid = p.neg; modo = p.modo; if (p.hora) hora = p.hora; sel = {}; pant = 'menu'; quitar(pid); break; }
    case 'quitar': quitar(pid); break;
    case 'reintentar': mut(e => { const p = e.ped.find(x => x.id === pid); p.est = 'pendiente'; p.t0 = ahora(); p.delay = rnd(); }); break;
    case 'pago': if (sols().length && !borradores().length && sols().every(p => p.est === 'aceptada')) { pant = 'pago'; draw(); } break;
    case 'pagar': modal = true; draw(); break;
    case 'cerrar': modal = false; draw(); break;
    case 'confirmar': car = {}; sel = {}; modal = false; pant = 'pedidos';
      mut(e => { e.ped.filter(p => p.fase === 'sol' && p.compra === e.abierta).forEach(p => { p.fase = 'ord'; p.est = 'recibida'; p.tOrd = ahora(); p.cliente = CLIENTE;
          const c = (e.cupones || []).find(c => c.neg === p.neg && !c.usado); if (c) { p.desc = Math.round(tot(p) * c.pct / 100); c.usado = true; } });
        e.cod[e.abierta] = String(10000 + Math.floor(Math.random() * 89999)); e.metodo = e.metodo || {}; e.metodo[e.abierta] = METODOS[Math.floor(Math.random() * METODOS.length)]; e.abierta = null; }); break;
    case 'pedidos': toast.style.display = 'none'; pant = 'pedidos'; draw(); break;
    case 'snd': sonido = !sonido; try { localStorage.setItem('servisos_snd', sonido ? '1' : '0'); } catch (e) {} btnSnd.textContent = sonido ? '🔔' : '🔕'; if (sonido) pita(); break;
    case 'hist': hist = !hist; draw(); break;
    case 'copiar': { const txt = String(E.cod[id]), ok = () => { copiado = id; draw(); setTimeout(() => { copiado = null; draw(); }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok).catch(() => { copiarTxt(txt); ok(); }); else { copiarTxt(txt); ok(); } break; }
    case 'detalle': det = pid; draw(); break;
    case 'cerrardet': det = null; draw(); break;
    case 'cancelord': mut(e => { const p = e.ped.find(x => x.id === pid); p.cargo = p.est === 'preparando'; p.est = 'cancelada'; }); break;
  }
});
document.addEventListener('change', ev => { if (ev.target.dataset.act === 'hora') { hora = ev.target.value; draw(); } });
alCambiar(e => { E = e; if (e.rid !== rid) { for (const k in prev) delete prev[k]; rid = e.rid; car = {}; sel = {}; pant = 'inicio'; modal = false; det = null; hist = false; copiado = null; } revisa(); if (pant !== 'menu') draw(); });
document.getElementById('usr').textContent = CLIENTE.nombre;
revisa();
setInterval(() => { E = leer(); if (tick(E)) guardar(E); revisa(); if (pant !== 'menu') draw(); }, 1000);
draw();
