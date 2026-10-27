/* 
   Escenas q4–q8: autómatas
    */
function logTo(el, html, max = 4) {
  const d = document.createElement('div');
  d.innerHTML = html;
  el.prepend(d);
  while (el.children.length > max) el.lastChild.remove();
}

/* 
   q4 · torniquete
    */
(function () {
  const fsm = new FSM('turnFsm', {
    viewBox: '0 0 560 250', r: 50, font: 15, labelFont: 15,
    states: [
      { id: 'L', x: 140, y: 150, label: 'Bloqueado', start: true },
      { id: 'U', x: 430, y: 150, label: 'Desbloq.' },
    ],
    edges: [
      { from: 'L', to: 'U', label: 'moneda', bend: -60 },
      { from: 'U', to: 'L', label: 'empujar', bend: -60 },
      { from: 'L', to: 'L', label: 'empujar', loop: -90, h: 70 },
      { from: 'U', to: 'U', label: 'moneda', loop: -90, h: 70 },
    ],
  });
  const art = $('#turnArt'), led = $('#turnLed'), bars = $('.bars', art), log = $('#turnLog'), table = $('#turnTable');
  const NAME = { L: 'Bloqueado', U: 'Desbloqueado' };
  let st = 'L', rot = 0;
  function reset() { st = 'L'; fsm.setActive('L'); led.setAttribute('fill', '#fb7185'); log.innerHTML = ''; logTo(log, 'Estado inicial: <span class="hl">Bloqueado</span>'); }
  async function input(sym) {
    const nx = sym === 'coin' ? 'U' : 'L';
    $$('td', table).forEach(td => td.classList.toggle('hot', td.dataset.k === `${st}:${sym}`));
    const from = st;
    st = nx;
    if (sym === 'push' && from === 'U') { rot += 120; bars.style.transform = `rotate(${rot}deg)`; }
    if (sym === 'push' && from === 'L') { art.classList.remove('shake'); void art.getBBox(); art.classList.add('shake'); }
    led.setAttribute('fill', nx === 'U' ? '#34d399' : '#fb7185');
    logTo(log, `δ(${NAME[from]}, ${sym === 'coin' ? 'moneda' : 'empujar'}) = <span class="hl">${NAME[nx]}</span>`);
    await fsm.travel(from, nx, 500);
    fsm.setActive(nx);
  }
  $('#turnCoin').onclick = () => input('coin');
  $('#turnPush').onclick = () => input('push');
  $('#turnReset').onclick = reset;
  reset();

  // pasar el mouse por la 5-tupla resalta la parte correspondiente
  const parts = $$('[data-part]', $('#q4'));
  parts.forEach(p => {
    p.addEventListener('mouseenter', () => hl(p.dataset.part, true));
    p.addEventListener('mouseleave', () => hl(p.dataset.part, false));
  });
  function hl(part, on) {
    parts.forEach(p => p.classList.toggle('on', on && p.dataset.part === part));
    if (part === 'Q') { fsm.mark('L', 'cyan', on); fsm.mark('U', 'cyan', on); }
    if (part === 'd') { for (const k in fsm.edges) fsm.edges[k].g.classList.toggle('hot', on); table.classList.toggle('on', on); }
    if (part === 'q0') fsm.mark('L', 'cyan', on);
    if (part === 'S') { $('#turnCoin').classList.toggle('on', on); $('#turnPush').classList.toggle('on', on); }
  }
  Escenas.register('q4', { enter() { reset(); } });
})();

/* 
   q5 · laboratorio
   */
const Lab = { tabs: ['vend', 'traffic', 'pin', 'div3'], cur: 0 };
(function () {
  const tabs = $$('#labTabs button');
  function setTab(i) {
    Lab.cur = i;
    tabs.forEach((b, j) => b.classList.toggle('on', j === i));
    $$('#q5 .pane').forEach(p => p.classList.toggle('on', p.dataset.pane === Lab.tabs[i]));
    if (Lab.tabs[i] !== 'traffic') Traffic.auto(false);
  }
  tabs.forEach((b, i) => (b.onclick = () => setTab(i)));
  Escenas.register('q5', {
    enter(dir) { setTab(dir < 0 ? Lab.tabs.length - 1 : 0); },
    leave() { Traffic.auto(false); },
    next() { if (Lab.cur < Lab.tabs.length - 1) { setTab(Lab.cur + 1); return true; } return false; },
    prev() { if (Lab.cur > 0) { setTab(Lab.cur - 1); return true; } return false; },
  });
})();

/* ---- máquina expendedora (Mealy) ---- */
(function () {
  const fsm = new FSM('vendFsm', {
    viewBox: '0 0 800 420', r: 42, font: 16, labelFont: 15,
    states: [
      { id: '0', x: 90, y: 200, label: 'Q0', start: true, startAngle: 180 },
      { id: '50', x: 300, y: 200, label: 'Q0.50' },
      { id: '100', x: 510, y: 200, label: 'Q1' },
      { id: '150', x: 720, y: 200, label: 'Q1.50' },
    ],
    edges: [
      { from: '0', to: '50', label: '50¢/–' },
      { from: '50', to: '100', label: '50¢/–' },
      { from: '100', to: '150', label: '50¢/–' },
      { from: '0', to: '100', label: 'Q1/–', bend: -140 },
      { from: '50', to: '150', label: 'Q1/–', bend: -240 },
      { from: '100', to: '0', label: 'Q1/lata', bend: -140 },
      { from: '150', to: '0', label: '50¢/lata · Q1/lata+50¢', bend: -250 },
    ],
  });
  const disp = $('#vendDisplay'), tray = $('#vendTray'), change = $('#vendChange'), log = $('#vendLog'), box = $('#vendBox');
  let credit = 0;
  const q = c => 'Q' + (c / 100).toFixed(2);
  function show() { disp.innerHTML = `${q(credit)}<small>precio: Q2.00</small>`; }
  async function coin(v) {
    const from = credit, total = credit + v;
    const c = document.createElement('div');
    c.className = 'coin-fly';
    box.appendChild(c);
    setTimeout(() => c.remove(), 700);
    let out = '–';
    if (total >= 200) {
      credit = 0;
      out = 'entrega lata' + (total > 200 ? ' + vuelto ' + q(total - 200) : '');
      tray.innerHTML = '<div class="can c3"></div>';
      change.textContent = total > 200 ? q(total - 200) : 'vuelto';
    } else { credit = total; change.textContent = 'vuelto'; }
    show();
    logTo(log, `${q(from)} + ${v === 50 ? '50¢' : 'Q1'} → <span class="hl">${q(credit)}</span> · salida: <span class="${out === '–' ? '' : 'good'}">${out}</span>`);
    await fsm.travel(String(from), String(credit), 500);
    fsm.setActive(String(credit));
    if (credit === 0) { fsm.mark('0', 'ok'); setTimeout(() => fsm.mark('0', 'ok', false), 900); }
  }
  $$('[data-coin]').forEach(b => (b.onclick = () => coin(+b.dataset.coin)));
  $('#vendCancel').onclick = () => {
    logTo(log, `cancelar → <span class="hl">Q0.00</span> · salida: devuelve ${q(credit)}`);
    change.textContent = credit ? q(credit) : 'vuelto';
    credit = 0; show(); fsm.setActive('0');
  };
  fsm.setActive('0');
  logTo(log, 'Cancelar regresa a Q0 desde cualquier estado (no se dibuja para no saturar).');
})();

/* ---- semáforo (Moore) ---- */
const Traffic = (function () {
  const fsm = new FSM('tlFsm', {
    viewBox: '0 0 520 380', r: 46, font: 16, labelFont: 14,
    states: [
      { id: 'V', x: 110, y: 110, label: 'Verde', start: true, cls: 't-green', startAngle: 180 },
      { id: 'A', x: 410, y: 110, label: 'Amarillo', cls: 't-yellow', font: 14 },
      { id: 'R', x: 260, y: 300, label: 'Rojo', cls: 't-red' },
    ],
    edges: [
      { from: 'V', to: 'A', label: 'tiempo | peatón' },
      { from: 'A', to: 'R', label: 'tiempo' },
      { from: 'R', to: 'V', label: 'tiempo' },
      { from: 'A', to: 'A', label: 'peatón', loop: -90 },
      { from: 'R', to: 'R', label: 'peatón', loop: 90 },
    ],
  });
  const lamps = { R: $('#q5 .lamp.r'), A: $('#q5 .lamp.y'), V: $('#q5 .lamp.g') };
  const log = $('#tlLog'), pedTxt = $('#tlPedTxt'), autoBtn = $('#tlAuto');
  const NAME = { V: 'Verde', A: 'Amarillo', R: 'Rojo' };
  let st = 'V', timer = 0;
  function setLamps() {
    for (const k in lamps) lamps[k].classList.toggle('on', k === st);
    pedTxt.textContent = st === 'R' ? 'Peatón: ¡pase!' : 'Peatón: espere';
  }
  async function input(sym) {
    const from = st;
    if (sym === 'tiempo') st = { V: 'A', A: 'R', R: 'V' }[st];
    else st = st === 'V' ? 'A' : st;
    setLamps();
    logTo(log, `δ(${NAME[from]}, ${sym}) = <span class="hl">${NAME[st]}</span>`);
    await fsm.travel(from, st, 450);
    fsm.setActive(st);
  }
  function auto(on) {
    clearInterval(timer);
    timer = 0;
    if (on) timer = setInterval(() => input('tiempo'), 1500);
    autoBtn.textContent = on ? '⏸ Detener' : '▶ Automático';
    autoBtn.classList.toggle('on', !!on);
  }
  $('#tlTick').onclick = () => input('tiempo');
  $('#tlPed').onclick = () => input('peatón');
  autoBtn.onclick = () => auto(!timer);
  fsm.setActive('V');
  setLamps();
  return { auto };
})();

/* ---- cerradura con PIN «2026» ---- */
(function () {
  const PIN = '2026';
  // δ construido como en KMP: si fallas, vas al prefijo más largo que siga sirviendo
  function delta(k, d) {
    if (k === PIN.length) return k;
    const s = PIN.slice(0, k) + d;
    for (let len = Math.min(s.length, PIN.length); len > 0; len--) if (s.endsWith(PIN.slice(0, len))) return len;
    return 0;
  }
  const fsm = new FSM('pinFsm', {
    viewBox: '0 0 680 330', r: 32, font: 16, labelFont: 15,
    states: [0, 1, 2, 3, 4].map(k => ({ id: String(k), x: 70 + k * 135, y: 150, label: 'q' + k, start: k === 0, accept: k === 4, sub: ['', '2', '20', '202', '2026 ✓'][k] })),
    edges: [
      { from: '0', to: '1', label: '2' }, { from: '1', to: '2', label: '0' }, { from: '2', to: '3', label: '2' }, { from: '3', to: '4', label: '6' },
      { from: '0', to: '0', label: '≠2', loop: -90 },
      { from: '1', to: '1', label: '2', loop: -90 },
      { from: '3', to: '2', label: '0', bend: 45, t: .5 },
      { from: '3', to: '1', label: '2', bend: -95 },
      { from: '4', to: '4', label: 'cualquiera', loop: -90 },
    ],
  });
  const disp = $('#pinDisplay'), pad = $('#pinPad'), log = $('#pinLog');
  let st = 0, typed = '';
  function show() {
    disp.classList.toggle('open', st === 4);
    disp.textContent = st === 4 ? 'ABIERTO' : (typed.slice(-6) || '_ _ _ _');
  }
  async function press(d) {
    const from = st;
    st = delta(st, d);
    typed += d;
    show();
    const drawn = fsm.edges[from + '>' + st];
    logTo(log, `δ(q${from}, ${d}) = <span class="${st === 4 ? 'good' : 'hl'}">q${st}</span>${!drawn ? ' <span class="bad">(otro → q0)</span>' : ''}`);
    if (drawn) await fsm.travel(String(from), String(st), 380);
    fsm.setActive(String(st));
    fsm.mark('4', 'ok', st === 4);
  }
  '1234567890'.split('').forEach(d => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = d;
    b.onclick = () => press(d);
    pad.appendChild(b);
  });
  const r = document.createElement('button');
  r.className = 'btn ghost';
  r.style.gridColumn = '1 / -1';
  r.textContent = '↺ Reiniciar';
  r.onclick = () => { st = 0; typed = ''; show(); fsm.setActive('0'); fsm.mark('4', 'ok', false); log.innerHTML = ''; };
  pad.appendChild(r);
  fsm.setActive('0');
  logTo(log, 'Cualquier otro dígito regresa a q0 (esas flechas no se dibujan).');
})();

/* ---- divisible entre 3 ---- */
(function () {
  const fsm = new FSM('divFsm', {
    viewBox: '0 0 560 360', r: 42, font: 18, labelFont: 17,
    states: [
      { id: '0', x: 110, y: 240, label: 'r0', start: true, accept: true, sub: 'residuo 0', subY: 66 },
      { id: '1', x: 280, y: 80, label: 'r1', sub: 'residuo 1', subY: -56 },
      { id: '2', x: 450, y: 240, label: 'r2', sub: 'residuo 2', subY: 66 },
    ],
    edges: [
      { from: '0', to: '0', label: '0', loop: 150 },
      { from: '0', to: '1', label: '1', bend: 22 },
      { from: '1', to: '0', label: '1', bend: 22 },
      { from: '1', to: '2', label: '0', bend: 22 },
      { from: '2', to: '1', label: '0', bend: 22 },
      { from: '2', to: '2', label: '1', loop: 30 },
    ],
  });
  const tape = $('#binTape'), verdict = $('#binVerdict'), log = $('#divLog');
  let st = 0, bits = '';
  const run = new Runner();
  function render(cur) {
    tape.innerHTML = bits ? [...bits].map((b, i) => `<span class="${i === cur ? 'cur' : ''}">${b}</span>`).join('') + `<span class="small muted"> ₂ = ${parseInt(bits, 2)}₁₀</span>` : '&nbsp;';
  }
  function reset() { st = 0; bits = ''; render(); fsm.clear('ok', 'bad'); fsm.setActive('0'); verdict.textContent = ''; }
  async function bit(b) {
    const from = st;
    st = (2 * st + +b) % 3;
    bits += b;
    render(bits.length - 1);
    logTo(log, `δ(r${from}, ${b}) = (2·${from} + ${b}) mod 3 = <span class="hl">r${st}</span>`);
    await fsm.travel(String(from), String(st), 400);
    fsm.setActive(String(st));
  }
  async function runNumber() {
    const id = run.start();
    const n = Math.max(0, Math.min(999999, parseInt($('#binNum').value, 10) || 0));
    reset();
    for (const b of n.toString(2)) {
      if (!run.alive(id)) return;
      await bit(b);
      await sleep(250);
    }
    const ok = st === 0;
    fsm.mark(String(st), ok ? 'ok' : 'bad');
    verdict.className = 'verdict ' + (ok ? 'ok' : 'no');
    verdict.textContent = ok ? `✓ ${n} es divisible entre 3` : `✗ ${n} deja residuo ${st}`;
  }
  $$('[data-bit]').forEach(b => (b.onclick = () => { run.stop(); verdict.textContent = ''; fsm.clear('ok', 'bad'); bit(b.dataset.bit); }));
  $('#binReset').onclick = () => { run.stop(); reset(); };
  $('#binRun').onclick = runNumber;
  reset();
})();

/* 
   q6 · analogías
    */
(function () {
  const ICONS = {
    washer: '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M7 5h2M12 13c1-1.5 2.5-1.5 3.5 0"/>',
    micro: '<rect x="2" y="5" width="20" height="14" rx="2"/><rect x="5" y="8" width="10" height="8" rx="1"/><path d="M18 9v.01M18 12v.01M18 15v.01"/>',
    elevator: '<rect x="5" y="2" width="14" height="20" rx="1.5"/><path d="M12 2v20M8 9l1.5-2L11 9M13 15l1.5 2 1.5-2"/>',
    atm: '<rect x="3" y="3" width="18" height="11" rx="2"/><path d="M7 14v7h10v-7M9 18h6M7 8h4"/>',
    game: '<rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r=".8"/><circle cx="18" cy="13" r=".8"/>',
    net: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.3 11l9.4-4M7.3 13l9.4 4"/>',
    power: '<path d="M12 3v8"/><path d="M7 6.5a7 7 0 1 0 10 0"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4M9 7h6M9 10h4"/>',
  };
  const DATA = [
    { t: 'Lavadora', i: 'washer', s: ['Llenado', 'Lavado', 'Enjuague', 'Centrifugado', 'Fin'], e: 'Entradas: temporizador y sensor de nivel de agua. Recuerda en qué ciclo va, no cuánto tiempo pasó desde que la encendiste.' },
    { t: 'Microondas', i: 'micro', s: ['Espera', 'Calentando', 'Pausa', 'Listo'], e: 'Abrir la puerta es una entrada: desde «Calentando» lleva a «Pausa».' },
    { t: 'Elevador', i: 'elevator', s: ['Detenido', 'Puertas abiertas', 'Subiendo', 'Bajando'], e: 'Entradas: botones de piso y sensores. Nunca abre las puertas mientras está en «Subiendo».' },
    { t: 'Cajero automático', i: 'atm', s: ['Sin tarjeta', 'Pide PIN', 'Menú', 'Entrega efectivo', 'Retiene tarjeta'], e: 'Tres PIN incorrectos llevan a un estado del que ya no se sale.' },
    { t: 'Enemigo de videojuego', i: 'game', s: ['Patrulla', 'Persecución', 'Ataque', 'Huida'], e: 'Entradas: «te vio», «estás cerca», «vida baja». Muchos juegos programan así la IA de los enemigos.' },
    { t: 'Conexión TCP', i: 'net', s: ['CLOSED', 'LISTEN', 'SYN-RECEIVED', 'ESTABLISHED', 'CLOSE-WAIT'], e: 'El estándar de Internet (RFC 9293) define TCP literalmente como una máquina de estados.' },
    { t: 'Botón de encendido', i: 'power', s: ['Apagado', 'Encendido'], e: 'El autómata más pequeño útil: una sola entrada que alterna dos estados.' },
    { t: 'Autocorrector', i: 'phone', s: ['Leyendo', 'Prefijo válido', 'Palabra completa', 'Error → sugerir'], e: 'Guarda el diccionario como un autómata. Volveremos a él al final.' },
  ];
  const grid = $('#analogGrid');
  const cards = DATA.map(d => {
    const c = document.createElement('div');
    c.className = 'an-card';
    c.innerHTML = `<div class="an-head"><svg viewBox="0 0 24 24">${ICONS[d.i]}</svg><h3>${esc(d.t)}</h3></div>
      <div class="an-states">${d.s.map(s => `<span>${esc(s)}</span>`).join('<span style="border:none;padding:4px 0">→</span>')}</div><p>${esc(d.e)}</p>`;
    grid.appendChild(c);
    return { el: c, chips: $$('.an-states span', c).filter(s => s.textContent !== '→'), k: 0 };
  });
  let timer = 0;
  function tick() {
    cards.forEach((c, i) => {
      if ((tickN + i) % 2) return;
      c.chips.forEach(s => s.classList.remove('on'));
      c.chips[c.k % c.chips.length].classList.add('on');
      c.k++;
    });
    tickN++;
  }
  let tickN = 0;
  Escenas.register('q6', {
    enter() { tick(); clearInterval(timer); timer = setInterval(tick, 650); },
    leave() { clearInterval(timer); },
  });
})();

/* 
   q7 · AFN vs AFD para (a|b)*ab
   */
(function () {
  const nfa = new FSM('nfaFsm', {
    viewBox: '0 0 560 220', r: 32, font: 18, labelFont: 17,
    states: [
      { id: '0', x: 80, y: 140, label: '0', start: true },
      { id: '1', x: 280, y: 140, label: '1' },
      { id: '2', x: 480, y: 140, label: '2', accept: true },
    ],
    edges: [{ from: '0', to: '0', label: 'a, b', loop: -90 }, { from: '0', to: '1', label: 'a' }, { from: '1', to: '2', label: 'b' }],
  });
  const dfa = new FSM('dfaFsm', {
    viewBox: '0 0 560 250', r: 38, font: 15, labelFont: 17,
    states: [
      { id: 'A', x: 80, y: 110, label: '{0}', start: true },
      { id: 'B', x: 280, y: 110, label: '{0,1}' },
      { id: 'C', x: 480, y: 110, label: '{0,2}', accept: true },
    ],
    edges: [
      { from: 'A', to: 'A', label: 'b', loop: -90 }, { from: 'A', to: 'B', label: 'a' },
      { from: 'B', to: 'B', label: 'a', loop: -90 }, { from: 'B', to: 'C', label: 'b', bend: -24 },
      { from: 'C', to: 'B', label: 'a', bend: -24 }, { from: 'C', to: 'A', label: 'b', bend: -120 },
    ],
  });
  const NFA_D = { '0': { a: ['0', '1'], b: ['0'] }, '1': { b: ['2'] }, '2': {} };
  const DFA_D = { A: { a: 'B', b: 'A' }, B: { a: 'B', b: 'C' }, C: { a: 'B', b: 'A' } };
  const DNAME = { A: '{0}', B: '{0,1}', C: '{0,2}' };
  const input = $('#vsInput'), tape = $('#vsTape'), verdict = $('#vsVerdict');
  const run = new Runner();
  let s = '', k = 0, set = ['0'], d = 'A';
  ['ab', 'aab', 'abba', 'babab'].forEach(p => {
    const b = document.createElement('button');
    b.className = 'btn ghost mono';
    b.textContent = p;
    b.onclick = () => { input.value = p; reset(); };
    $('#vsPresets').appendChild(b);
  });
  function reset() {
    run.stop();
    s = input.value.replace(/[^ab]/g, '').slice(0, 12);
    input.value = s;
    k = 0; set = ['0']; d = 'A';
    tape.innerHTML = [...s].map(c => `<span>${c}</span>`).join('');
    nfa.clear('ok', 'bad', 'multi'); dfa.clear('ok', 'bad');
    nfa.setActive([]); nfa.setActive(set, 'multi'); dfa.setActive('A');
    $('#nfaSet').textContent = '{0}'; $('#dfaCur').textContent = '{0}';
    verdict.textContent = '';
  }
  function step() {
    if (k >= s.length) return false;
    const c = s[k];
    $$('span', tape).forEach((sp, i) => { sp.classList.toggle('cur', i === k); sp.classList.toggle('done', i < k); });
    const nset = [...new Set(set.flatMap(q => NFA_D[q][c] || []))].sort();
    set.forEach(q => (NFA_D[q][c] || []).forEach(t => nfa.travel(q, t, 450)));
    const nd = DFA_D[d][c];
    dfa.travel(d, nd, 450);
    set = nset; d = nd; k++;
    setTimeout(() => {
      nfa.setActive(set, 'multi');
      dfa.setActive(d);
      $('#nfaSet').textContent = '{' + set.join(',') + '}';
      $('#dfaCur').textContent = DNAME[d];
      if (k === s.length) {
        $$('span', tape).forEach(sp => { sp.classList.remove('cur'); sp.classList.add('done'); });
        const ok = set.includes('2');
        nfa.mark('2', ok ? 'ok' : 'bad', true);
        dfa.mark(d, ok ? 'ok' : 'bad');
        verdict.className = 'verdict ' + (ok ? 'ok' : 'no');
        verdict.textContent = ok ? '✓ Ambos aceptan' : '✗ Ambos rechazan';
      }
    }, 460);
    return k < s.length;
  }
  async function playAll() {
    reset();
    const id = run.start();
    await sleep(300);
    while (run.alive(id) && step()) await sleep(900);
  }
  input.addEventListener('input', reset);
  $('#vsStep').onclick = () => { run.stop(); step(); };
  $('#vsPlay').onclick = playAll;
  $('#vsReset').onclick = reset;
  reset();
  Escenas.register('q7', { enter() { reset(); }, leave() { run.stop(); } });
})();

/* 
   q8 · expresiones regulares
   */
(function () {
  const mini = (id, def) => new FSM(id, Object.assign({ r: 18, font: 13, labelFont: 15 }, def));
  mini('rxA', { viewBox: '0 0 280 130', states: [{ id: 'i', x: 70, y: 70, label: 'i', start: true }, { id: 'f', x: 220, y: 70, label: 'f', accept: true }], edges: [{ from: 'i', to: 'f', label: 'a' }] });
  mini('rxCat', { viewBox: '0 0 280 130', states: [{ id: 'i', x: 50, y: 70, label: 'i', start: true }, { id: 'm', x: 150, y: 70, label: '' }, { id: 'f', x: 250, y: 70, label: 'f', accept: true }], edges: [{ from: 'i', to: 'm', label: 'a' }, { from: 'm', to: 'f', label: 'b' }] });
  mini('rxOr', {
    viewBox: '0 0 280 140',
    states: [{ id: 'i', x: 40, y: 70, label: 'i', start: true }, { id: '1', x: 110, y: 25, label: '' }, { id: '2', x: 180, y: 25, label: '' }, { id: '3', x: 110, y: 115, label: '' }, { id: '4', x: 180, y: 115, label: '' }, { id: 'f', x: 250, y: 70, label: 'f', accept: true }],
    edges: [{ from: 'i', to: '1', label: 'ε', eps: true }, { from: 'i', to: '3', label: 'ε', eps: true }, { from: '1', to: '2', label: 'a' }, { from: '3', to: '4', label: 'b' }, { from: '2', to: 'f', label: 'ε', eps: true }, { from: '4', to: 'f', label: 'ε', eps: true }],
  });
  mini('rxStar', {
    viewBox: '0 0 280 140',
    states: [{ id: 'i', x: 40, y: 75, label: 'i', start: true }, { id: '1', x: 110, y: 75, label: '' }, { id: '2', x: 180, y: 75, label: '' }, { id: 'f', x: 250, y: 75, label: 'f', accept: true }],
    edges: [{ from: 'i', to: '1', label: 'ε', eps: true }, { from: '1', to: '2', label: 'a' }, { from: '2', to: 'f', label: 'ε', eps: true }, { from: '2', to: '1', label: 'ε', eps: true, bend: 64 }, { from: 'i', to: 'f', label: 'ε', eps: true, bend: 70 }],
  });

  const RULES = [
    ['PALABRA_CLAVE', 'if | else | while | for | int | …', /^(if|else|while|for|return|int|float|string|print|true|false)$/],
    ['ID', '[a-zA-Z_][a-zA-Z0-9_]*', /^[A-Za-z_][A-Za-z0-9_]*$/],
    ['NUM', '[0-9]+ ( \\. [0-9]+ )?', /^[0-9]+(\.[0-9]+)?$/],
    ['REL', '< | <= | > | >= | == | !=', /^(<|<=|>|>=|==|!=)$/],
    ['ASIG', '=', /^=$/],
    ['OP', '+ | - | * | /', /^[+\-*/]$/],
    ['CADENA', '" [^"\\n]* "', /^"[^"\n]*"$/],
    ['ESPACIO', '[ \\t\\n]+   (se ignora)', /^[ \t\n]+$/],
  ];
  const table = $('#rxTable'), input = $('#rxInput');
  table.innerHTML = '<tr><th>Token</th><th>Patrón (expresión regular)</th><th>¿coincide?</th></tr>' +
    RULES.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td class="res"></td></tr>`).join('');
  const rows = $$('tr', table).slice(1);
  function test() {
    const v = input.value;
    let won = false;
    RULES.forEach((r, i) => {
      const m = v.length > 0 && r[2].test(v);
      rows[i].classList.toggle('m', m);
      rows[i].classList.toggle('win', m && !won);
      if (m) won = true;
      rows[i].lastChild.textContent = m ? '✓' : '·';
    });
  }
  ['while', 'while2', '3.14', '>=', '"hola"', '3.'].forEach(p => {
    const b = document.createElement('button');
    b.className = 'btn ghost mono';
    b.style.padding = '6px 10px';
    b.textContent = p;
    b.onclick = () => { input.value = p; test(); };
    $('#rxPresets').appendChild(b);
  });
  input.addEventListener('input', test);
  test();
})();
