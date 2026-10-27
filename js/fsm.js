/* 
   Motor mínimo para dibujar y animar autómatas en SVG
   + utilidades compartidas por todas las escenas
    */
const NS = 'http://www.w3.org/2000/svg';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* Registro de escenas: cada escena puede definir enter/leave/next/prev */
const Escenas = {
  reg: {},
  register(id, handlers) { this.reg[id] = handlers; },
};

/* Corre una animación cancelable: cada escena guarda su "token" de ejecución */
class Runner {
  constructor() { this.id = 0; }
  start() { return ++this.id; }
  stop() { this.id++; }
  alive(id) { return id === this.id; }
}

class FSM {
  /* def = { viewBox, r, font, states:[{id,x,y,label,start,accept,dead,cls,sub,r}],
             edges:[{from,to,label,bend,loop,t,dx,dy,eps,h}] } */
  constructor(svg, def) {
    this.svg = typeof svg === 'string' ? document.getElementById(svg) : svg;
    this.def = def;
    this.r = def.r || 26;
    this.font = def.font || 15;
    this.labelFont = def.labelFont || 14;
    this.render();
  }

  state(id) { return this.def.states.find(s => s.id === id); }
  rOf(s) { return s.r || this.r; }

  render() {
    const svg = this.svg;
    svg.innerHTML = '';
    svg.classList.add('fsm');
    if (this.def.viewBox) svg.setAttribute('viewBox', this.def.viewBox);
    this.gEdges = svgEl('g', { class: 'edges' }, svg);
    this.gNodes = svgEl('g', { class: 'nodes' }, svg);
    this.gFx = svgEl('g', { class: 'fx' }, svg);
    this.nodes = {};
    this.edges = {};
    for (const e of this.def.edges) this.drawEdge(e);
    for (const s of this.def.states) this.drawNode(s);
  }

  drawNode(s) {
    const r = this.rOf(s);
    const cls = ['node', s.accept && 'accept', s.dead && 'dead', s.cls].filter(Boolean).join(' ');
    const g = svgEl('g', { class: cls, transform: `translate(${s.x},${s.y})` }, this.gNodes);
    svgEl('circle', { class: 'halo', r: r + 8 }, g);
    svgEl('circle', { class: 'main', r }, g);
    if (s.accept) svgEl('circle', { class: 'ring', r: r - 5 }, g);
    if (s.start) {
      const a = ((s.startAngle ?? 180) * Math.PI) / 180;
      const ux = Math.cos(a), uy = Math.sin(a);
      const p0 = [ux * (r + 38), uy * (r + 38)], p1 = [ux * (r + 3), uy * (r + 3)];
      svgEl('path', { class: 'start-arrow', d: `M${p0} L${p1}` }, g);
      svgEl('polygon', { class: 'start-head', points: this.headPts(p1, [-ux, -uy]) }, g);
    }
    const t = svgEl('text', { class: 'nlabel', 'font-size': s.font || this.font, dy: '.35em' }, g);
    t.textContent = s.label ?? s.id;
    if (s.sub) {
      const st = svgEl('text', { class: 'nsub', y: s.subY ?? r + 20, x: s.subX ?? 0, 'font-size': s.subFont || 13 }, g);
      st.style.textAnchor = s.subAnchor || 'middle';
      st.textContent = s.sub;
    }
    this.nodes[s.id] = g;
  }

  headPts(tip, u, len = 12, w = 6) {
    const px = -u[1], py = u[0];
    const bx = tip[0] - u[0] * len, by = tip[1] - u[1] * len;
    return `${tip[0]},${tip[1]} ${bx + px * w},${by + py * w} ${bx - px * w},${by - py * w}`;
  }

  drawEdge(e) {
    const a = this.state(e.from), b = this.state(e.to);
    const g = svgEl('g', { class: 'edge' + (e.eps ? ' eps' : '') + (e.cls ? ' ' + e.cls : '') }, this.gEdges);
    const norm = (x, y) => { const L = Math.hypot(x, y) || 1; return [x / L, y / L]; };
    let d, lx, ly, tip, tan;
    if (a === b) {
      const ra = this.rOf(a), dir = ((e.loop ?? -90) * Math.PI) / 180, sp = 0.5, h = e.h || ra * 2 + 22;
      const p1 = [a.x + ra * Math.cos(dir - sp), a.y + ra * Math.sin(dir - sp)];
      const p2 = [a.x + ra * Math.cos(dir + sp), a.y + ra * Math.sin(dir + sp)];
      const c1 = [a.x + (ra + h) * Math.cos(dir - sp * 1.5), a.y + (ra + h) * Math.sin(dir - sp * 1.5)];
      const c2 = [a.x + (ra + h) * Math.cos(dir + sp * 1.5), a.y + (ra + h) * Math.sin(dir + sp * 1.5)];
      d = `M${p1} C${c1} ${c2} ${p2}`;
      lx = (p1[0] + 3 * c1[0] + 3 * c2[0] + p2[0]) / 8 + Math.cos(dir) * 8;
      ly = (p1[1] + 3 * c1[1] + 3 * c2[1] + p2[1]) / 8 + Math.sin(dir) * 8;
      tip = p2;
      tan = norm(p2[0] - c2[0], p2[1] - c2[1]);
    } else {
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
      const nx = -dy / L, ny = dx / L, bend = e.bend ?? 0;
      const cx = (a.x + b.x) / 2 + nx * bend, cy = (a.y + b.y) / 2 + ny * bend;
      const u1 = norm(cx - a.x, cy - a.y), u2 = norm(cx - b.x, cy - b.y);
      const ra = this.rOf(a), rb = this.rOf(b);
      const s = [a.x + u1[0] * ra, a.y + u1[1] * ra];
      const t = [b.x + u2[0] * (rb + 1), b.y + u2[1] * (rb + 1)];
      d = `M${s} Q${cx},${cy} ${t}`;
      const k = e.t ?? 0.5;
      lx = (1 - k) ** 2 * s[0] + 2 * (1 - k) * k * cx + k * k * t[0];
      ly = (1 - k) ** 2 * s[1] + 2 * (1 - k) * k * cy + k * k * t[1];
      tip = t;
      tan = norm(t[0] - cx, t[1] - cy);
    }
    const path = svgEl('path', { class: 'line', d }, g);
    svgEl('polygon', { class: 'head', points: this.headPts(tip, tan) }, g);
    if (e.label) {
      const fs = e.font || this.labelFont;
      const lines = String(e.label).split('\n');
      const w = Math.max(...lines.map(l => [...l].length)) * fs * 0.62 + 12;
      const hh = lines.length * fs * 1.25 + 6;
      const gx = lx + (e.dx || 0), gy = ly + (e.dy || 0);
      const lg = svgEl('g', { class: 'elabel', transform: `translate(${gx},${gy})` }, g);
      svgEl('rect', { x: -w / 2, y: -hh / 2, width: w, height: hh, rx: 7 }, lg);
      lines.forEach((ln, i) => {
        const tt = svgEl('text', { 'font-size': fs, y: (i - (lines.length - 1) / 2) * fs * 1.25 }, lg);
        tt.textContent = ln;
      });
    }
    this.edges[e.from + '>' + e.to] = { g, path, e };
  }

  setActive(ids, cls = 'active') {
    const set = new Set([].concat(ids ?? []));
    for (const id in this.nodes) this.nodes[id].classList.toggle(cls, set.has(id));
  }
  mark(id, cls, on = true) { this.nodes[id]?.classList.toggle(cls, on); }
  clear(...classes) {
    for (const id in this.nodes) this.nodes[id].classList.remove(...classes);
    for (const k in this.edges) this.edges[k].g.classList.remove('hot', 'cyan');
  }
  edgeMark(from, to, cls, on = true) { this.edges[from + '>' + to]?.g.classList.toggle(cls, on); }
  flash(from, to, ms = 650) {
    const ed = this.edges[from + '>' + to];
    if (!ed) return;
    ed.g.classList.add('hot');
    clearTimeout(ed.timer);
    ed.timer = setTimeout(() => ed.g.classList.remove('hot'), ms);
  }
  /* mueve un punto brillante por la arista */
  travel(from, to, dur = 450) {
    const ed = this.edges[from + '>' + to];
    if (!ed) return Promise.resolve();
    this.flash(from, to, dur + 350);
    const len = ed.path.getTotalLength();
    const dot = svgEl('circle', { class: 'dot', r: 7 }, this.gFx);
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        const p = ed.path.getPointAtLength(len * e);
        dot.setAttribute('cx', p.x);
        dot.setAttribute('cy', p.y);
        if (k < 1) requestAnimationFrame(step);
        else { dot.remove(); res(); }
      };
      requestAnimationFrame(step);
    });
  }
  /* mostrar / ocultar estados y aristas (para construir paso a paso) */
  show(nodeIds = [], edgeKeys = [], on = true) {
    nodeIds.forEach(id => this.nodes[id]?.classList.toggle('hid', !on));
    edgeKeys.forEach(k => this.edges[k]?.g.classList.toggle('hid', !on));
  }
  hideAll() {
    for (const id in this.nodes) this.nodes[id].classList.add('hid');
    for (const k in this.edges) this.edges[k].g.classList.add('hid');
  }
}
