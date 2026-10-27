/* 
   Fondo animado + escenas q0–q3
   */

/* Fondo: símbolos de autómatas flotando con paralaje según la cámara */
const BG = (() => {
  const cv = $('#bg'), ctx = cv.getContext('2d');
  const GLYPHS = ['δ', 'Σ', 'ε', 'q₀', 'q₁', '∅', '*', '|', 'a', 'b', '0', '1', '{ }', '<=', '>=', '==', ';', 'if', 'id', 'NUM', '→', '◎', 'λ', '( )'];
  const COLORS = ['167,139,250', '232,121,249', '129,140,248', '192,132,252'];
  let w = 0, h = 0, cx = 0, cy = 0;
  const parts = [];
  function resize() {
    const dpr = devicePixelRatio || 1;
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);
  for (let i = 0; i < 70; i++) {
    parts.push({
      x: Math.random() * 3000, y: Math.random() * 2000,
      d: .02 + Math.random() * .06, s: 14 + Math.random() * 30,
      g: GLYPHS[(Math.random() * GLYPHS.length) | 0], c: COLORS[(Math.random() * COLORS.length) | 0],
      a: .08 + Math.random() * .2, vx: (Math.random() - .5) * .15, vy: -.05 - Math.random() * .15,
    });
  }
  function frame() {
    const g = ctx.createRadialGradient(w * .75, h * .1, 0, w * .75, h * .1, w * .9);
    g.addColorStop(0, '#2a0e52');
    g.addColorStop(.55, '#120827');
    g.addColorStop(1, '#0a0616');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const W = w + 200, H = h + 200;
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      const x = (((p.x - cx * p.d) % W) + W) % W - 100;
      const y = (((p.y - cy * p.d) % H) + H) % H - 100;
      ctx.font = `600 ${p.s}px "JetBrains Mono", monospace`;
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.fillText(p.g, x, y);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { cam(c) { cx = c.x; cy = c.y; } };
})();

/* 
   q0 · portada: un autómata que reconoce «while»
    */
(function () {
  const fsm = new FSM('heroFsm', {
    viewBox: '0 0 860 220', r: 28, font: 15, labelFont: 17,
    states: [
      { id: '0', x: 70, y: 80, label: 'q0', start: true },
      { id: '1', x: 210, y: 80, label: 'q1' },
      { id: '2', x: 350, y: 80, label: 'q2' },
      { id: '3', x: 490, y: 80, label: 'q3' },
      { id: '4', x: 630, y: 80, label: 'q4' },
      { id: '5', x: 780, y: 80, label: 'q5', accept: true },
      { id: 'x', x: 490, y: 185, label: '∅', dead: true, r: 24, font: 20 },
    ],
    edges: [
      { from: '0', to: '1', label: 'w' }, { from: '1', to: '2', label: 'h' }, { from: '2', to: '3', label: 'i' },
      { from: '3', to: '4', label: 'l' }, { from: '4', to: '5', label: 'e' },
      { from: '2', to: 'x', label: '≠ i' }, { from: 'x', to: 'x', label: 'todo', loop: 0 },
    ],
  });
  const word = $('#heroWord'), verdict = $('#heroVerdict');
  const run = new Runner();
  const W = 'while';
  async function loop(id) {
    while (run.alive(id)) {
      for (const input of ['while', 'whlie']) {
        fsm.clear('active', 'ok', 'bad');
        fsm.setActive('0');
        word.innerHTML = '';
        verdict.textContent = '';
        verdict.className = 'verdict';
        await sleep(700);
        let st = '0';
        for (const ch of input) {
          if (!run.alive(id)) return;
          const k = +st;
          const nx = W[k] === ch ? String(k + 1) : 'x';
          $$('span', word).forEach(s => s.classList.remove('cur'));
          const sp = document.createElement('span');
          sp.textContent = ch;
          sp.className = nx === 'x' ? 'bad' : 'cur';
          word.appendChild(sp);
          await fsm.travel(st, nx, 420);
          st = nx;
          fsm.setActive(st);
          if (st === 'x') break;
          await sleep(160);
        }
        if (!run.alive(id)) return;
        if (st === '5') {
          fsm.mark('5', 'ok');
          $$('span', word).forEach(s => (s.className = 'good'));
          verdict.textContent = '✓ llegó a un estado de aceptación: palabra reconocida';
          verdict.classList.add('ok');
        } else {
          fsm.mark('x', 'bad');
          const rest = input.slice(word.children.length);
          word.insertAdjacentHTML('beforeend', `<span style="opacity:.35">${rest}</span>`);
          verdict.textContent = '✗ cayó al estado de error ∅: no hay forma de llegar a «while»';
          verdict.classList.add('no');
        }
        await sleep(2200);
      }
    }
  }
  Escenas.register('q0', { enter() { loop(run.start()); }, leave() { run.stop(); } });
})();

/* 
   q1 · gancho: editor + celular
   */
(function () {
  const CODE = ['int main() {', '    int edad = 20;', '    whlie (edad > 0) {', '        edad = edad - 1 @;', '    }', '    return 0;', '}'];
  const pre = $('#hookCode'), status = $('#hookStatus');
  const msg = $('#hookMsg'), sug = $('#hookSuggest'), kbd = $('#hookKbd');
  const run = new Runner();
  const KEYS = 'qwertyuiopasdfghjklñzxcvbnm';
  [...KEYS].forEach(c => { const s = document.createElement('span'); s.textContent = c; s.dataset.k = c; kbd.appendChild(s); });

  function renderCode(lines, caret) {
    pre.innerHTML = lines.map((l, i) => `<span class="ln">${i + 1}</span>${Lexer.highlight(l)}${caret && i === lines.length - 1 ? '<span class="caret"></span>' : ''}`).join('\n');
  }
  async function typeCode(id) {
    status.innerHTML = '';
    const lines = [''];
    for (let li = 0; li < CODE.length; li++) {
      for (const ch of CODE[li]) {
        if (!run.alive(id)) return;
        lines[li] += ch;
        renderCode(lines, true);
        await sleep(ch === ' ' ? 8 : 34);
      }
      if (li < CODE.length - 1) lines.push('');
    }
    renderCode(lines, false);
    await sleep(500);
    $$('.c-ID', pre).filter(s => s.textContent === 'whlie').forEach(s => s.classList.add('c-WARN'));
    status.innerHTML = '<div class="e">⛔ main.c:4:25 · error léxico: carácter inesperado \'@\'</div><div class="w">⚠ main.c:3:5 · \'whlie\' no está declarado… ¿quisiste decir \'while\'?</div>';
  }
  async function typePhone(id) {
    const TXT = 'Ya voy, ¿dónde estsa?';
    msg.textContent = '';
    sug.classList.remove('on');
    $$('span', sug).forEach(s => s.classList.remove('pick'));
    await sleep(600);
    for (const ch of TXT) {
      if (!run.alive(id)) return;
      msg.textContent += ch;
      const key = $(`[data-k="${ch.toLowerCase()}"]`, kbd);
      if (key) { key.classList.add('press'); setTimeout(() => key.classList.remove('press'), 140); }
      await sleep(95);
    }
    await sleep(400);
    msg.innerHTML = 'Ya voy, ¿dónde <span class="typo">estsa</span>?';
    sug.classList.add('on');
    await sleep(1400);
    if (!run.alive(id)) return;
    sug.children[0].classList.add('pick');
    await sleep(600);
    msg.innerHTML = 'Ya voy, ¿dónde <span class="fixed">estás</span>?';
  }
  Escenas.register('q1', {
    enter() { const id = run.start(); typeCode(id); typePhone(id); },
    leave() { run.stop(); },
  });
})();

/* 
   q2 · fases del compilador
    */
(function () {
  const SRC = 'posicion = inicial + velocidad * 60';
  const chars = $('#pipeChars'), toks = $('#pipeToks'), sym = $('#pipeSym'), desc = $('#phaseDesc');
  const run = new Runner();
  $$('.phase').forEach(ph => ph.addEventListener('click', () => {
    $$('.phase').forEach(p => p.classList.remove('sel'));
    ph.classList.add('sel');
    desc.textContent = ph.dataset.desc;
  }));
  async function play(id) {
    chars.innerHTML = ''; toks.innerHTML = ''; sym.innerHTML = '';
    const cells = [...SRC].map((c, i) => {
      const s = document.createElement('span');
      s.textContent = c === ' ' ? '␣' : c;
      if (c === ' ') s.className = 'sp';
      s.style.animationDelay = i * 25 + 'ms';
      chars.appendChild(s);
      return s;
    });
    await sleep(SRC.length * 25 + 700);
    const ids = [];
    for (const t of Lexer.tokenize(SRC).tokens) {
      if (!run.alive(id)) return;
      for (let j = t.begin; j < t.end; j++) cells[j].classList.add(t.type === 'SKIP' ? 'gone' : 'lit');
      if (t.type !== 'SKIP') {
        let txt;
        if (t.type === 'ID') {
          let n = ids.indexOf(t.lex) + 1;
          if (!n) { n = ids.push(t.lex); sym.insertAdjacentHTML('beforeend', `<tr><td>${n}</td><td>${esc(t.lex)}</td></tr>`); }
          txt = `⟨id, ${n}⟩`;
        } else if (t.type === 'NUM') txt = `⟨num, ${t.lex}⟩`;
        else txt = `⟨${t.lex}⟩`;
        const d = document.createElement('div');
        d.className = 'tok k-' + t.type;
        d.innerHTML = `<span class="tn">${esc(t.lex)}</span><span class="tv">${esc(txt)}</span>`;
        toks.appendChild(d);
      }
      await sleep(t.type === 'SKIP' ? 120 : 480);
      for (let j = t.begin; j < t.end; j++) cells[j].classList.remove('lit');
    }
  }
  $('#pipeAgain').onclick = () => play(run.start());
  Escenas.register('q2', { enter() { play(run.start()); }, leave() { run.stop(); } });
})();

/* 
   q3 · historia
   */
(function () {
  const HITOS = [
    { y: '1206', t: 'Al-Jazari', tag: 'Precursores', pre: true, d: 'El ingeniero Ismail al-Jazari describe relojes de agua y músicos mecánicos que siguen una secuencia programada con levas. Aún no es teoría, pero ya es una máquina que pasa de un «paso» a otro.' },
    { y: '1804', t: 'Telar de Jacquard', tag: 'Precursores', pre: true, d: 'Joseph-Marie Jacquard controla un telar con tarjetas perforadas: la máquina lee una secuencia de símbolos y cambia lo que hace. La idea inspiró a Charles Babbage.' },
    { y: '1936', t: 'Alan Turing', tag: 'Teoría', d: '«On Computable Numbers»: una máquina abstracta con un número finito de estados y una cinta infinita. Un autómata finito es el caso más simple: lee la entrada una vez, de izquierda a derecha, y no puede escribir.' },
    { y: '1943', t: 'McCulloch y Pitts', tag: 'Teoría', d: 'Modelan las neuronas como unidades lógicas de «todo o nada». Sus redes resultan ser autómatas finitos: la inteligencia artificial y los autómatas tienen el mismo origen.' },
    { y: '1951', t: 'Stephen Kleene', tag: 'Teoría', d: 'En un informe para RAND (publicado en 1956) estudia esas redes e inventa las expresiones regulares y la operación estrella (*). Teorema de Kleene: lo que describe una expresión regular lo reconoce un autómata finito, y viceversa.' },
    { y: '1955', t: 'Mealy y Moore', tag: 'Circuitos', d: 'George Mealy (1955) y Edward Moore (1956) formalizan las máquinas de estados con salida para diseñar circuitos secuenciales. Mealy: la salida va en las transiciones. Moore: la salida va en los estados.' },
    { y: '1956', t: 'Noam Chomsky', tag: 'Lenguajes', d: 'Clasifica las gramáticas en una jerarquía. Los lenguajes regulares (tipo 3), los de los autómatas finitos, son el nivel más simple: justo lo que necesita un analizador léxico.' },
    { y: '1959', t: 'Rabin y Scott', tag: 'Teoría', d: '«Finite Automata and Their Decision Problems»: introducen los autómatas no deterministas (AFN) y prueban que equivalen a los deterministas con la construcción de subconjuntos. Premio Turing 1976.' },
    { y: '1968', t: 'Ken Thompson', tag: 'Software', d: 'Publica cómo convertir una expresión regular en un AFN y simularlo eficientemente. Lo usa en el editor QED y después en ed y grep, el «g/re/p» de Unix.' },
    { y: '1975', t: 'Lex', tag: 'Compiladores', d: 'Mike Lesk y Eric Schmidt (sí, el futuro CEO de Google, entonces practicante) crean Lex en Bell Labs: describes los tokens con expresiones regulares y genera el analizador léxico en C.' },
    { y: '1987', t: 'Flex', tag: 'Compiladores', d: 'Vern Paxson escribe Flex, la versión libre y rápida de Lex. Hoy conviven con ANTLR, re2c y los lexers escritos a mano de GCC, Clang y Go.' },
    { y: '2002', t: 'Autómatas de Levenshtein', tag: 'Hoy', d: 'Klaus Schulz y Stoyan Mihov construyen autómatas que aceptan todas las palabras a «k errores» de otra. Son base de la búsqueda difusa y de correctores ortográficos (por ejemplo, Apache Lucene).' },
  ];
  const tl = $('#timeline'), det = $('#tlDetail');
  let idx = 0;
  HITOS.forEach((h, i) => {
    const it = document.createElement('div');
    it.className = 'tl-item' + (h.pre ? ' pre' : '');
    it.style.left = 4 + (i * 92) / (HITOS.length - 1) + '%';
    it.innerHTML = `<div class="tt">${esc(h.t)}</div><div class="dot"></div><div class="yy">${h.y}</div>`;
    it.onclick = () => select(i);
    tl.appendChild(it);
  });
  function select(i) {
    idx = i;
    $$('.tl-item', tl).forEach((el, j) => { el.classList.toggle('on', j === i); el.classList.toggle('seen', j < i); });
    const h = HITOS[i];
    det.innerHTML = `<div class="tl-anim"><div class="tl-year grad">${h.y}</div><div class="pill tl-tag">${esc(h.tag)}</div></div>
      <div class="tl-body tl-anim"><h3>${esc(h.t)}</h3><p>${esc(h.d)}</p></div>`;
  }
  Escenas.register('q3', {
    enter(dir) { select(dir < 0 ? HITOS.length - 1 : 0); },
    next() { if (idx < HITOS.length - 1) { select(idx + 1); return true; } return false; },
    prev() { if (idx > 0) { select(idx - 1); return true; } return false; },
  });
})();
