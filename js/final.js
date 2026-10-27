/* 
   Escenas q14–q19
    */

/* 
   q14 · quiz: ¿quién atrapa el error?
    */
(function () {
  const OPTS = [['L', 'Léxico'], ['S', 'Sintáctico'], ['M', 'Semántico']];
  const QUIZ = [
    { c: 'x = 5 @ 3;', a: 'L', why: '«@» no coincide con ningún patrón de token: el autómata no puede salir del estado inicial. Error léxico.' },
    { c: 'whlie (x > 0) {', a: 'S', why: '¡Sorpresa! Para el lexer «whlie» es un ID perfectamente válido. El parser ve ID ( … ) { y protesta. (Con «whlie(x);» pasaría la sintaxis y lo atraparía el semántico: función no declarada.)' },
    { c: 'msg = "hola;', a: 'L', why: 'La cadena nunca se cierra: el autómata se queda en el estado «dentro de cadena» al llegar al fin de línea.' },
    { c: 'x = (3 + 4;', a: 'S', why: 'Todos los tokens son válidos, pero falta «)». Balancear paréntesis requiere una pila (gramática libre de contexto): un autómata finito no puede contar.' },
    { c: 'int x = "hola";', a: 'M', why: 'Tokens válidos y sintaxis válida… pero guardar una cadena en un int es un error de tipos: análisis semántico.' },
    { c: 'y = 3.14.15;', a: 'L', why: 'Se forma NUM(3.14) y luego «.» no puede iniciar ningún token. En C, GCC lo reporta como «too many decimal points in number».' },
  ];
  const grid = $('#quizGrid'), score = $('#quizScore');
  let ok = 0, done = 0;
  function render() {
    ok = 0; done = 0;
    score.textContent = '';
    grid.innerHTML = '';
    QUIZ.forEach(q => {
      const card = document.createElement('div');
      card.className = 'card qz';
      card.innerHTML = `<pre>${Lexer.highlight(q.c)}</pre><div class="opts">${OPTS.map(o => `<button data-o="${o[0]}">${o[1]}</button>`).join('')}</div><div class="why">${esc(q.why)}</div>`;
      $$('button', card).forEach(b => (b.onclick = () => {
        if (card.classList.contains('done')) return;
        card.classList.add('done');
        const right = b.dataset.o === q.a;
        b.classList.add(right ? 'right' : 'wrong');
        if (!right) $(`[data-o="${q.a}"]`, card).classList.add('right');
        done++; if (right) ok++;
        score.textContent = `· ${ok}/${done}`;
      }));
      grid.appendChild(card);
    });
  }
  render();
  Escenas.register('q14', { enter(dir) { if (dir > 0) render(); } });
})();

/* 
   q15 · autocorrector: trie + distancia de edición
    */
(function () {
  const DICTS = {
    kw: ['if', 'int', 'for', 'float', 'false', 'while', 'else', 'return', 'print', 'true'],
    es: ['hola', 'hora', 'hoja', 'casa', 'cosa', 'como', 'comer', 'esta', 'estas', 'estás', 'este'],
  };
  const input = $('#acInput'), verdict = $('#acVerdict'), sugs = $('#acSugs');
  let dict = 'kw', trie, fsm, nodes, rowGap = 60;

  // distancia de edición con intercambio de letras vecinas (Damerau, «optimal string alignment»)
  function dist(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  function build() {
    let n = 0;
    const root = { id: 'n0', ch: '', kids: {}, word: null, depth: 0 };
    nodes = [root];
    for (const w of DICTS[dict]) {
      let cur = root;
      for (const ch of w) {
        if (!cur.kids[ch]) { cur.kids[ch] = { id: 'n' + ++n, ch, kids: {}, word: null, depth: cur.depth + 1, parent: cur }; nodes.push(cur.kids[ch]); }
        cur = cur.kids[ch];
      }
      cur.word = w;
    }
    trie = root;
    // posiciones: x por profundidad, y por orden de hojas
    const maxD = Math.max(...nodes.map(x => x.depth));
    const leaves = [];
    (function walk(nd) { const ks = Object.values(nd.kids); if (!ks.length) leaves.push(nd); ks.forEach(walk); })(root);
    const dx = 610 / maxD, dy = 560 / (leaves.length - 1);
    rowGap = dy;
    leaves.forEach((l, i) => (l.y = 30 + i * dy));
    (function place(nd) {
      const ks = Object.values(nd.kids);
      ks.forEach(place);
      if (ks.length) nd.y = (ks[0].y + ks[ks.length - 1].y) / 2;
      nd.x = 40 + nd.depth * dx;
    })(root);
    const states = nodes.map(nd => ({
      id: nd.id, x: nd.x, y: nd.y, label: nd === root ? 'q0' : '', accept: !!nd.word, start: nd === root,
      r: nd === root ? 20 : 13, font: 12,
      sub: nd.word || '', subX: Object.keys(nd.kids).length ? 0 : 20, subY: Object.keys(nd.kids).length ? -20 : 5,
      subAnchor: Object.keys(nd.kids).length ? 'middle' : 'start', subFont: 15,
    }));
    states.push({ id: 'dead', x: 690, y: 600, label: '∅', dead: true, r: 14, font: 15 });
    const edges = nodes.filter(nd => nd.parent).map(nd => ({ from: nd.parent.id, to: nd.id, label: nd.ch, font: 15 }));
    fsm = new FSM('trieFsm', { viewBox: '0 0 780 640', labelFont: 15, states, edges });
  }

  function update() {
    const w = input.value.toLowerCase().trim();
    let cur = trie, fail = null;
    const path = [trie.id];
    for (const ch of w) {
      if (!cur.kids[ch]) { fail = ch; break; }
      cur = cur.kids[ch];
      path.push(cur.id);
    }
    // arista temporal hacia ∅ (colocado junto al nodo donde se cayó)
    fsm.def.edges = fsm.def.edges.filter(e => e.to !== 'dead');
    const dead = fsm.state('dead');
    dead.x = cur.x + 30;
    dead.y = cur.y + Math.min(40, rowGap * .46);
    if (fail) fsm.def.edges.push({ from: cur.id, to: 'dead', label: fail, cls: 'hot', font: 14, t: .5, dx: -26, dy: 12 });
    fsm.render();
    fsm.mark('dead', 'hid', !fail);
    fsm.setActive(fail ? path : path.slice(0, -1), 'path');
    fsm.setActive(fail ? 'dead' : cur.id);
    sugs.innerHTML = '';
    input.classList.remove('bad', 'good');
    if (!w) { verdict.className = 'verdict'; verdict.textContent = 'Escribe una palabra…'; return; }
    if (fail) {
      fsm.mark('dead', 'bad');
      input.classList.add('bad');
      verdict.className = 'verdict no';
      verdict.textContent = `✗ Sin transición para «${fail}»: cae en ∅`;
      const ranked = DICTS[dict].map(x => ({ x, d: dist(w, x) })).filter(o => o.d <= 2).sort((a, b) => a.d - b.d).slice(0, 3);
      if (!ranked.length) sugs.innerHTML = '<p class="small muted">Ninguna palabra a distancia ≤ 2.</p>';
      ranked.forEach((o, i) => addSug(o.x, `${o.d} ${o.d === 1 ? 'cambio' : 'cambios'}`, i));
    } else if (cur.word) {
      fsm.mark(cur.id, 'ok');
      input.classList.add('good');
      verdict.className = 'verdict ok';
      verdict.textContent = '✓ Estado de aceptación: palabra del diccionario';
    } else {
      verdict.className = 'verdict';
      verdict.textContent = '… prefijo válido, pero no es estado de aceptación';
      DICTS[dict].filter(x => x.startsWith(w)).slice(0, 3).forEach((x, i) => addSug(x, 'completar', i));
    }
  }
  function addSug(word, note, i) {
    const d = document.createElement('div');
    d.className = 'sug';
    d.style.animationDelay = i * 90 + 'ms';
    d.innerHTML = `<span>${esc(word)}</span><small>${esc(note)}</small>`;
    d.onclick = () => { input.value = word; update(); };
    sugs.appendChild(d);
  }
  $$('[data-dict]').forEach(b => (b.onclick = () => {
    dict = b.dataset.dict;
    $$('[data-dict]').forEach(x => x.classList.toggle('on', x === b));
    input.value = dict === 'kw' ? 'whlie' : 'estsa';
    build(); update();
  }));
  input.addEventListener('input', update);
  build(); update();
})();

/* 
   q19 · créditos
    */
(function () {
  $('#crNames').innerHTML = CONFIG.integrantes.map(n => `<div>${esc(n)}</div>`).join('');
  $('#crUni').textContent = CONFIG.universidad;
  $('#crCourse').textContent = `${CONFIG.curso} · ${CONFIG.ciclo} · Catedrático: ${CONFIG.catedratico}`;
  $('#crLic').innerHTML = `Este video y la presentación interactiva se publican bajo licencia <b>Creative Commons Atribución 4.0 Internacional (CC BY 4.0)</b>. ` +
    `Todas las animaciones, diagramas e íconos fueron hechos por el equipo. Tipografías: Space Grotesk, Plus Jakarta Sans y JetBrains Mono (SIL Open Font License, vía Google Fonts). ` +
    `Ejemplo «posicion = inicial + velocidad * 60» y (a|b)*abb tomados de Aho et al. (2006).`;
})();
