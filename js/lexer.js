/* 
   Analizador léxico de un mini-lenguaje, implementado como
   un AFD real (el mismo que se dibuja en q13).
    */
const Lexer = (() => {
  const KW = ['if', 'else', 'while', 'for', 'return', 'int', 'float', 'string', 'print', 'true', 'false'];
  const isL = c => /[A-Za-z_]/.test(c);
  const isD = c => /[0-9]/.test(c);
  const isW = c => c === ' ' || c === '\t' || c === '\n' || c === '\r';

  // δ(estado, carácter) → estado | null
  function move(s, c) {
    if (c === undefined) return null;
    switch (s) {
      case 'S':
        if (isL(c)) return 'id';
        if (isD(c)) return 'int';
        if (c === '"') return 'strI';
        if (c === '<') return 'lt';
        if (c === '>') return 'gt';
        if (c === '=') return 'as';
        if (c === '!') return 'bang';
        if (c === '/') return 'sl';
        if (isW(c)) return 'ws';
        if ('+-*'.includes(c)) return 'op';
        if ('(){};,'.includes(c)) return 'pu';
        return null;
      case 'id': return isL(c) || isD(c) ? 'id' : null;
      case 'int': return isD(c) ? 'int' : c === '.' ? 'intp' : null;
      case 'intp':
      case 'dec': return isD(c) ? 'dec' : null;
      case 'strI': return c === '"' ? 'str' : c === '\n' ? null : 'strI';
      case 'lt': return c === '=' ? 'le' : null;
      case 'gt': return c === '=' ? 'ge' : null;
      case 'as': return c === '=' ? 'eq' : null;
      case 'bang': return c === '=' ? 'ne' : null;
      case 'sl': return c === '/' ? 'cm' : null;
      case 'cm': return c === '\n' ? null : 'cm';
      case 'ws': return isW(c) ? 'ws' : null;
      default: return null;
    }
  }

  // estados de aceptación → tipo de token
  const ACCEPT = {
    id: 'ID', int: 'NUM', dec: 'NUM', str: 'CADENA',
    lt: 'REL', le: 'REL', gt: 'REL', ge: 'REL', eq: 'REL', ne: 'REL',
    as: 'ASIG', op: 'OP', sl: 'OP', pu: 'PUNT', ws: 'SKIP', cm: 'SKIP',
  };
  const LABEL = { S: 'S', id: 'id', int: 'int', intp: 'int.', dec: 'dec', strI: '"…', str: '"…"', lt: '<', le: '<=', gt: '>', ge: '>=', as: '=', eq: '==', bang: '!', ne: '!=', sl: '/', cm: '//', ws: 'ws', op: 'op', pu: 'punt' };

  /* Recorre el texto y produce una lista de eventos (para animar) y los tokens.
     Regla del lexema más largo: se recuerda el último estado de aceptación. */
  function tokenize(src) {
    const events = [], tokens = [];
    let pos = 0;
    while (pos < src.length) {
      const begin = pos;
      let st = 'S', i = pos, last = null, lastEnd = -1;
      events.push({ k: 'begin', begin });
      while (i < src.length) {
        const nx = move(st, src[i]);
        if (!nx) break;
        events.push({ k: 'move', from: st, to: nx, i, begin });
        st = nx;
        i++;
        if (ACCEPT[st]) { last = st; lastEnd = i; }
      }
      events.push({ k: 'stuck', st, i, begin, ch: src[i] });
      if (last) {
        const lex = src.slice(begin, lastEnd);
        let type = ACCEPT[last];
        if (type === 'ID' && KW.includes(lex)) type = 'KW';
        const tok = { type, lex, begin, end: lastEnd, state: last, skip: type === 'SKIP', what: last === 'cm' ? 'comentario' : 'espacio' };
        events.push({ k: 'emit', tok, back: i - lastEnd, i });
        tokens.push(tok);
        pos = lastEnd;
      } else {
        let end, msg;
        if (st === 'S') { end = begin + 1; msg = `carácter inválido '${src[begin]}'`; }
        else if (st === 'strI') { end = i; msg = 'cadena sin cerrar'; }
        else { end = i; msg = `token incompleto '${src.slice(begin, i)}'`; }
        const tok = { type: 'ERR', lex: src.slice(begin, end), begin, end, msg, state: st };
        events.push({ k: 'error', tok, i });
        tokens.push(tok);
        pos = end;
      }
    }
    events.push({ k: 'eof' });
    return { events, tokens };
  }

  function lineCol(src, idx) {
    const before = src.slice(0, idx).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1 };
  }

  // nombre corto del token para mostrar en pantalla
  function tokName(tok, symIdx) {
    switch (tok.type) {
      case 'KW': return tok.lex.toUpperCase();
      case 'ID': return symIdx ? 'ID,' + symIdx : 'ID';
      case 'SKIP': return 'se ignora';
      case 'ERR': return 'ERROR';
      default: return tok.type;
    }
  }

  // HTML coloreado (para el editor de q1)
  function highlight(src) {
    return tokenize(src).tokens.map(t => {
      const cls = t.type === 'SKIP' ? (t.state === 'cm' ? 'c-SKIP' : '') : 'c-' + t.type;
      return cls ? `<span class="${cls}">${esc(t.lex)}</span>` : esc(t.lex);
    }).join('');
  }

  // definición visual del AFD combinado
  const DFA = {
    viewBox: '0 0 620 660', r: 22, font: 13, labelFont: 12,
    states: [
      { id: 'S', x: 70, y: 330, label: 'S', start: true, r: 26, font: 16, startAngle: 135 },
      { id: 'ws', x: 70, y: 140, label: 'ws', accept: true, cls: 'tint-skip' },
      { id: 'id', x: 250, y: 40, label: 'id', accept: true, cls: 'tint-id' },
      { id: 'int', x: 250, y: 120, label: 'int', accept: true, cls: 'tint-num' },
      { id: 'intp', x: 400, y: 120, label: 'int.' },
      { id: 'dec', x: 540, y: 120, label: 'dec', accept: true, cls: 'tint-num' },
      { id: 'strI', x: 250, y: 200, label: '"…' },
      { id: 'str', x: 400, y: 200, label: '"…"', accept: true, cls: 'tint-str' },
      { id: 'lt', x: 250, y: 280, label: '<', accept: true, cls: 'tint-rel' },
      { id: 'le', x: 400, y: 280, label: '<=', accept: true, cls: 'tint-rel' },
      { id: 'gt', x: 250, y: 360, label: '>', accept: true, cls: 'tint-rel' },
      { id: 'ge', x: 400, y: 360, label: '>=', accept: true, cls: 'tint-rel' },
      { id: 'as', x: 250, y: 440, label: '=', accept: true, cls: 'tint-op' },
      { id: 'eq', x: 400, y: 440, label: '==', accept: true, cls: 'tint-rel' },
      { id: 'bang', x: 250, y: 520, label: '!' },
      { id: 'ne', x: 400, y: 520, label: '!=', accept: true, cls: 'tint-rel' },
      { id: 'sl', x: 250, y: 600, label: '/', accept: true, cls: 'tint-op' },
      { id: 'cm', x: 400, y: 600, label: '//', accept: true, cls: 'tint-skip' },
      { id: 'op', x: 40, y: 520, label: 'op', accept: true, cls: 'tint-op' },
      { id: 'pu', x: 125, y: 590, label: 'punt', accept: true, cls: 'tint-punct', font: 11 },
    ],
    edges: [
      { from: 'S', to: 'ws', label: 'esp' },
      { from: 'S', to: 'id', label: 'letra', t: .62 },
      { from: 'S', to: 'int', label: 'díg', t: .62 },
      { from: 'S', to: 'strI', label: '"', t: .62 },
      { from: 'S', to: 'lt', label: '<', t: .62 },
      { from: 'S', to: 'gt', label: '>', t: .62 },
      { from: 'S', to: 'as', label: '=', t: .62 },
      { from: 'S', to: 'bang', label: '!', t: .62 },
      { from: 'S', to: 'sl', label: '/', t: .62 },
      { from: 'S', to: 'op', label: '+-*', t: .6 },
      { from: 'S', to: 'pu', label: '(){};,', t: .62, dx: 30 },
      { from: 'ws', to: 'ws', label: 'esp', loop: -90 },
      { from: 'id', to: 'id', label: 'letra|díg', loop: 0 },
      { from: 'int', to: 'int', label: 'díg', loop: -35 },
      { from: 'int', to: 'intp', label: '.' },
      { from: 'intp', to: 'dec', label: 'díg' },
      { from: 'dec', to: 'dec', label: 'díg', loop: -90 },
      { from: 'strI', to: 'strI', label: 'otro', loop: -35 },
      { from: 'strI', to: 'str', label: '"' },
      { from: 'lt', to: 'le', label: '=' },
      { from: 'gt', to: 'ge', label: '=' },
      { from: 'as', to: 'eq', label: '=' },
      { from: 'bang', to: 'ne', label: '=' },
      { from: 'sl', to: 'cm', label: '/' },
      { from: 'cm', to: 'cm', label: 'otro', loop: 0 },
    ],
  };

  return { KW, move, ACCEPT, LABEL, tokenize, lineCol, tokName, highlight, DFA };
})();

/* 
   Utilidad: crea un «chip» de token
   */
function tokChip(tok, symIdx) {
  const d = document.createElement('div');
  d.className = 'tok k-' + tok.type;
  const shown = tok.type === 'CADENA' ? tok.lex : tok.lex.replace(/\n/g, '↵');
  d.innerHTML = `<span class="tn">${esc(Lexer.tokName(tok, symIdx))}</span><span class="tv">${esc(shown)}</span>`;
  if (tok.type === 'ERR') d.title = tok.msg;
  return d;
}

/* 
   q11 · token / lexema / patrón
   */
(function () {
  const SRC = 'if (edad >= 18) precio = precio * 0.9; // descuento';
  const box = $('#sentence'), sym = $('#sentSym');
  const run = new Runner();
  function build() {
    box.classList.remove('split');
    box.innerHTML = '';
    sym.innerHTML = '';
    const ids = [];
    for (const t of Lexer.tokenize(SRC).tokens) {
      let idx;
      if (t.type === 'ID') { idx = ids.indexOf(t.lex) + 1 || ids.push(t.lex); }
      const b = document.createElement('div');
      b.className = 'blk' + (t.type === 'SKIP' ? ' skip' : '');
      const lx = t.state === 'ws' ? '·' : t.lex;
      b.innerHTML = `<span class="lx c-${t.type}">${esc(lx)}</span><span class="tn c-${t.type}">${t.type === 'SKIP' ? (t.state === 'cm' ? 'comentario' : '') : esc(Lexer.tokName(t, idx))}</span>`;
      box.appendChild(b);
    }
    ids.forEach((id, i) => { sym.innerHTML += `<tr><td>${i + 1}</td><td>${esc(id)}</td></tr>`; });
  }
  Escenas.register('q11', {
    async enter() {
      const id = run.start();
      build();
      await sleep(1300);
      if (run.alive(id)) box.classList.add('split');
    },
    leave() { run.stop(); },
  });
})();

/* 
   q12 · reglas: lexema más largo y prioridad
   */
(function () {
  const CASES = [
    { s: 'x>=y', msg: 'Después de «>» el autómata todavía puede avanzar con «=». Se queda con «>=», el lexema más largo: un solo token REL.' },
    { s: 'iffy if', msg: '«iffy» llega más lejos como identificador que como «if». El segundo «if» empata (ID y palabra clave, misma longitud) y gana la palabra clave por prioridad.' },
    { s: '3.x', msg: 'Leyó «3.» esperando decimales, pero llegó «x». El último estado de aceptación fue después del «3»: emite NUM y RETROCEDE. Luego «.» sola no forma ningún token → error léxico.' },
    { s: 'a===b', msg: 'El lexer es «codicioso»: toma «==» primero y deja «=» suelto. No intenta adivinar lo que quisiste decir.' },
  ];
  const strip = $('#ruleStrip'), msgEl = $('#ruleMsg'), toksEl = $('#ruleToks'), casesEl = $('#ruleCases');
  const run = new Runner();
  CASES.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'btn' + (i ? '' : ' on');
    b.innerHTML = `<span class="mono">${esc(c.s)}</span>`;
    b.onclick = () => play(i);
    casesEl.appendChild(b);
  });
  async function play(ci) {
    const id = run.start();
    $$('button', casesEl).forEach((b, j) => b.classList.toggle('on', j === ci));
    const { s, msg } = CASES[ci];
    strip.innerHTML = [...s].map(ch => `<span>${ch === ' ' ? '␣' : esc(ch)}</span>`).join('');
    toksEl.innerHTML = '';
    msgEl.textContent = '';
    const cells = $$('span', strip);
    const clear = () => cells.forEach(c => c.classList.remove('in', 'fwd', 'beg', 'look'));
    const ids = [];
    for (const ev of Lexer.tokenize(s).events) {
      if (!run.alive(id)) return;
      if (ev.k === 'begin') { clear(); cells[ev.begin]?.classList.add('beg'); msgEl.textContent = 'Nuevo lexema: el puntero de inicio se coloca aquí.'; }
      else if (ev.k === 'move') {
        cells.forEach(c => c.classList.remove('fwd'));
        cells[ev.i].classList.add('in', 'fwd');
        msgEl.textContent = `Lee «${s[ev.i]}» → estado ${Lexer.LABEL[ev.to]}${Lexer.ACCEPT[ev.to] ? ' (acepta)' : ''}`;
      } else if (ev.k === 'stuck') {
        if (ev.i < s.length) { cells[ev.i].classList.add('look'); msgEl.textContent = `Mira «${s[ev.i]}»: no hay transición desde ${Lexer.LABEL[ev.st]}.`; }
        else msgEl.textContent = 'Fin de la entrada.';
      } else if (ev.k === 'emit') {
        if (!ev.tok.skip) {
          let idx; if (ev.tok.type === 'ID') idx = ids.indexOf(ev.tok.lex) + 1 || ids.push(ev.tok.lex);
          toksEl.appendChild(tokChip(ev.tok, idx));
        }
        msgEl.textContent = ev.back > 0 ? `↩ Retrocede ${ev.back} carácter(es) y emite «${ev.tok.lex}».` : `Emite «${ev.tok.lex.replace(' ', '␣')}».`;
      } else if (ev.k === 'error') {
        toksEl.appendChild(tokChip(ev.tok));
        msgEl.textContent = `⛔ Error léxico: ${ev.tok.msg}`;
      } else if (ev.k === 'eof') { clear(); msgEl.textContent = msg; }
      await sleep(ev.k === 'begin' ? 350 : 620);
    }
  }
  Escenas.register('q12', { enter() { play(0); }, leave() { run.stop(); } });
})();

/* 
   q13 · simulador completo
    */
(function () {
  const PRESETS = [
    { n: 'Clásico (Libro del Dragón)', s: 'posicion = inicial + velocidad * 60;' },
    { n: 'Condicional', s: 'if (edad >= 18) {\n  precio = precio * 0.9; // descuento\n}' },
    { n: 'Typo: whlie', s: 'whlie (x != 0) x = x - 1;' },
    { n: 'Errores léxicos', s: 'año = 3.14.15 @ 2;\nprint("hola);' },
    { n: 'Maximal munch', s: 'iffy = x>=y == z;\nif ifx <= 1' },
    { n: 'Del aula', s: 'float nota = 85.5;\nwhile (nota < 100) nota = nota + 1;\nprint("aprobado");' },
  ];
  const sel = $('#simPreset'), view = $('#simView'), text = $('#simText'), status = $('#simStatus');
  const toksEl = $('#simToks'), symEl = $('#simSym'), playBtn = $('#simPlay');
  const fsm = new FSM('lexFsm', Lexer.DFA);
  const run = new Runner();
  let src = '', events = [], k = 0, cells = [], ids = [], playing = false, nErr = 0, nTok = 0;

  PRESETS.forEach((p, i) => sel.add(new Option(p.n, i)));
  sel.value = 1;
  sel.onchange = () => load(PRESETS[sel.value].s);

  function load(s) {
    stop();
    src = s;
    text.value = s;
    events = Lexer.tokenize(src).events;
    k = 0; ids = []; nErr = 0; nTok = 0;
    view.innerHTML = '';
    cells = [...src].map(ch => {
      const sp = document.createElement('span');
      sp.textContent = ch;
      view.appendChild(sp);
      return sp;
    });
    toksEl.innerHTML = '';
    symEl.innerHTML = '';
    fsm.clear('active', 'ok', 'bad', 'stuck');
    fsm.setActive('S');
    status.innerHTML = 'Presiona <b>▶ Reproducir</b> o <b>Paso</b>. Cada paso lee un carácter.';
  }

  const show = c => (c === '\n' ? '↵' : c === ' ' ? '␣' : c);
  function apply(ev) {
    const L = Lexer.LABEL;
    switch (ev.k) {
      case 'begin':
        cells.forEach(c => c.classList.remove('lexeme', 'fwd', 'look'));
        fsm.clear('ok', 'bad', 'stuck');
        fsm.setActive('S');
        { const p = Lexer.lineCol(src, ev.begin); status.innerHTML = `Nuevo lexema en línea ${p.line}, columna ${p.col}. Estado <b>S</b>.`; }
        break;
      case 'move': {
        cells.forEach(c => c.classList.remove('fwd'));
        cells[ev.i].classList.add('lexeme', 'fwd');
        fsm.flash(ev.from, ev.to, 500);
        fsm.setActive(ev.to);
        const acc = Lexer.ACCEPT[ev.to];
        status.innerHTML = `Lee <b>${esc(show(src[ev.i]))}</b> → δ(${esc(L[ev.from])}, ${esc(show(src[ev.i]))}) = <b>${esc(L[ev.to])}</b>${acc ? ' · estado de aceptación' : ''}`;
        break;
      }
      case 'stuck':
        fsm.mark(ev.st, 'stuck');
        if (ev.i < src.length) {
          cells[ev.i].classList.add('look');
          status.innerHTML = `Mira <b>${esc(show(ev.ch))}</b>: no hay transición desde <b>${esc(L[ev.st])}</b>. El lexema termina aquí.`;
        } else status.innerHTML = `Fin del archivo estando en <b>${esc(L[ev.st])}</b>.`;
        break;
      case 'emit': {
        const t = ev.tok;
        cells.forEach(c => c.classList.remove('lexeme', 'fwd', 'look'));
        for (let j = t.begin; j < t.end; j++) cells[j].classList.add(t.type === 'SKIP' ? 'SKIP' : 'c-' + t.type);
        fsm.mark(t.state, 'ok');
        const back = ev.back > 0 ? `↩ Retrocede ${ev.back} carácter(es). ` : '';
        if (t.skip) { status.innerHTML = `${back}${t.what === 'comentario' ? 'Comentario' : 'Espacio en blanco'}: se descarta, el parser nunca lo verá.`; break; }
        let idx;
        if (t.type === 'ID') {
          idx = ids.indexOf(t.lex) + 1;
          if (!idx) { idx = ids.push(t.lex); symEl.insertAdjacentHTML('beforeend', `<div><i>${idx}</i>${esc(t.lex)}</div>`); }
        }
        nTok++;
        toksEl.appendChild(tokChip(t, idx));
        const kw = t.type === 'KW' ? ' (era ID, pero está en la tabla de palabras clave)' : '';
        const extra = t.lex === 'whlie' ? ' ¡El lexer no sabe que es un error de dedo!' : '';
        status.innerHTML = `${back}Emite <b>${esc(Lexer.tokName(t, idx))}</b> con lexema «${esc(t.lex)}»${kw}.${extra}`;
        break;
      }
      case 'error': {
        const t = ev.tok, p = Lexer.lineCol(src, t.begin);
        cells.forEach(c => c.classList.remove('lexeme', 'fwd', 'look'));
        for (let j = t.begin; j < t.end; j++) cells[j].classList.add('c-ERR');
        fsm.mark(t.state, 'bad');
        nErr++;
        toksEl.appendChild(tokChip(t));
        status.innerHTML = `⛔ <b>Error léxico</b> (${p.line}:${p.col}): ${esc(t.msg)}. Modo pánico: se descarta y se sigue leyendo.`;
        break;
      }
      case 'eof':
        fsm.clear('active', 'ok', 'bad', 'stuck');
        status.innerHTML = `✓ Fin: <b>${nTok}</b> tokens enviados al parser · <b>${nErr}</b> error(es) léxico(s).`;
        stop();
        break;
    }
  }
  function step() {
    if (k >= events.length) return false;
    apply(events[k++]);
    return k < events.length;
  }
  const delay = () => 1000 - +$('#simSpeed').value * 88;
  async function play() {
    if (playing) return stop();
    if (k >= events.length) load(src);
    const id = run.start();
    playing = true;
    playBtn.textContent = '⏸ Pausa';
    while (run.alive(id) && step()) {
      const ev = events[k - 1];
      await sleep(ev.k === 'begin' ? delay() * .5 : ev.k === 'emit' || ev.k === 'error' ? delay() * 1.4 : delay());
    }
    if (run.alive(id)) stop();
  }
  function stop() { run.stop(); playing = false; playBtn.textContent = '▶ Reproducir'; }

  playBtn.onclick = play;
  $('#simStep').onclick = () => { stop(); step(); };
  $('#simReset').onclick = () => load(src);
  $('#simEdit').onclick = () => {
    const editing = text.style.display !== 'none';
    if (editing) { text.style.display = 'none'; view.style.display = ''; load(text.value); $('#simEdit').textContent = '✎ Editar'; }
    else { stop(); text.style.display = ''; view.style.display = 'none'; text.focus(); $('#simEdit').textContent = '✓ Listo'; }
  };

  load(PRESETS[1].s);
  Escenas.register('q13', { leave() { stop(); } });
})();
