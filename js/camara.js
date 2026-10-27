/* 
   Cámara estilo Prezi: el mundo es un lienzo gigante y cada
   escena es un «estado». Navegar = hacer una transición.
   */
(function () {
  const W = 1600, H = 900;
  const world = $('#world');
  const scenes = $$('.scene').map(el => ({
    el, id: el.id,
    x: +el.dataset.x, y: +el.dataset.y,
    r: +(el.dataset.r || 0), s: +(el.dataset.s || 1),
    title: el.dataset.title || el.id,
  }));

  // posicionar escenas y agregar su «insignia» de estado
  scenes.forEach(sc => {
    sc.el.style.left = sc.x - W / 2 + 'px';
    sc.el.style.top = sc.y - H / 2 + 'px';
    sc.el.style.transform = `rotate(${sc.r}deg) scale(${sc.s})`;
    const b = document.createElement('div');
    b.className = 'badge';
    b.textContent = sc.id;
    sc.el.appendChild(b);
  });

  // transiciones entre escenas: el «autómata» de la presentación
  (function drawLinks() {
    const svg = $('#links');
    const arrow = (p, ang) => {
      const u = [Math.cos(ang), Math.sin(ang)], q = [-u[1], u[0]];
      const b = [p[0] - u[0] * 70, p[1] - u[1] * 70];
      return `${p} ${b[0] + q[0] * 38},${b[1] + q[1] * 38} ${b[0] - q[0] * 38},${b[1] - q[1] * 38}`;
    };
    const link = (a, b, label) => {
      svgEl('path', { class: 'lk-base', d: `M${a.p} C${a.c} ${b.c} ${b.p}` }, svg);
      svgEl('path', { class: 'lk', d: `M${a.p} C${a.c} ${b.c} ${b.p}` }, svg);
      svgEl('polygon', { class: 'lk-head', points: arrow(b.p, b.ang) }, svg);
      if (label) {
        const t = svgEl('text', { class: 'lk-label', x: (a.c[0] + b.c[0]) / 2, y: (a.c[1] + b.c[1]) / 2 - 70 }, svg);
        t.textContent = label;
      }
    };
    for (let i = 0; i < scenes.length - 1; i++) {
      const A = scenes[i], B = scenes[i + 1];
      const dx = B.x - A.x, dy = B.y - A.y;
      let a, b;
      if (Math.abs(dx) > Math.abs(dy)) {
        const sg = Math.sign(dx);
        const pa = [A.x + sg * (W / 2 * A.s + 40), A.y], pb = [B.x - sg * (W / 2 * B.s + 30), B.y];
        a = { p: pa, c: [pa[0] + sg * 260, pa[1]] };
        b = { p: pb, c: [pb[0] - sg * 260, pb[1]], ang: sg > 0 ? 0 : Math.PI };
      } else {
        const sg = Math.sign(dy);
        const pa = [A.x, A.y + sg * (H / 2 * A.s + 40)], pb = [B.x, B.y - sg * (H / 2 * B.s + 30)];
        a = { p: pa, c: [pa[0], pa[1] + sg * 260] };
        b = { p: pb, c: [pb[0], pb[1] - sg * 260], ang: sg > 0 ? Math.PI / 2 : -Math.PI / 2 };
      }
      link(a, b, '→');
    }
    // flecha de inicio hacia q0
    const s0 = scenes[0], x0 = s0.x - W / 2 * s0.s - 30;
    link({ p: [x0 - 700, s0.y], c: [x0 - 400, s0.y] }, { p: [x0, s0.y], c: [x0 - 300, s0.y], ang: 0 }, 'inicio');
  })();

  // ---------------- cámara ----------
  let cur = -1, cam = { x: 0, y: 0, z: 0.5, r: 0 }, raf = 0, overview = false;
  const fitZ = s => Math.min(innerWidth / W, innerHeight / H) * 0.95 / s;
  const camFor = i => ({ x: scenes[i].x, y: scenes[i].y, r: scenes[i].r, z: fitZ(scenes[i].s) * (scenes[i].el.classList.contains('final') ? .93 : 1) });
  function camOverview() {
    const xs = scenes.flatMap(s => [s.x - W * .6 * s.s, s.x + W * .6 * s.s]);
    const ys = scenes.flatMap(s => [s.y - H * .6 * s.s, s.y + H * .6 * s.s]);
    const minX = Math.min(...xs) - 600, maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, r: 0, z: Math.min(innerWidth / (maxX - minX), innerHeight / (maxY - minY)) * 0.96 };
  }
  function apply(c) {
    world.style.transform = `translate(${innerWidth / 2}px,${innerHeight / 2}px) scale(${c.z}) rotate(${-c.r}deg) translate(${-c.x}px,${-c.y}px)`;
    BG.cam(c);
  }
  function flyTo(to, dur = 1500) {
    cancelAnimationFrame(raf);
    const from = { ...cam };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const dip = Math.log(1 + dist / 1800) * 0.75; // cuánto se aleja la cámara a mitad del viaje
    const lz0 = Math.log(from.z), lz1 = Math.log(to.z);
    const t0 = performance.now();
    world.classList.add('moving');
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      cam = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        r: from.r + (to.r - from.r) * e,
        z: Math.exp(lz0 + (lz1 - lz0) * e - dip * Math.sin(Math.PI * e)),
      };
      apply(cam);
      if (t < 1) raf = requestAnimationFrame(step);
      else world.classList.remove('moving');
    };
    raf = requestAnimationFrame(step);
  }

  // ---------- fragmentos y escenas ----------
  const handler = i => Escenas.reg[scenes[i].id] || {};
  function setFrags(i, shown) { $$('.frag', scenes[i].el).forEach(f => f.classList.toggle('shown', shown)); }
  function nextFrag(i) {
    const f = $$('.frag', scenes[i].el).find(x => !x.classList.contains('shown'));
    if (f) { f.classList.add('shown'); return true; }
    return false;
  }

  function go(i, dir = 1, instant = false) {
    if (i < 0 || i >= scenes.length) return;
    if (overview) setOverview(false, true);
    if (cur >= 0 && cur !== i) { scenes[cur].el.classList.remove('active'); handler(cur).leave?.(); }
    const prev = cur;
    cur = i;
    scenes[i].el.classList.add('active');
    seen.add(i);
    if (prev !== i) {
      setFrags(i, dir < 0);
      handler(i).enter?.(dir);
    }
    if (instant) { cam = camFor(i); apply(cam); } else flyTo(camFor(i));
    history.replaceState(null, '', '#' + scenes[i].id);
    updateHud();
  }
  function next() {
    if (overview) return go(cur, 1);
    if (handler(cur).next?.()) return;
    if (nextFrag(cur)) return;
    go(cur + 1, 1);
  }
  function prev() {
    if (overview) return go(cur, 1);
    if (handler(cur).prev?.()) return;
    go(cur - 1, -1);
  }
  function setOverview(on, silent) {
    overview = on;
    document.body.classList.toggle('overview', on);
    if (!silent) flyTo(on ? camOverview() : camFor(cur), 1300);
  }

  // ---------- HUD ----------
  const seen = new Set();
  const hudStates = $('#hudStates');
  scenes.forEach((sc, i) => {
    if (i) hudStates.appendChild(document.createElement('i'));
    const b = document.createElement('button');
    b.textContent = i;
    b.title = sc.id + ' · ' + sc.title;
    if (i === scenes.length - 1) b.classList.add('fin');
    b.onclick = () => go(i, i >= cur ? 1 : -1);
    hudStates.appendChild(b);
  });
  function updateHud() {
    $$('button', hudStates).forEach((b, i) => { b.classList.toggle('cur', i === cur); b.classList.toggle('seen', seen.has(i)); });
    $('#hudTitle').textContent = scenes[cur].id + ' · ' + scenes[cur].title;
    const n = NOTAS[scenes[cur].id];
    $('#notes').innerHTML = `<h4>${scenes[cur].id} · ${esc(scenes[cur].title)}</h4>` +
      (n ? `<span class="who">${esc(n[0])}</span>${esc(n[1])}` : '');
  }
  $('#hudPrev').onclick = prev;
  $('#hudNext').onclick = next;
  $('#hudMap').onclick = () => setOverview(!overview);

  let hudTimer;
  const hud = $('#hud');
  addEventListener('mousemove', () => {
    hud.classList.remove('hide');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => hud.classList.add('hide'), 2500);
  });

  scenes.forEach((sc, i) => sc.el.addEventListener('click', () => { if (overview) go(i, i >= cur ? 1 : -1); }));

  // ---------- teclado ----------
  addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    const k = e.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0, -1);
    else if (k === 'End') go(scenes.length - 1, 1);
    else if (k === 'm' || k === 'M' || k === 'Escape') setOverview(!overview && k !== 'Escape');
    else if (k === 'h' || k === 'H') document.body.classList.toggle('clean');
    else if (k === 'n' || k === 'N') $('#notes').classList.toggle('on');
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
    }
  });
  // evita que Espacio vuelva a «presionar» el último botón clicado
  document.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setTimeout(() => b.blur(), 0); });
  addEventListener('resize', () => { cancelAnimationFrame(raf); cam = overview ? camOverview() : camFor(cur); apply(cam); });

  // ---------- inicio ----------
  if (/[?&]clean/.test(location.search)) document.body.classList.add('clean');
  const hash0 = location.hash;
  const start = scenes.findIndex(s => '#' + s.id === hash0);
  document.body.classList.add('instant');
  go(start >= 0 ? start : 0, 1, true);
  if (hash0 === '#mapa') { setOverview(true, true); cam = camOverview(); apply(cam); }
  setTimeout(() => document.body.classList.remove('instant'), 50);
})();
