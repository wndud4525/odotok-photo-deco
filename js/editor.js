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
  const s = el.size || 44, pad = s * 0.62;
  MEASURE.font = fontOfFamily(el.font || 'Pretendard', s, el.weight);
  const l1 = String(el.text == null ? ' ' : el.text).split('\n');
  let tw1 = 0; l1.forEach(l => tw1 = Math.max(tw1, MEASURE.measureText(l.length ? l : ' ').width));
  const lh1 = s * 1.2, th1 = lh1 * l1.length;
  const s2 = el.size2 || Math.round(s * 0.92);
  MEASURE.font = fontOfFamily(el.font || 'Pretendard', s2, el.weight2 || el.weight);
  const l2 = String(el.text2 == null ? ' ' : el.text2).split('\n');
  let tw2 = 0; l2.forEach(l => tw2 = Math.max(tw2, MEASURE.measureText(l.length ? l : ' ').width));
  const lh2 = s2 * 1.2, th2 = lh2 * l2.length;
  const a1 = tw1 + pad * 2, b1 = th1 + pad * 1.9;
  const a2 = tw2 + pad * 2, b2 = th2 + pad * 1.7;
  const ox = Math.max(a1 * 0.44, s * 1.1), oy = b1 * 0.74;
  const W = Math.max(a1, ox + a2), H = Math.max(b1, oy + b2);
  return { a1, b1, a2, b2, ox, oy, W, H, pad, l1, l2, lh1, lh2, th1, th2, s, s2 };
}

/* 생각풍선 글씨 자동 줄바꿈 */
function wrapThought(text, maxW, font) {
  MEASURE.font = font;
  const out = [];
  for (const par of String(text == null ? ' ' : text).split('\n')) {
    let line = '';
    for (const ch of par) {
      const cand = line + ch;
      if (line && MEASURE.measureText(cand).width > maxW) {
        if (ch === ' ') { out.push(line); line = ''; continue; }
        const sp = line.lastIndexOf(' ');
        if (sp > 0) { out.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; }
        else { out.push(line); line = ch; }
      } else line = cand;
    }
    out.push(line);
  }
  return out.length ? out : [' '];
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
    const s = el.size;
    const font = fontOf(el);
    if (el.inner) {
      return { w: s * 4.2, h: s * 3.2, tw: s * 3, th: s * 1.4, lh: s * 1.2, lines: [' '], pad: s * 0.5 };
    }
    MEASURE.font = font;
    const rawLines = String(el.text == null ? ' ' : el.text).split('\n');
    let tw0 = 0;
    for (const l of rawLines) tw0 = Math.max(tw0, MEASURE.measureText(l.length ? l : ' ').width);
    let innerW, lines;
    if (tw0 <= s * 4.6) {
      innerW = Math.max(tw0, s * 1.6);
      lines = rawLines.map(l => l.length ? l : ' ');
    } else {
      innerW = s * 5.2;
      lines = wrapThought(el.text, innerW, font);
    }
    const w = Math.max(s * 3.6, innerW / 0.62);
    const lh = s * (el.lineH || 1.2);
    const th = lh * lines.length;
    const h = Math.max(s * 3.25, th / 0.54 + s * 0.55);
    return { w, h, tw: innerW, th, lh, lines, pad: s * 0.5 };
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
    font: '온글잎 쑴체', weight: null, size: 110 * k,
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
const PHOTO_MAX = 1600;

/* 사진 작업본(최대 1800px) 만들기 */
Ed.buildBase = function () {
  const p = this.photo; if (!p) return;
  const k = Math.min(1, PHOTO_MAX / Math.max(p.ew, p.eh, 1));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(p.ew * k));
  c.height = Math.max(1, Math.round(p.eh * k));
  c.getContext('2d').drawImage(p.img, 0, 0, c.width, c.height);
  p.base = c;
};

Ed.setPhoto = function (img, opts) {
  opts = opts || {};
  this.photo = {
    img, ew: img.naturalWidth || img.width, eh: img.naturalHeight || img.height,
    scale: opts.scale || 1, ox: 0, oy: 0, mode: opts.mode || 'cover', fill: PAL.cream,
    adj: Object.assign({ brightness: 100, contrast: 100, saturate: 100, warmth: 0, lift: 0, tint: null }, opts.adj || {}),
    cut: null, scene: null, proc: null, hasAlpha: !!opts.hasAlpha,
    frame: opts.frame || this.frameDefault || null
  };
  if (opts.frame !== undefined) this.photo.frame = opts.frame;
  this.buildBase();
  if (opts.cut) { this.photo.cut = opts.cut; }
  if (opts.scene) { this.photo.scene = opts.scene; this.photo.mode = 'contain'; }
  if (this.ratio === 'orig') {
    const maxH = 1920;
    const w = 1080, h = Math.round(1080 * this.photo.eh / this.photo.ew);
    this.W = w; this.H = Math.min(Math.max(h, 640), maxH);
    if (h > maxH) { this.H = maxH; this.W = Math.round(maxH * this.photo.ew / this.photo.eh); }
  }
  this.processPhoto();
  this.render();
};

/* 보정 적용 (ctx.filter 미사용 — 픽셀 연산, iOS Safari에서도 내보내기와 동일) */
Ed.applyAdj = function (patch) {
  const p = this.photo; if (!p) return;
  Object.assign(p.adj, patch);
  this.processPhoto();
};

Ed.processPhoto = function (fast) {
  const p = this.photo; if (!p) return;
  let srcC = p.cut || p.base;
  if (!srcC) { p.proc = null; return; }
  // 슬라이더 드래그 중에는 축소본으로 빠르게, 손을 떼면 원본 크기로
  if (fast) {
    if (!p._small || p._smallFrom !== srcC) {
      const k2 = Math.min(1, 720 / Math.max(srcC.width, srcC.height));
      const sc = document.createElement('canvas');
      sc.width = Math.max(1, Math.round(srcC.width * k2));
      sc.height = Math.max(1, Math.round(srcC.height * k2));
      sc.getContext('2d').drawImage(srcC, 0, 0, sc.width, sc.height);
      p._small = sc; p._smallFrom = srcC;
    }
    srcC = p._small;
  } else {
    p._small = null; p._smallFrom = null;
  }
  const a = p.adj || {};
  const b = a.brightness == null ? 100 : a.brightness;
  const ct = a.contrast == null ? 100 : a.contrast;
  const sa = a.saturate == null ? 100 : a.saturate;
  const wm = a.warmth == null ? 0 : a.warmth;
  const lift = a.lift || 0;
  const tint = a.tint || null;
  const flat = (b === 100 && ct === 100 && sa === 100 && wm === 0 && !lift && !tint);
  if (flat) { p.proc = null; p.pw = srcC.width; p.ph = srcC.height; return; }

  const w = srcC.width, h = srcC.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(srcC, 0, 0);
  let img;
  try { img = ctx.getImageData(0, 0, w, h); } catch (e) { p.proc = null; return; }
  const px = img.data;
  // 밝기 + 대비 LUT
  const f = (259 * ((ct - 100) * 1.28 + 255)) / (255 * (259 - (ct - 100) * 1.28));
  const add = (b - 100) * 1.7;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = f * (v + add - 128) + 128;
  const sat = sa / 100, wR = wm * 0.30, wG = wm * 0.10, wB = -wm * 0.30;
  const doSat = sat !== 1, doWm = wm !== 0, doLift = lift !== 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    let r = lut[px[i]], g = lut[px[i + 1]], bl = lut[px[i + 2]];
    if (doSat) {
      const gy = 0.299 * r + 0.587 * g + 0.114 * bl;
      r = gy + (r - gy) * sat; g = gy + (g - gy) * sat; bl = gy + (bl - gy) * sat;
    }
    if (doWm) { r += wR; g += wG; bl += wB; }
    if (doLift) { r += lift; g += lift; bl += lift; }
    px[i] = r; px[i + 1] = g; px[i + 2] = bl;
  }
  ctx.putImageData(img, 0, 0);
  if (tint && tint.c) {
    ctx.save();
    ctx.globalCompositeOperation = tint.mode || 'soft-light';
    ctx.globalAlpha = tint.a == null ? 0.16 : tint.a;
    ctx.fillStyle = tint.c;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  p.proc = c; p.pw = w; p.ph = h;
};

/* 배경 지우기(누끼) — 테두리 색 기반 flood fill + 지역 기울기 허용 */
Ed.makeCut = function (tolerance) {
  const p = this.photo;
  if (!p || !p.base) return { ok: false, reason: 'nophoto' };
  const w = p.base.width, h = p.base.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(p.base, 0, 0);
  let img;
  try { img = g.getImageData(0, 0, w, h); } catch (e) { return { ok: false, reason: 'blocked' }; }
  const px = img.data;
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.006));
  // 테두리 색 팔레트 (그라데이션 배경도 여러 색으로 잡기)
  const buckets = new Map();
  const addSample = (x, y) => {
    const i = (y * w + x) * 4;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    let o = buckets.get(key);
    if (!o) { o = { r: 0, g: 0, b: 0, n: 0 }; buckets.set(key, o); }
    o.r += r; o.g += g; o.b += b; o.n++;
  };
  for (let y = 0; y < band; y++) for (let x = 0; x < w; x += 2) addSample(x, y);
  for (let y = h - band; y < h; y++) for (let x = 0; x < w; x += 2) addSample(x, y);
  for (let x = 0; x < band; x++) for (let y = 0; y < h; y += 2) addSample(x, y);
  for (let x = w - band; x < w; x++) for (let y = 0; y < h; y += 2) addSample(x, y);
  const pal = Array.from(buckets.values())
    .sort((a, b2) => b2.n - a.n).slice(0, 8)
    .map(o => ({ r: o.r / o.n, g: o.g / o.n, b: o.b / o.n }));
  const tol = Math.max(6, tolerance == null ? 45 : tolerance);
  const tolLocal = tol * 0.26;
  const distPal = (r, g, b) => {
    let best = 1e9;
    for (const c of pal) {
      const d = Math.hypot(r - c.r, g - c.g, b - c.b);
      if (d < best) best = d;
    }
    return best;
  };
  const visited = new Uint8Array(w * h);
  const stack = [];
  const seed = (i) => { if (!visited[i]) { visited[i] = 1; stack.push(i, px[i * 4], px[i * 4 + 1], px[i * 4 + 2]); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  let removed = 0;
  while (stack.length) {
    const rb = stack.pop(), rg2 = stack.pop(), rr = stack.pop(), i = stack.pop();
    const o = i * 4;
    const pr = px[o], pg = px[o + 1], pb = px[o + 2];
    const dP = distPal(pr, pg, pb);
    const dL = Math.hypot(pr - rr, pg - rg2, pb - rb);
    if (!(dP < tol || (dP < tol * 1.5 && dL < tolLocal))) continue;
    px[o + 3] = 0;
    removed++;
    const x = i % w, y = (i / w) | 0;
    const nxt = (j) => { if (!visited[j]) { visited[j] = 1; stack.push(j, pr, pg, pb); } };
    if (x > 0) nxt(i - 1);
    if (x < w - 1) nxt(i + 1);
    if (y > 0) nxt(i - w);
    if (y < h - 1) nxt(i + w);
  }
  const frac = removed / (w * h);
  if (frac < 0.015) return { ok: false, reason: 'nothing' };
  if (frac > 0.94) return { ok: false, reason: 'toomuch' };
  // 가장자리 살짝 부드럽게 (알파 1px 평균)
  const a0 = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) a0[i] = px[i * 4 + 3];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (a0[i] === 0) continue;
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= w) continue;
          sum += a0[yy * w + xx]; cnt++;
        }
      }
      px[i * 4 + 3] = sum / cnt;
    }
  }
  g.putImageData(img, 0, 0);
  return { ok: true, canvas: c, frac };
};

/* 다크 배경(매트 블랙 / 다크 우드) */
const _sceneCache = {};
function sceneCanvas(W, H, kind) {
  const key = `${W}x${H}|${kind}`;
  if (_sceneCache[key]) return _sceneCache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (kind === 'wood') {
    g.fillStyle = '#2B211A'; g.fillRect(0, 0, W, H);
    const rnd = mulberry32(20771);
    for (let i = 0; i < 260; i++) {
      const y = rnd() * H;
      const amp = 1.5 + rnd() * 7;
      const len = W * 0.45 + rnd() * W * 0.7;
      const x0 = -W * 0.15 + rnd() * W * 0.35;
      const light = rnd() > 0.45;
      g.strokeStyle = light
        ? `rgba(${74 + rnd() * 26 | 0},${54 + rnd() * 18 | 0},${38 + rnd() * 14 | 0},${0.05 + rnd() * 0.16})`
        : `rgba(${8 + rnd() * 14 | 0},${6 + rnd() * 10 | 0},${4 + rnd() * 8 | 0},${0.07 + rnd() * 0.2})`;
      g.lineWidth = 0.6 + rnd() * 2.4;
      g.beginPath();
      for (let x = 0; x <= len; x += 14) {
        const yy = y + Math.sin(x * 0.0055 + i) * amp + Math.sin(x * 0.02 + i * 0.6) * 1.4;
        x ? g.lineTo(x0 + x, yy) : g.moveTo(x0 + x, yy);
      }
      g.stroke();
    }
    // 은은한 광원
    const rg = g.createRadialGradient(W * 0.5, H * 0.34, Math.min(W, H) * 0.05, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
    rg.addColorStop(0, 'rgba(120,92,66,.20)');
    rg.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = '#0A0A0B'; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W * 0.5, H * 0.40, Math.min(W, H) * 0.05, W * 0.5, H * 0.52, Math.max(W, H) * 0.72);
    rg.addColorStop(0, 'rgba(46,46,49,.62)');
    rg.addColorStop(0.55, 'rgba(18,18,20,.30)');
    rg.addColorStop(1, 'rgba(0,0,0,.72)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  _sceneCache[key] = c;
  return c;
}

Ed.setScene = function (kind) {
  const p = this.photo; if (!p) return;
  p.scene = kind || null;
  if (p.scene) { p.mode = 'contain'; p.scale = 0.88; p.ox = 0; p.oy = 0; }
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

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.72);
  ctx.bezierCurveTo(x - s * 1.15, y - s * 0.05, x - s * 0.55, y - s * 0.95, x, y - s * 0.38);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.95, x + s * 1.15, y - s * 0.05, x, y + s * 0.72);
  ctx.closePath();
}

/* ── 삐죽삐죽 폭발 말풍선 ── */
function starBubblePts(w, h, spikes, inner) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / spikes;
    const k = i % 2 ? inner : 1;
    pts.push([Math.cos(a) * w / 2 * k, Math.sin(a) * h / 2 * k]);
  }
  return pts;
}
function tracePoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function paintStarburst(ctx, el, m) {
  const spikes = el.spikes || 16;
  const pts = starBubblePts(m.w, m.h, spikes, 0.82);
  tracePoly(ctx, pts);
  if (el.fill) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,17,14,.13)';
    ctx.shadowBlur = Math.min(m.w, m.h) * 0.045;
    ctx.shadowOffsetY = Math.min(m.w, m.h) * 0.012;
    ctx.fillStyle = el.fill;
    ctx.fill();
    ctx.restore();
  }
  if (el.bw) {
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = el.bc || PAL.ink;
    ctx.lineWidth = el.bw;
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.22;
    const p2 = pts.map((p, i) => [p[0] * (1 + 0.012 * Math.sin(i * 2.1 + (el.seed || 3))),
      p[1] * (1 + 0.012 * Math.cos(i * 1.7 + (el.seed || 3)))]);
    tracePoly(ctx, p2);
    ctx.lineWidth = el.bw * 0.6;
    ctx.stroke();
    ctx.restore();
  }
  drawBubbleText(ctx, el, m);
}

/* ── 아이메시지 말풍선 ── */
function paintImsg(ctx, el, m) {
  const fill = el.fill || IMSG.blue;
  const tailW = m.h * 0.20;
  const w = m.w - tailW;
  const h = m.h;
  const r = Math.min(h * 0.46, w * 0.5);
  ctx.save();
  ctx.shadowColor = 'rgba(20,17,14,.14)';
  ctx.shadowBlur = h * 0.14;
  ctx.shadowOffsetY = h * 0.05;
  ctx.fillStyle = fill;
  roundRectPath(ctx, -m.w / 2 + tailW, -h / 2, w, h, r);
  ctx.fill();
  ctx.restore();
  const x0 = -m.w / 2 + tailW + r * 0.45;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x0, h / 2 - r * 0.62);
  ctx.quadraticCurveTo(x0 - h * 0.20, h / 2 + h * 0.10, x0 + r * 0.72, h * 0.44);
  ctx.quadraticCurveTo(x0 + r * 0.30, h / 2 - r * 0.34, x0, h / 2 - r * 0.62);
  ctx.closePath();
  ctx.fill();
  drawBubbleText(ctx, el, m, tailW * 0.5);
}

/* 말풍선 글씨 공통 */
function drawBubbleText(ctx, el, m, dx) {
  ctx.font = fontOf(el);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = el.color || PAL.ink;
  const x = dx || 0;
  m.lines.forEach((line, i) => {
    const y = -m.th / 2 + m.lh / 2 + i * m.lh - el.size * 0.02;
    if (el.s1 && el.s1.w) { ctx.strokeStyle = el.s1.c; ctx.lineWidth = el.size * el.s1.w; ctx.strokeText(line, x, y); }
    ctx.fillText(line, x, y);
  });
}

/* ── 3D 폭신 구름 생각풍선 ── */
const _cloudCache = {};
function thoughtSprite(w, h, seed) {
  const key = [Math.round(w), Math.round(h), seed].join('|');
  if (_cloudCache[key]) return _cloudCache[key];
  const c = document.createElement('canvas');
  c.width = Math.max(16, Math.round(w)); c.height = Math.max(16, Math.round(h));
  const g = c.getContext('2d');
  const cx = w * 0.5, cy = h * 0.44, rx = w * 0.445, ry = h * 0.375;
  const minR = Math.min(rx, ry);
  const rnd = mulberry32((seed || 3) * 977 + 13);
  const circles = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2;
    circles.push([
      cx + Math.cos(t) * rx * 0.58,
      cy + Math.sin(t) * ry * 0.58,
      minR * (0.46 + 0.10 * rnd())
    ]);
  }
  circles.push([cx, cy, minR * 0.74]);
  // 1) 실루엣 union(한 번에 채우기) + 부드러운 그림자
  g.save();
  g.shadowColor = 'rgba(132,124,112,.40)';
  g.shadowBlur = minR * 0.42;
  g.shadowOffsetY = minR * 0.14;
  g.fillStyle = '#fff';
  g.beginPath();
  for (const [x, y, r] of circles) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); }
  g.fill();
  g.restore();
  // 2) 3D 음영 (구름 내부에만)
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const rg = g.createRadialGradient(cx - rx * 0.34, cy - ry * 0.46, minR * 0.06, cx, cy, Math.max(rx, ry) * 1.15);
  rg.addColorStop(0, 'rgba(255,255,255,0)');
  rg.addColorStop(0.42, 'rgba(246,244,240,0)');
  rg.addColorStop(0.75, 'rgba(214,208,197,.32)');
  rg.addColorStop(1, 'rgba(178,170,158,.70)');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  const lg = g.createLinearGradient(0, cy + ry * 0.10, 0, cy + ry);
  lg.addColorStop(0, 'rgba(255,255,255,0)');
  lg.addColorStop(1, 'rgba(168,160,148,.42)');
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  const hg = g.createRadialGradient(cx - rx * 0.32, cy - ry * 0.52, 0, cx - rx * 0.32, cy - ry * 0.52, minR * 0.95);
  hg.addColorStop(0, 'rgba(255,255,255,.98)');
  hg.addColorStop(0.55, 'rgba(255,255,255,.35)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hg; g.fillRect(0, 0, w, h);
  g.restore();
  // 3) 왼쪽 아래 작은 구름 방울
  const pr = minR * 0.19, px = w * 0.20, py = h * 0.90;
  g.save();
  g.shadowColor = 'rgba(140,133,122,.40)'; g.shadowBlur = pr * 0.55; g.shadowOffsetY = pr * 0.20;
  g.beginPath(); g.arc(px, py, pr, 0, 7); g.fillStyle = '#fff'; g.fill();
  g.restore();
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const pg = g.createRadialGradient(px - pr * 0.38, py - pr * 0.45, pr * 0.10, px, py, pr * 1.15);
  pg.addColorStop(0, 'rgba(255,255,255,1)');
  pg.addColorStop(0.58, 'rgba(248,246,242,.30)');
  pg.addColorStop(1, 'rgba(184,177,166,.62)');
  g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
  g.restore();
  _cloudCache[key] = c;
  return c;
}

function paintThought(ctx, el, m) {
  const w = m.w, h = m.h;
  ctx.drawImage(thoughtSprite(w, h, el.seed || 3), -w / 2, -h / 2, w, h);
  const cx = 0, cy = -h / 2 + h * 0.44;
  const rx = w * 0.445, ry = h * 0.375;
  if (el.heart) {
    ctx.save();
    ctx.fillStyle = el.heartColor || '#E5484D';
    heartPath(ctx, cx - rx * 0.62, cy - ry * 0.44, Math.min(rx, ry) * 0.17); ctx.fill();
    heartPath(ctx, cx + rx * 0.62, cy - ry * 0.34, Math.min(rx, ry) * 0.14); ctx.fill();
    ctx.restore();
  }
  if (el.inner === 'emoji') {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(el.size * 1.24)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.fillText(el.innerEmoji || '❄️', cx, cy);
    ctx.restore();
    return;
  }
  if (el.inner === 'sticker') {
    const img = el.innerSrc ? Ed.imgCache[el.innerSrc] : null;
    if (img && (img.complete || img.naturalWidth)) {
      const box = Math.min(rx * 1.16, ry * 1.30);
      const k = Math.min(box / (img.naturalWidth || 1), box / (img.naturalHeight || 1));
      const dw = (img.naturalWidth || box) * k, dh = (img.naturalHeight || box) * k;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    }
    return;
  }
  ctx.save();
  ctx.font = fontOf(el);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = el.color || PAL.ink;
  m.lines.forEach((line, i) => {
    const y = cy - m.th / 2 + m.lh / 2 + i * m.lh - el.size * 0.02;
    if (el.s1 && el.s1.w) { ctx.strokeStyle = el.s1.c; ctx.lineWidth = el.size * el.s1.w; ctx.strokeText(line, cx, y); }
    ctx.fillText(line, cx, y);
  });
  ctx.restore();
}

/* ── 2단 겹칩 직각 박스 ── */
function paintStack(ctx, el) {
  const L = stackLayout(el);
  const x0 = -L.W / 2, y0 = -L.H / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(20,17,14,.10)';
  ctx.shadowBlur = Math.min(L.W, L.H) * 0.04;
  ctx.shadowOffsetY = Math.min(L.W, L.H) * 0.012;
  ctx.fillStyle = el.fill || '#fff';
  ctx.fillRect(x0, y0, L.a1, L.b1);
  ctx.restore();
  if (el.bw) {
    ctx.strokeStyle = el.bc || PAL.ink;
    ctx.lineWidth = el.bw;
    ctx.strokeRect(x0, y0, L.a1, L.b1);
  }
  ctx.fillStyle = el.color || PAL.ink;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fontOfFamily(el.font || 'Pretendard', L.s, el.weight);
  L.l1.forEach((l, i) => ctx.fillText(l, x0 + L.a1 / 2, y0 + L.b1 / 2 - ((L.l1.length - 1) * L.lh1) / 2 + i * L.lh1));
  const bx = x0 + L.ox, by = y0 + L.oy;
  ctx.save();
  ctx.shadowColor = 'rgba(20,17,14,.16)';
  ctx.shadowBlur = Math.min(L.W, L.H) * 0.05;
  ctx.shadowOffsetY = Math.min(L.W, L.H) * 0.014;
  ctx.fillStyle = el.fill2 || PAL.ink;
  ctx.fillRect(bx, by, L.a2, L.b2);
  ctx.restore();
  ctx.fillStyle = el.color2 || '#fff';
  ctx.font = fontOfFamily(el.font || 'Pretendard', L.s2, el.weight2 || el.weight);
  L.l2.forEach((l, i) => ctx.fillText(l, bx + L.a2 / 2, by + L.b2 / 2 - ((L.l2.length - 1) * L.lh2) / 2 + i * L.lh2));
}

function paintBubble(ctx, el) {
  const m = elSize(el);
  if (el.kind === 'starburst') return paintStarburst(ctx, el, m);
  if (el.kind === 'imsg') return paintImsg(ctx, el, m);
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
  else if (el.type === 'thought') paintThought(ctx, el, elSize(el));
  else if (el.type === 'stack') paintStack(ctx, el);
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
  const src = p.proc || p.cut || p.base || p.img;
  const sw = (src && (src.width || p.ew)) || p.ew;
  const sh = (src && (src.height || p.eh)) || p.eh;
  const scene = p.scene ? sceneCanvas(W, H, p.scene) : null;
  if (scene) ctx.drawImage(scene, 0, 0, W, H);
  else { ctx.fillStyle = p.fill || this.bg; ctx.fillRect(0, 0, W, H); }
  const base = p.mode === 'cover' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
  const k = base * p.scale;
  const dw = sw * k, dh = sh * k;
  const dx = (W - dw) / 2 + p.ox, dy = (H - dh) / 2 + p.oy;
  // 틀(프레임) 모드 — 사진을 정해진 사각형 안에 넣기
  if (p.frame && !scene) {
    const fr = p.frame;
    const fx = fr.x * W, fy = fr.y * H, fw = fr.w * W, fh = fr.h * H;
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    roundRectPath(ctx, fx, fy, fw, fh, fr.r || 0);
    ctx.clip();
    const base2 = (fr.fit === 'contain' ? Math.min : Math.max)(fw / sw, fh / sh);
    const k2 = base2 * p.scale;
    const dw2 = sw * k2, dh2 = sh * k2;
    ctx.fillStyle = fr.bg || '#fff';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.drawImage(src, fx + (fw - dw2) / 2 + p.ox * (fw / W), fy + (fh - dh2) / 2 + p.oy * (fh / H), dw2, dh2);
    ctx.restore();
    if (fr.bw) {
      ctx.strokeStyle = fr.bc || '#FFFFFF';
      ctx.lineWidth = fr.bw * (W / 1080);
      roundRectPath(ctx, fx, fy, fw, fh, fr.r || 0);
      ctx.stroke();
    }
    return;
  }
  if (!scene && p.mode === 'contain') {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(src, 0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(0, 0, W, H);
  }
  if (scene) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.68)';
    ctx.shadowBlur = Math.max(8, dh * 0.035);
    ctx.shadowOffsetY = dh * 0.018;
    ctx.drawImage(src, dx, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(src, dx, dy, dw, dh);
  }
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
