/* ─────────────────────────────────────────────────────────
   챡 × 오뜨 사진꾸미기 — 캔버스 엔진
   ───────────────────────────────────────────────────────── */
const Ed = {
  W: 1080, H: 1350,
  ratio: '4:5',
  bg: '#FFFFFF',
  els: [], nextId: 1, selId: null,
  photo: null,           // {img, ew, eh, scale, ox, oy, mode:'cover'|'contain', fill}
  photoMode: false,
  hist: [], fut: [],
  imgCache: {},
  _fitScale: 1
};

const MEASURE = document.createElement('canvas').getContext('2d');
const RATIOS = { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920], orig: [1080, 1350] };

/* ---------- helpers ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => 'e' + (Ed.nextId++);

function fontOf(el) {
  if (el.font === 'emoji') return `${el.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  const w = el.weight ? el.weight + ' ' : '';
  return `${w}${el.size}px "${el.font}", "Pretendard", sans-serif`;
}
function fontOfFamily(fam, size, weight) {
  return `${weight ? weight + ' ' : ''}${size}px "${fam}", "Pretendard", sans-serif`;
}

function strokePad(el) {
  let p = 0;
  if (el.s1 && el.s1.w) p = Math.max(p, el.size * el.s1.w);
  if (el.s2 && el.s2.w) p = Math.max(p, el.size * el.s2.w);
  return p * 0.6;
}
function bgPad(el) { return el.bg && el.bg.pad ? el.size * el.bg.pad : 0; }

function measureText(el) {
  MEASURE.font = fontOf(el);
  const lines = String(el.text == null ? ' ' : el.text).split('\n');
  let tw = 0;
  for (const l of lines) tw = Math.max(tw, MEASURE.measureText(l.length ? l : ' ').width);
  const lh = el.size * (el.lineH || 1.16);
  const th = lh * lines.length;
  const pad = strokePad(el) + bgPad(el);
  return { w: tw + pad * 2, h: th + pad * 2, tw, th, lh, lines, pad };
}

/* 아이메시지 색 */
const IMSG = { red: '#FF4B3E', blue: '#0B84FF', grey: '#8E8E93' };

/* 글씨를 담는 요소(핀치·핸들에서 size를 키운다) */
const TEXTLIKE = ['text', 'bubble', 'thought', 'stack'];
function isTextLike(el) { return !!el && TEXTLIKE.includes(el.type); }

/* 2단 겹친 박스 배치 */
function stackLayout(el) {
  const s = el.size || 44, pad = s * 0.55;
  MEASURE.font = fontOfFamily(el.font || 'Pretendard', s, el.weight);
  const l1 = String(el.text == null ? ' ' : el.text).split('\n');
  let tw1 = 0; l1.forEach(l => tw1 = Math.max(tw1, MEASURE.measureText(l.length ? l : ' ').width));
  const lh1 = s * 1.2, th1 = lh1 * l1.length;
  const s2 = el.size2 || Math.round(s * 0.92);
  MEASURE.font = fontOfFamily(el.font || 'Pretendard', s2, el.weight2 || el.weight);
  const l2 = String(el.text2 == null ? ' ' : el.text2).split('\n');
  let tw2 = 0; l2.forEach(l => tw2 = Math.max(tw2, MEASURE.measureText(l.length ? l : ' ').width));
  const lh2 = s2 * 1.2, th2 = lh2 * l2.length;
  const a1 = tw1 + pad * 2, b1 = th1 + pad * 1.3;
  const a2 = tw2 + pad * 2, b2 = th2 + pad * 1.2;
  const ox = Math.max(a1 * 0.24, s * 1.2), oy = b1 * 0.58;
  const W = Math.max(a1, ox + a2), H = Math.max(b1, oy + b2);
  return { a1, b1, a2, b2, ox, oy, W, H, pad, l1, l2, lh1, lh2, th1, th2, s, s2 };
}

function bubbleMeasure(el) {
  MEASURE.font = fontOf(el);
  const lines = String(el.text == null ? ' ' : el.text).split('\n');
  let tw = 0;
  for (const l of lines) tw = Math.max(tw, MEASURE.measureText(l.length ? l : ' ').width);
  const lh = el.size * (el.lh || 1.2);
  return { lines, tw, th: lh * lines.length, lh };
}

function elSize(el) {
  if (el.type === 'text') return measureText(el);
  if (el.type === 'bubble') {
    const { lines, tw, th, lh } = bubbleMeasure(el);
    if (el.kind === 'starburst') {
      const R = Math.hypot(tw / 2, th / 2) / 0.74 + el.size * 0.24;
      return { w: R * 2, h: R * 2, tw, th, lh, lines, pad: R * 0.5 };
    }
    if (el.kind === 'imsg') {
      const px = el.size * 0.66, py = el.size * 0.5;
      return { w: tw + px * 2 + el.size * 0.3, h: th + py * 2, tw, th, lh, lines, pad: px };
    }
    const px = el.size * (el.padX || 0.55), py = el.size * (el.padY || 0.42);
    return { w: tw + px * 2, h: th + py * 2, tw, th, lh, lines, pad: px };
  }
  if (el.type === 'thought') {
    let tw = 0, th = 0, lh = 0, lines = [];
    if (!el.inner) { const m = bubbleMeasure(el); tw = m.tw; th = m.th; lh = m.lh; lines = m.lines; }
    const minW = el.size * 3.2, minH = el.size * 2.7;
    const w = Math.max(minW, tw + el.size * 2.1);
    const h = Math.max(minH, th + el.size * 1.9);
    return { w, h, tw, th, lh, lines, pad: el.size * 0.5 };
  }
  if (el.type === 'stack') {
    const L = stackLayout(el);
    return { w: L.W, h: L.H, tw: 0, th: 0, lh: 0, lines: [], pad: L.pad };
  }
  return { w: el.w * (el.scale || 1), h: el.h * (el.scale || 1) };
}

function elCorners(el) {
  const { w, h } = elSize(el);
  const c = Math.cos(el.rot || 0), s = Math.sin(el.rot || 0);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([x, y]) => [el.x + x * c - y * s, el.y + x * s + y * c]);
}

function toLocal(el, x, y) {
  const c = Math.cos(-(el.rot || 0)), s = Math.sin(-(el.rot || 0));
  const dx = x - el.x, dy = y - el.y;
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

function hitEl(el, x, y) {
  const { w, h } = elSize(el);
  const p = toLocal(el, x, y);
  const m = 8;
  return Math.abs(p.x) <= w / 2 + m && Math.abs(p.y) <= h / 2 + m;
}

/* ---------- element factories ---------- */
function baseProps() {
  return { rot: 0, scale: 1, opacity: 1, lineH: 1.16 };
}

Ed.addText = function (text, preset, opts) {
  opts = opts || {};
  const st = (preset && preset.st) || (TEXT_PRESETS[0] && TEXT_PRESETS[0].st) || {};
  const scaleRef = this.W / 1080;
  const el = Object.assign(baseProps(), {
    id: uid(), type: 'text', text: text || '크로플',
    font: st.font || 'BM꾸불림체', weight: st.weight || null,
    size: (st.size || 130) * scaleRef, color: st.color || PAL.ink,
    s1: st.s1 ? Object.assign({}, st.s1) : null,
    s2: st.s2 ? Object.assign({}, st.s2) : null,
    shadow: st.shadow ? Object.assign({}, st.shadow) : null,
    bg: st.bg ? Object.assign({}, st.bg) : null,
    hl: st.hl || null,
    x: opts.x != null ? opts.x : this.W / 2,
    y: opts.y != null ? opts.y : this.H / 2,
    presetId: preset ? preset.id : null
  });
  return this.push(el);
};

Ed.addSticker = function (src, natW, natH, opts) {
  opts = opts || {};
  const maxSide = Math.min(this.W, this.H) * (opts.size || 0.34);
  const k = maxSide / Math.max(natW, natH);
  const el = Object.assign(baseProps(), {
    id: uid(), type: 'sticker', src,
    w: natW * k, h: natH * k, scale: 1,
    x: this.W / 2 + (Math.random() * 60 - 30),
    y: this.H / 2 + (Math.random() * 60 - 30),
    shadow: opts.shadow !== false
  });
  return this.push(el);
};

Ed.addBox = function (color, style, opts) {
  opts = opts || {};
  const w = this.W * 0.52, h = this.W * 0.2;
  const el = Object.assign(baseProps(), {
    id: uid(), type: 'box',
    w, h, fill: color,
    x: opts.x != null ? opts.x : this.W / 2,
    y: opts.y != null ? opts.y : this.H / 2,
    style: style || 'solid', bw: 4, bc: PAL.ink,
    text: '', font: 'Pretendard', weight: 800, size: 44 * this.W / 1080, color: PAL.ink,
    alpha: 1
  });
  if (style === 'tape') { el.alpha = 0.72; el.bw = 0; el.rot = -3 * Math.PI / 180; el.h = this.W * 0.1; }
  if (style === 'badge') { el.w = this.W * 0.2; el.h = this.W * 0.075; el.bw = 3; el.fill = color; }
  if (style === 'frame') { el.fill = null; el.bw = 10; el.bc = color; }
  return this.push(el);
};

Ed.addBubble = function (kind, fill, opts) {
  opts = opts || {};
  const el = Object.assign(baseProps(), {
    id: uid(), type: 'bubble', kind: kind || 'wobble',
    text: opts.text || '이거 봐 ✧',
    font: '온글잎 쑴체', weight: null, size: 62 * this.W / 1080,
    color: PAL.ink, fill: fill || PAL.white, bw: 6, bc: PAL.ink,
    x: this.W / 2, y: this.H / 2, seed: Math.floor(Math.random() * 999)
  });
  return this.push(el);
};

/* 3D 폭신 구름 생각풍선 */
Ed.addThought = function (opts) {
  opts = opts || {};
  const k = this.W / 1080;
  const el = Object.assign(baseProps(), {
    id: uid(), type: 'thought',
    text: opts.text || '생각 중...',
    inner: opts.inner || null,          // null | 'emoji' | 'sticker'
    innerEmoji: opts.innerEmoji || '❄️',
    innerSrc: opts.innerSrc || null,
    font: '온글잎 쑴체', weight: null, size: 64 * k,
    color: PAL.ink, fill: '#FFFFFF',
    heart: !!opts.heart, heartColor: '#E5484D',
    x: opts.x != null ? opts.x : this.W / 2,
    y: opts.y != null ? opts.y : this.H / 2,
    lineH: 1.18, seed: Math.floor(Math.random() * 999)
  });
  return this.push(el);
};

/* 2단 겹친 직각 박스 */
Ed.addStack = function (opts) {
  opts = opts || {};
  const k = this.W / 1080;
  const el = Object.assign(baseProps(), {
    id: uid(), type: 'stack',
    text: opts.text || '이거 하고 싶어서',
    text2: opts.text2 || '겨울을 기다렸지',
    font: 'Pretendard', weight: 700, weight2: 700,
    size: 40 * k, size2: 37 * k,
    color: PAL.ink, fill: '#FFFFFF', bc: PAL.ink, bw: 2.6 * k,
    color2: '#FFFFFF', fill2: PAL.ink,
    x: opts.x != null ? opts.x : this.W / 2,
    y: opts.y != null ? opts.y : this.H / 2
  });
  return this.push(el);
};

Ed.addDeco = function (kind, opts) {
  opts = opts || {};
  const def = DECOS.find(d => d.id === kind) || DECOS[0];
  const k = this.W / 1080;
  const el = Object.assign(baseProps(), {
    id: uid(), type: 'deco', kind, text: def.text || '',
    w: def.w * k, h: def.h * k, scale: 1,
    x: this.W / 2, y: this.H / 2,
    fill: kind === 'music' ? PAL.white : (kind === 'badge' ? PAL.lime : null),
    font: 'Pretendard', weight: 700, size: 26 * k, color: PAL.ink,
    seed: Math.floor(Math.random() * 999)
  });
  return this.push(el);
};

Ed.push = function (el) {
  this.els.push(el);
  this.selId = el.id;
  this.snapshot();
  return el;
};

/* ---------- photo ---------- */
Ed.setPhoto = function (img) {
  this.photo = {
    img, ew: img.naturalWidth || img.width, eh: img.naturalHeight || img.height,
    scale: 1, ox: 0, oy: 0, mode: 'cover', fill: PAL.cream
  };
  if (this.ratio === 'orig') {
    const maxH = 1920;
    const w = 1080, h = Math.round(1080 * this.photo.eh / this.photo.ew);
    this.W = w; this.H = Math.min(Math.max(h, 640), maxH);
    if (h > maxH) { this.H = maxH; this.W = Math.round(maxH * this.photo.ew / this.photo.eh); }
  }
  this.render();
};

Ed.setRatio = function (r) {
  this.ratio = r;
  if (r === 'orig' && this.photo) {
    const w = 1080, h = Math.round(1080 * this.photo.eh / this.photo.ew);
    if (h > 1920) { this.H = 1920; this.W = Math.round(1920 * this.photo.ew / this.photo.eh); }
    else if (h < 640) { this.H = 640; this.W = Math.round(640 * this.photo.ew / this.photo.eh); }
    else { this.W = w; this.H = h; }
  } else {
    const [w, h] = RATIOS[r] || RATIOS['4:5'];
    this.W = w; this.H = h;
  }
  // 요소가 화면 밖으로 나가지 않게 중앙 기준 재배치
  this.els.forEach(el => { el.x = clamp(el.x, 0, this.W); el.y = clamp(el.y, 0, this.H); });
  if (this.photo) { this.photo.ox = 0; this.photo.oy = 0; this.photo.scale = 1; }
};

/* ---------- history ---------- */
Ed.snapshot = function () {
  this.hist.push(JSON.stringify(this.els.map(e => Object.assign({}, e))));
  if (this.hist.length > 40) this.hist.shift();
  this.fut.length = 0;
  if (this.onChange) this.onChange();
};
Ed.restore = function (json) {
  this.els = JSON.parse(json);
  this.selId = null;
  this.render();
  if (this.onChange) this.onChange();
};
Ed.undo = function () {
  if (this.hist.length < 2) return;
  const cur = this.hist.pop();
  this.fut.push(cur);
  this.restore(this.hist[this.hist.length - 1]);
};
Ed.redo = function () {
  if (!this.fut.length) return;
  const next = this.fut.pop();
  this.hist.push(next);
  this.restore(next);
};

/* ─────────────── drawing ─────────────── */
function traceSmooth(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

function rrectPoints(w, h, r, N) {
  r = Math.min(r, Math.min(w, h) / 2);
  const pts = [];
  const seg = Math.max(6, Math.round(N / 8));
  const hw = w / 2, hh = h / 2;
  const line = (x0, y0, x1, y1, n) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  };
  const arc = (cx, cy, a0, a1, n) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  line(-hw + r, -hh, hw - r, -hh, seg);
  arc(hw - r, -hh + r, -Math.PI / 2, 0, seg);
  line(hw, -hh + r, hw, hh - r, seg);
  arc(hw - r, hh - r, 0, Math.PI / 2, seg);
  line(hw - r, hh, -hw + r, hh, seg);
  arc(-hw + r, hh - r, Math.PI / 2, Math.PI, seg);
  line(-hw, hh - r, -hw, -hh + r, seg);
  arc(-hw + r, -hh + r, Math.PI, 1.5 * Math.PI, seg);
  return pts;
}

function jitter(pts, amp, seed) {
  const rnd = mulberry32(seed);
  const n = pts.length;
  const raw = Array.from({ length: n }, () => rnd() * 2 - 1);
  const sm = raw.map((_, i) => (raw[(i - 1 + n) % n] + raw[i] * 2 + raw[(i + 1) % n]) / 4);
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
    const nx = -ty / L, ny = tx / L;
    const k = sm[i] * amp + Math.sin(i * 0.8 + seed) * amp * 0.3;
    return [p[0] + nx * k, p[1] + ny * k];
  });
}

function addTail(pts, w, h, size) {
  let best = 0, bd = 1e9;
  const targetX = -w * 0.30;
  pts.forEach((p, i) => {
    if (p[1] < h * 0.3) return;
    const d = Math.abs(p[0] - targetX) + Math.abs(p[1] - h / 2) * 0.5;
    if (d < bd) { bd = d; best = i; }
  });
  const x0 = pts[best][0];
  const tw = w * 0.13, len = h * 0.20;
  const tail = [
    [x0 - tw / 2, h / 2 - 1],
    [x0 - tw * 0.55, h / 2 + len],
    [x0 + tw * 0.55, h / 2 - 1]
  ];
  return pts.slice(0, best + 1).concat(tail, pts.slice(best + 1));
}

function bubblePoints(kind, w, h, seed) {
  let pts;
  if (kind === 'cloud') {
    pts = [];
    const N = 240, bumps = 11;
    for (let i = 0; i < N; i++) {
      const t = i / N * Math.PI * 2;
      const m = 1 + 0.055 * Math.abs(Math.sin(t * bumps / 2));
      pts.push([Math.cos(t) * w / 2 * m * 0.93, Math.sin(t) * h / 2 * m * 0.9]);
    }
    return addTail(pts, w, h, Math.min(w, h));
  }
  if (kind === 'oval') {
    pts = [];
    const N = 160;
    for (let i = 0; i < N; i++) {
      const t = i / N * Math.PI * 2;
      pts.push([Math.cos(t) * w / 2, Math.sin(t) * h / 2]);
    }
    pts = jitter(pts, Math.min(w, h) * 0.006, seed);
    return addTail(pts, w, h, Math.min(w, h));
  }
  if (kind === 'sharp') {
    pts = rrectPoints(w, h, Math.min(w, h) * 0.02, 180);
    pts = jitter(pts, Math.min(w, h) * 0.003, seed);
    return addTail(pts, w, h, Math.min(w, h));
  }
  // wobble — 손그림 삐뚤
  pts = rrectPoints(w, h, Math.min(w, h) * 0.22, 200);
  pts = jitter(pts, Math.min(w, h) * 0.012, seed);
  return addTail(pts, w, h, Math.min(w, h));
}

function paintBubble(ctx, el) {
  const m = elSize(el);
  const pts = bubblePoints(el.kind, m.w, m.h, el.seed || 7);
  traceSmooth(ctx, pts);
  if (el.fill) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,17,14,.16)';
    ctx.shadowBlur = Math.min(m.w, m.h) * 0.05;
    ctx.shadowOffsetY = Math.min(m.w, m.h) * 0.015;
    ctx.fillStyle = el.fill;
    ctx.fill();
    ctx.restore();
  }
  if (el.bw) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = el.bc || PAL.ink;
    ctx.lineWidth = el.bw;
    ctx.stroke();
    // 두 번째 획: 손그림 느낌
    ctx.save();
    ctx.globalAlpha = 0.28;
    const p2 = jitter(pts, Math.min(m.w, m.h) * 0.006, (el.seed || 7) + 31);
    traceSmooth(ctx, p2);
    ctx.lineWidth = el.bw * 0.7;
    ctx.stroke();
    ctx.restore();
  }
  // 글씨
  ctx.font = fontOf(el);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = el.color || PAL.ink;
  m.lines.forEach((line, i) => {
    const y = -m.th / 2 + m.lh / 2 + i * m.lh - el.size * 0.02;
    ctx.fillText(line, 0, y);
  });
}

function paintText(ctx, el) {
  const m = measureText(el);
  // 배경 박스 (직각 기본)
  if (el.bg) {
    const pad = el.size * (el.bg.pad == null ? 0.3 : el.bg.pad);
    const bw = m.tw + pad * 2, bh = m.th + pad * 1.55;
    ctx.save();
    ctx.globalAlpha = (el.bg.a == null ? 1 : el.bg.a);
    ctx.fillStyle = el.bg.c || PAL.lime;
    if (el.bg.r) {
      const r = el.bg.r;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-bw / 2, -bh / 2, bw, bh, r); else ctx.rect(-bw / 2, -bh / 2, bw, bh);
      ctx.fill();
    } else {
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    }
    if (el.bg.bw) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = el.bg.bw;
      ctx.strokeStyle = el.bg.bc || PAL.ink;
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    }
    ctx.restore();
  }
  // 형광 밑줄
  if (el.hl) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = el.hl;
    ctx.fillRect(-m.tw / 2 - el.size * 0.08, m.th / 2 - el.size * 0.22,
      m.tw + el.size * 0.16, el.size * 0.34);
    ctx.restore();
  }
  const lines = m.lines;
  const y0 = -m.th / 2 + m.lh / 2;
  ctx.font = fontOf(el);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 그림자 (글자 뒤)
  if (el.shadow) {
    const sh = el.shadow;
    ctx.save();
    ctx.fillStyle = sh.c;
    ctx.shadowColor = sh.c;
    ctx.shadowBlur = (sh.blur || 0) * el.size;
    ctx.shadowOffsetX = (sh.dx || 0) * el.size;
    ctx.shadowOffsetY = (sh.dy || 0) * el.size;
    lines.forEach((l, i) => ctx.fillText(l, 0, y0 + i * m.lh));
    ctx.restore();
  }
  // 외곽선(굵은 것 → 얇은 것) → 채움
  const strokes = [el.s2, el.s1].filter(s => s && s.w > 0);
  lines.forEach((l, i) => {
    const y = y0 + i * m.lh;
    for (const s of strokes) {
      ctx.strokeStyle = s.c;
      ctx.lineWidth = el.size * s.w;
      ctx.strokeText(l, 0, y);
    }
    ctx.fillStyle = el.color;
    ctx.fillText(l, 0, y);
  });
}

function starPath(ctx, r, points, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / points;
    const rad = i % 2 ? r * inner : r;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function paintDeco(ctx, el) {
  const w = el.w, h = el.h;
  const ink = PAL.ink;
  ctx.textBaseline = 'middle';
  if (el.kind === 'music') {
    ctx.fillStyle = el.fill || PAL.white;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    // 앨범 커버
    const s = h * 0.62, ax = -w / 2 + h * 0.19, ay = -s / 2;
    const g = ctx.createLinearGradient(ax, ay, ax + s, ay + s);
    g.addColorStop(0, PAL.pink); g.addColorStop(1, PAL.lime);
    ctx.fillStyle = g;
    ctx.fillRect(ax, ay, s, s);
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(ax, ay, s, s);
    starPath(ctx, s * 0.24, 5, 0.45);
    ctx.fillStyle = '#fff'; ctx.fill();
    // 텍스트
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    ctx.font = fontOfFamily('Pretendard', h * 0.17, 700);
    ctx.fillText(el.text || '오늘의 BGM', ax + s + h * 0.16, -h * 0.2);
    ctx.font = fontOfFamily('Pretendard', h * 0.12, 400);
    ctx.fillStyle = '#8B8378';
    ctx.fillText('playlist · 01', ax + s + h * 0.16, -h * 0.03);
    // 진행바
    const bx = ax + s + h * 0.16, bw2 = w - (bx + w / 2) - h * 0.2, by = h * 0.24;
    ctx.fillStyle = '#E6E0D3';
    ctx.fillRect(bx, by, bw2, 4);
    ctx.fillStyle = ink;
    ctx.fillRect(bx, by, bw2 * 0.38, 4);
    ctx.beginPath(); ctx.arc(bx + bw2 * 0.38, by + 2, 5, 0, 7); ctx.fill();
    ctx.font = fontOfFamily('Pretendard', h * 0.115, 600);
    ctx.fillStyle = '#8B8378';
    ctx.fillText('00:25', bx, by + h * 0.15);
    ctx.textAlign = 'right';
    ctx.fillText('02:08', bx + bw2, by + h * 0.15);
    ctx.textAlign = 'left';
    // 하트
    ctx.textAlign = 'right';
    ctx.font = fontOfFamily('Pretendard', h * 0.2, 400);
    ctx.fillStyle = PAL.pink;
    ctx.fillText('♥', w / 2 - h * 0.12, -h * 0.2);
    return;
  }
  if (el.kind === 'datetag') {
    ctx.font = fontOfFamily('Pretendard', h * 0.42, 700);
    const tw = ctx.measureText(el.text || '').width;
    const W2 = tw + h * 0.9;
    ctx.fillStyle = ink;
    ctx.fillRect(-W2 / 2, -h / 2, W2, h);
    ctx.fillStyle = PAL.lime;
    ctx.fillRect(-W2 / 2 + h * 0.26, -h * 0.13, h * 0.26, h * 0.26);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(el.text || '', -W2 / 2 + h * 0.72, 0);
    return;
  }
  if (el.kind === 'badge') {
    ctx.fillStyle = el.fill || PAL.lime;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.font = fontOfFamily('Pretendard', h * 0.44, 800);
    ctx.fillText(el.text || 'PLUS', 0, h * 0.02);
    return;
  }
  if (el.kind === 'stamp') {
    const r = Math.min(w, h) / 2;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, 7); ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, 7); ctx.stroke();
    ctx.save();
    ctx.rotate(-0.12);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.font = fontOfFamily('Pretendard', r * 0.26, 800);
    ctx.fillText(el.text || 'TODAY', 0, 0);
    ctx.font = fontOfFamily('Pretendard', r * 0.14, 600);
    ctx.fillText('2026', 0, r * 0.33);
    ctx.restore();
    return;
  }
  if (el.kind === 'sparkle') {
    ctx.fillStyle = ink;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / (n - 1)) * i;
      const r = h * (i % 2 ? 0.2 : 0.34);
      ctx.save(); ctx.translate(x, 0); starPath(ctx, r, 4, 0.22); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w / 2 - w * 0.06, 0); ctx.lineTo(-w / 2 + 4, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2 - 4, 0); ctx.lineTo(w / 2 + w * 0.06, 0); ctx.stroke();
    return;
  }
  if (el.kind === 'tape') {
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = el.fill || PAL.butter;
    const zig = h * 0.16;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2 - zig, 0);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2 + zig, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  if (el.kind === 'arrow') {
    ctx.strokeStyle = ink; ctx.lineWidth = h * 0.05; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h * 0.34);
    ctx.quadraticCurveTo(-w * 0.1, -h * 0.55, w * 0.42, -h * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.42, -h * 0.18);
    ctx.lineTo(w * 0.28, -h * 0.3);
    ctx.moveTo(w * 0.42, -h * 0.18);
    ctx.lineTo(w * 0.26, -h * 0.06);
    ctx.stroke();
    return;
  }
  if (el.kind === 'polaroid') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#E6E0D3';
    ctx.strokeRect(-w / 2 + w * 0.07, -h / 2 + h * 0.06, w * 0.86, h * 0.68);
    ctx.fillStyle = '#9a9488';
    ctx.textAlign = 'center';
    ctx.font = fontOfFamily('Pretendard', h * 0.075, 500);
    ctx.fillText('photo', 0, -h / 2 + h * 0.4);
    ctx.fillStyle = ink;
    ctx.font = fontOfFamily('고운바탕', h * 0.075);
    ctx.fillText(el.text || '', 0, h / 2 - h * 0.12);
    return;
  }
}

function paintEl(ctx, el) {
  if (el.type === 'text') paintText(ctx, el);
  else if (el.type === 'bubble') paintBubble(ctx, el);
  else if (el.type === 'box') {
    ctx.save();
    ctx.globalAlpha = el.alpha == null ? 1 : el.alpha;
    if (el.fill) { ctx.fillStyle = el.fill; ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h); }
    if (el.bw) {
      ctx.strokeStyle = el.bc || PAL.ink;
      ctx.lineWidth = el.bw;
      if (el.style === 'dashed') ctx.setLineDash([el.bw * 3, el.bw * 2]);
      if (el.style === 'double') {
        ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
        ctx.lineWidth = Math.max(1.5, el.bw * 0.4);
        ctx.strokeRect(-el.w / 2 + el.bw * 1.6, -el.h / 2 + el.bw * 1.6, el.w - el.bw * 3.2, el.h - el.bw * 3.2);
      } else {
        ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
      }
    }
    ctx.restore();
    if (el.text) {
      ctx.fillStyle = el.color || PAL.ink;
      ctx.font = fontOfFamily(el.font || 'Pretendard', el.size || 44, el.weight);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = String(el.text).split('\n');
      const lh = (el.size || 44) * 1.2;
      lines.forEach((l, i) => ctx.fillText(l, 0, -((lines.length - 1) * lh) / 2 + i * lh));
    }
  } else if (el.type === 'deco') {
    paintDeco(ctx, el);
  } else if (el.type === 'sticker') {
    const img = Ed.imgCache[el.src];
    if (img && (img.complete || img.naturalWidth)) {
      const w = el.w * el.scale, h = el.h * el.scale;
      if (el.shadow) {
        ctx.save();
        ctx.shadowColor = 'rgba(20,17,14,.22)';
        ctx.shadowBlur = Math.min(w, h) * 0.05;
        ctx.shadowOffsetY = Math.min(w, h) * 0.02;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.strokeStyle = '#ccc'; ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
    }
  }
}

Ed.drawPhoto = function (ctx, W, H) {
  const p = this.photo;
  if (!p) {
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const base = p.mode === 'cover' ? Math.max(W / p.ew, H / p.eh) : Math.min(W / p.ew, H / p.eh);
  const k = base * p.scale;
  const dw = p.ew * k, dh = p.eh * k;
  const dx = (W - dw) / 2 + p.ox, dy = (H - dh) / 2 + p.oy;
  ctx.fillStyle = p.fill || this.bg;
  ctx.fillRect(0, 0, W, H);
  if (p.mode === 'contain') {
    // 여백을 사진 흐림으로
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(p.img, 0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(p.img, dx, dy, dw, dh);
};

Ed.drawScene = function (ctx, W, H, opt) {
  opt = opt || {};
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  this.drawPhoto(ctx, W, H);
  for (const el of this.els) {
    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate(el.rot || 0);
    ctx.globalAlpha = el.opacity == null ? 1 : el.opacity;
    paintEl(ctx, el);
    ctx.restore();
  }
  if (opt.overlay) this.drawSelection(ctx);
  ctx.restore();
};

Ed.drawSelection = function (ctx) {
  const el = this.els.find(e => e.id === this.selId);
  if (!el) return;
  const m = elSize(el);
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rot || 0);
  ctx.strokeStyle = PAL.pink;
  ctx.lineWidth = 3 * (this.W / 1080) * 1.2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(-m.w / 2, -m.h / 2, m.w, m.h);
  ctx.setLineDash([]);
  // ✕ 삭제 버튼 (좌측 상단)
  const r = 22 * this.W / 1080;
  ctx.beginPath();
  ctx.arc(-m.w / 2, -m.h / 2, r, 0, 7);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = PAL.ink;
  ctx.font = fontOfFamily('Pretendard', r * 1.25, 700);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✕', -m.w / 2, -m.h / 2 + 1);
  // 크기·회전 핸들 (우측 하단)
  const hx = m.w / 2, hy = m.h / 2;
  ctx.beginPath();
  ctx.rect(hx - r * 0.8, hy - r * 0.8, r * 1.6, r * 1.6);
  ctx.fillStyle = PAL.lime; ctx.fill();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
  Ed._selBox = { el, m, r };
};

Ed.hitHandle = function (x, y) {
  const el = this.els.find(e => e.id === this.selId);
  if (!el) return null;
  const m = elSize(el);
  const r = 22 * this.W / 1080;
  const p = toLocal(el, x, y);
  if (Math.hypot(p.x + m.w / 2, p.y + m.h / 2) < r * 1.5) return 'del';
  if (Math.abs(p.x - m.w / 2) < r * 1.3 && Math.abs(p.y - m.h / 2) < r * 1.3) return 'handle';
  return null;
};

Ed.render = function () {
  const cv = document.getElementById('cv');
  if (cv.width !== this.W || cv.height !== this.H) { cv.width = this.W; cv.height = this.H; }
  const ctx = cv.getContext('2d');
  this.drawScene(ctx, this.W, this.H, { overlay: true });
  if (this.onRender) this.onRender();
};

/* ---------- export ---------- */
Ed.exportCanvas = function (factor) {
  const cv = document.createElement('canvas');
  const W = Math.round(this.W * factor), H = Math.round(this.H * factor);
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.scale(factor, factor);
  this.drawScene(ctx, this.W, this.H, { overlay: false });
  return cv;
};
