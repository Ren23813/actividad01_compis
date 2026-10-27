/* =========================================================
   Escenas q9–q10: ¿cómo se arma un autómata?
   ========================================================= */

/* 
   q9 · receta paso a paso para números (enteros y decimales)
   */
(function () {
  const STEPS = [
    ['Describe el lenguaje con palabras', '«Uno o más dígitos, opcionalmente seguidos de un punto y uno o más dígitos.»'],
    ['Junta ejemplos que sí y que no', '<span class="chip ok">7</span> <span class="chip ok">42</span> <span class="chip ok">3.14</span> <span class="chip ok">0.5</span><br><span class="chip no">.5</span> <span class="chip no">3.</span> <span class="chip no">3.1.4</span> <span class="chip no">4a</span>'],
    ['Escribe la expresión regular', '<span class="rx-big"><span class="p1">[0-9]+</span><span class="p2">(</span><span class="p3">\\.[0-9]+</span><span class="p2">)?</span></span><br>verde: parte entera · celeste: parte decimal · <span class="mono">?</span> = opcional'],
    ['Dibuja el estado inicial', 'q0 significa «todavía no he leído nada». La flecha sin origen marca el inicio.'],
    ['La parte entera: [0-9]+', 'Un dígito te lleva a q1 y más dígitos te dejan en q1 (un ciclo). q1 es de <b>aceptación</b>: «7» ya es un número válido.'],
    ['La parte decimal: (\\.[0-9]+)?', 'El punto lleva a q2, que <b>no</b> acepta: «3.» está incompleto. Un dígito lleva a q3, que sí acepta, y más dígitos te dejan ahí.'],
    ['Agrega el estado de error', 'Toda transición que falta va a ∅, un estado «muerto» del que no se sale. Así δ está definida para cualquier símbolo.'],
    ['¡A probar!', 'Escribe una cadena: si termina en un estado de aceptación (doble círculo), pertenece al lenguaje.'],
  ];
  const fsm = new FSM('buildFsm', {
    viewBox: '0 0 760 400', r: 34, font: 17, labelFont: 15,
    states: [
      { id: 'q0', x: 90, y: 160, start: true },
      { id: 'q1', x: 280, y: 160, accept: true },
      { id: 'q2', x: 470, y: 160 },
      { id: 'q3', x: 660, y: 160, accept: true },
      { id: 'err', x: 380, y: 340, label: '∅', dead: true, font: 22 },
    ],
    edges: [
      { from: 'q0', to: 'q1', label: 'díg' },
      { from: 'q1', to: 'q1', label: 'díg', loop: -90 },
      { from: 'q1', to: 'q2', label: '.' },
      { from: 'q2', to: 'q3', label: 'díg' },
      { from: 'q3', to: 'q3', label: 'díg', loop: -90 },
      { from: 'q0', to: 'err', label: 'otro', t: .45 },
      { from: 'q1', to: 'err', label: 'otro', t: .55 },
      { from: 'q2', to: 'err', label: 'otro', t: .55 },
      { from: 'q3', to: 'err', label: '. | otro', t: .45 },
      { from: 'err', to: 'err', label: 'todo', loop: 0 },
    ],
  });
  const VIS = [
    [[], []], [[], []], [[], []],
    [['q0'], []],
    [['q0', 'q1'], ['q0>q1', 'q1>q1']],
    [['q0', 'q1', 'q2', 'q3'], ['q0>q1', 'q1>q1', 'q1>q2', 'q2>q3', 'q3>q3']],
  ];
  const ALL = [fsm.def.states.map(s => s.id), Object.keys(fsm.edges)];
  const stepsEl = $('#buildSteps'), tester = $('#buildTester'), input = $('#buildInput'), verdict = $('#buildVerdict');
  stepsEl.innerHTML = STEPS.map((s, i) => `<div class="step"><h4>${i + 1} · ${s[0]}</h4><div class="sd">${s[1]}</div></div>`).join('');
  const run = new Runner();
  let k = 0;
  function setStep(n) {
    k = n;
    $$('.step', stepsEl).forEach((el, i) => { el.classList.toggle('on', i === n); el.classList.toggle('seen', i < n); });
    const [nodes, edges] = VIS[n] || ALL;
    fsm.hideAll();
    fsm.show(nodes, edges);
    fsm.clear('active', 'ok', 'bad');
    if (nodes.includes('q0')) fsm.setActive('q0');
    tester.classList.toggle('off', n < STEPS.length - 1);
    verdict.textContent = '';
  }
  function delta(st, c) {
    const d = /[0-9]/.test(c);
    if (st === 'q0') return d ? 'q1' : 'err';
    if (st === 'q1') return d ? 'q1' : c === '.' ? 'q2' : 'err';
    if (st === 'q2' || st === 'q3') return d ? 'q3' : 'err';
    return 'err';
  }
  async function test() {
    const id = run.start();
    const s = input.value;
    fsm.clear('ok', 'bad');
    let st = 'q0';
    fsm.setActive(st);
    verdict.className = 'verdict';
    for (let i = 0; i < s.length; i++) {
      if (!run.alive(id)) return;
      verdict.innerHTML = `<span class="mono">${esc(s.slice(0, i))}<span style="color:var(--fuchsia)">${esc(s[i])}</span><span style="opacity:.4">${esc(s.slice(i + 1))}</span></span>`;
      const nx = delta(st, s[i]);
      await fsm.travel(st, nx, 420);
      st = nx;
      fsm.setActive(st);
      await sleep(120);
    }
    if (!run.alive(id)) return;
    const ok = st === 'q1' || st === 'q3';
    fsm.mark(st, ok ? 'ok' : 'bad');
    verdict.className = 'verdict ' + (ok ? 'ok' : 'no');
    verdict.textContent = ok ? `✓ «${s}» es un número (termina en ${st})` : `✗ «${s}» no es un número (termina en ${st === 'err' ? '∅' : st}, que no acepta)`;
  }
  ['3.14', '42', '3.', '.5', '3.1.4', '0.5'].forEach(p => {
    const b = document.createElement('button');
    b.className = 'btn ghost mono';
    b.style.padding = '6px 10px';
    b.textContent = p;
    b.onclick = () => { input.value = p; test(); };
    $('#buildPresets').appendChild(b);
  });
  $('#buildRun').onclick = test;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') test(); });
  Escenas.register('q9', {
    enter(dir) { setStep(dir < 0 ? STEPS.length - 1 : 0); },
    leave() { run.stop(); },
    next() { if (k < STEPS.length - 1) { setStep(k + 1); return true; } return false; },
    prev() { if (k > 0) { setStep(k - 1); return true; } return false; },
  });
  setStep(0);
})();

/* 
   q10 · Thompson + construcción de subconjuntos + minimización
   para (a|b)*abb (ej Libro del Dragón)
   */
(function () {
  const NFA = {
    viewBox: '0 0 860 330', r: 20, font: 14, labelFont: 14,
    states: [
      { id: '0', x: 40, y: 150, start: true, startAngle: -90 },
      { id: '1', x: 130, y: 150 }, { id: '2', x: 220, y: 80 }, { id: '3', x: 310, y: 80 },
      { id: '4', x: 220, y: 220 }, { id: '5', x: 310, y: 220 }, { id: '6', x: 400, y: 150 },
      { id: '7', x: 500, y: 150 }, { id: '8', x: 600, y: 150 }, { id: '9', x: 700, y: 150 },
      { id: '10', x: 800, y: 150, accept: true, font: 13 },
    ],
    edges: [
      { from: '0', to: '1', label: 'ε', eps: true }, { from: '1', to: '2', label: 'ε', eps: true }, { from: '1', to: '4', label: 'ε', eps: true },
      { from: '2', to: '3', label: 'a' }, { from: '4', to: '5', label: 'b' },
      { from: '3', to: '6', label: 'ε', eps: true }, { from: '5', to: '6', label: 'ε', eps: true },
      { from: '6', to: '1', label: 'ε', eps: true, bend: 260 }, { from: '0', to: '7', label: 'ε', eps: true, bend: 280 },
      { from: '6', to: '7', label: 'ε', eps: true },
      { from: '7', to: '8', label: 'a' }, { from: '8', to: '9', label: 'b' }, { from: '9', to: '10', label: 'b' },
    ],
  };
  const nfa = new FSM('thompFsm', NFA);

  // --- construcción de subconjuntos (calculada, no escrita a mano) 
  const ALPHA = ['a', 'b'];
  const key = s => [...s].sort((x, y) => x - y).join(',');
  function closure(set) {
    const out = new Set(set), stack = [...set];
    while (stack.length) {
      const q = stack.pop();
      NFA.edges.filter(e => e.from === q && e.eps).forEach(e => { if (!out.has(e.to)) { out.add(e.to); stack.push(e.to); } });
    }
    return out;
  }
  const moveSet = (set, c) => new Set(NFA.edges.filter(e => set.has(e.from) && e.label === c).map(e => e.to));
  const NAMES = 'ABCDEFGH';
  const dstates = [closure(new Set(['0']))];
  const rows = [];
  for (let i = 0; i < dstates.length; i++) {
    const row = { name: NAMES[i], set: dstates[i], acc: dstates[i].has('10'), tr: {} };
    for (const c of ALPHA) {
      const mv = moveSet(dstates[i], c), cl = closure(mv);
      let j = dstates.findIndex(s => key(s) === key(cl));
      if (j < 0) j = dstates.push(cl) - 1;
      row.tr[c] = { mv, cl, to: NAMES[j] };
    }
    rows.push(row);
  }

  const table = $('#subTable'), explain = $('#formExplain'), cap = $('#dfaCap');
  table.innerHTML = '<tr><th>AFD</th><th>conjunto de estados del AFN</th><th>a</th><th>b</th></tr>' +
    rows.map(r => `<tr class="hid${r.acc ? ' acc' : ''}"><td class="dn">${r.name}</td><td>{${key(r.set)}}</td><td>${r.tr.a.to}</td><td>${r.tr.b.to}</td></tr>`).join('');
  const trs = $$('tr', table).slice(1);

  // --- AFD resultante 
  const POS = { A: [70, 150], B: [230, 60], C: [230, 240], D: [400, 60], E: [550, 60] };
  const SHAPE = { 'B>B': { loop: -125 }, 'C>C': { loop: 90 }, 'B>D': { bend: -18 }, 'D>B': { bend: -18 }, 'E>B': { bend: 100 }, 'C>B': { dx: -14 } };
  function dfaDef(states, trans, pos, shape, viewBox) {
    const edges = {};
    for (const [from, c, to] of trans) {
      const k = from + '>' + to;
      edges[k] = edges[k] ? { ...edges[k], label: edges[k].label + ',' + c } : { from, to, label: c, ...(shape[k] || {}) };
    }
    return { viewBox, r: 28, font: 17, labelFont: 15, states: states.map(s => ({ ...s, x: pos[s.id][0], y: pos[s.id][1] })), edges: Object.values(edges) };
  }
  new FSM('subDfa', dfaDef(
    rows.map((r, i) => ({ id: r.name, label: r.name, accept: r.acc, start: i === 0 })),
    rows.flatMap(r => ALPHA.map(c => [r.name, c, r.tr[c].to])),
    POS, SHAPE, '0 -40 620 340'));

  // --- AFD mínimo: A y C son equivalentes 
  const rep = n => (n === 'A' || n === 'C' ? 'AC' : n);
  const minTrans = [];
  rows.filter(r => r.name !== 'C').forEach(r => ALPHA.forEach(c => minTrans.push([rep(r.name), c, rep(r.tr[c].to)])));
  new FSM('minDfa', dfaDef(
    [{ id: 'AC', label: 'A=C', start: true, startAngle: -90, font: 14 }, { id: 'B', label: 'B' }, { id: 'D', label: 'D' }, { id: 'E', label: 'E', accept: true }],
    minTrans,
    { AC: [80, 120], B: [250, 120], D: [420, 120], E: [580, 120] },
    { 'AC>AC': { loop: 180 }, 'B>B': { loop: -90 }, 'B>D': { bend: -20 }, 'D>B': { bend: -20 }, 'E>B': { bend: -110 }, 'E>AC': { bend: -200 } },
    '0 0 660 330'));

  const code = $('#dfaCode');
  code.innerHTML = `<span class="cm">// AFD mínimo de (a|b)*abb · 0=A/C 1=B 2=D 3=E</span>
<span class="kw">int</span> T[4][2] = {   <span class="cm">/*  a  b  */</span>
  <span class="cm">/* 0 */</span> {<span class="nu">1</span>, <span class="nu">0</span>},
  <span class="cm">/* 1 */</span> {<span class="nu">1</span>, <span class="nu">2</span>},
  <span class="cm">/* 2 */</span> {<span class="nu">1</span>, <span class="nu">3</span>},
  <span class="cm">/* 3 */</span> {<span class="nu">1</span>, <span class="nu">0</span>} };

<span class="kw">int</span> s = <span class="nu">0</span>;
<span class="kw">for</span> (<span class="kw">char</span> *p = entrada; *p; p++)
    s = T[s][*p - <span class="nu">'a'</span>];   <span class="cm">// ¡una transición por carácter!</span>
<span class="kw">return</span> s == <span class="nu">3</span>;              <span class="cm">// ¿estado de aceptación?</span>`;

  const fmt = s => '{' + key(s) + '}';
  let k = 0;
  const LAST = rows.length + 3;
  function setStep(n) {
    k = n;
    nfa.clear('cyan', 'ok');
    trs.forEach((tr, i) => { tr.classList.toggle('hid', i >= n); tr.classList.remove('cur'); });
    $('#subDfa').classList.toggle('hid', n < rows.length + 1 || n > rows.length + 1);
    $('#minDfa').classList.toggle('hid', n !== rows.length + 2);
    code.classList.toggle('hid', n !== LAST);
    if (n === 0) {
      cap.textContent = 'AFD resultante';
      explain.innerHTML = `<h3>1 · Thompson: regex → AFN</h3>Cada pieza de <span class="mono">(a|b)*abb</span> se vuelve uno de los mini-AFN de q8, unidos con transiciones <b>ε</b> (se toman sin leer nada). Resultado: 11 estados.<div class="eq">ε-cerradura(T) = estados alcanzables desde T solo con ε</div>`;
    } else if (n <= rows.length) {
      const r = rows[n - 1];
      trs[n - 1].classList.add('cur');
      r.set.forEach(q => nfa.mark(q, 'cyan'));
      const first = n === 1 ? `<b>${r.name}</b> = ε-cerradura({0}) = ${fmt(r.set)}<br>` : `Procesamos <b>${r.name}</b> = ${fmt(r.set)}<br>`;
      explain.innerHTML = `<h3>2 · Subconjuntos: AFN → AFD</h3>${first}<div class="eq">` +
        ALPHA.map(c => `mueve(${r.name}, ${c}) = ${fmt(r.tr[c].mv)} → ε-cerradura = ${fmt(r.tr[c].cl)} = <b>${r.tr[c].to}</b>`).join('<br>') + '</div>';
    } else if (n === rows.length + 1) {
      cap.textContent = 'AFD resultante · 5 estados';
      explain.innerHTML = `<h3>3 · El AFD</h3>Cada fila de la tabla es un estado. <b>E</b> es de aceptación porque contiene al estado 10 del AFN. Ya no hay ε ni dudas: una sola transición por símbolo.`;
      rows.filter(r => r.acc).forEach(r => r.set.forEach(q => nfa.mark(q, 'cyan')));
      nfa.mark('10', 'ok');
    } else if (n === rows.length + 2) {
      cap.textContent = 'AFD mínimo · 4 estados';
      explain.innerHTML = `<h3>4 · Minimización</h3><div class="eq">Π₀: {A,B,C,D} {E} <span class="muted">← aceptan / no</span><br>con b, D va a E → {A,B,C} {D} {E}<br>con b, B va a D → {A,C} {B} {D} {E}<br>A y C ya no se distinguen: <b>se fusionan</b></div>`;
    } else {
      cap.textContent = 'Código generado';
      explain.innerHTML = `<h3>5 · Tabla de transiciones</h3>Esto es lo que genera Lex/Flex: una tabla y un bucle. Por eso el análisis léxico es tan rápido: tiempo <b>lineal</b>, un paso por carácter.`;
    }
  }
  Escenas.register('q10', {
    enter(dir) { setStep(dir < 0 ? LAST : 0); },
    next() { if (k < LAST) { setStep(k + 1); return true; } return false; },
    prev() { if (k > 0) { setStep(k - 1); return true; } return false; },
  });
  setStep(0);
})();
