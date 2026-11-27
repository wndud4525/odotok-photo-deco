/* ─────────────────────────────────────────────────────────
   챡 × 오뜨 사진꾸미기 — UI
   ───────────────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const cv = $('#cv');
const stage = $('#stage');

const ST = {
  tab: 'photo',
  stickerSrc: 'face',
  boxColor: PAL.lime,
  boxStyle: 'solid',
  bubbleKind: 'wobble',
  bubbleFill: PAL.white,
  thoughtSrc: 'face',
  cutTol: 46,
  warm: 'cozy',
  warmStrength: 75,
  scene: 'black',
  draftText: '크로플',
  preset: TEXT_PRESETS[0],
  font: 'BM꾸불림체',
  size: 130,
  textColor: PAL.ink,
  phraseCat: '병맛·재치',
  manifests: { line: [], jelly: [], bam: [] },
  loadedFonts: new Set()
};

/* ---------- 사진 보정 프리셋 ---------- */
const WARM_PRESETS = {
  cozy: {
    brightness: 110, contrast: 95, saturate: 90, warmth: 32, lift: 12,
    tint: { c: '#FFE1B9', a: 0.17, mode: 'soft-light' }
  },
  vintage: {
    brightness: 103, contrast: 90, saturate: 76, warmth: 24, lift: 18,
    tint: { c: '#F1D7AD', a: 0.21, mode: 'soft-light' }
  }
};

function applyWarm(id, strength) {
  const p = Ed.photo; if (!p) return;
  const k = (strength == null ? ST.warmStrength : strength) / 100;
  const w = WARM_PRESETS[id] || WARM_PRESETS.cozy;
  ST.warm = id;
  Ed.applyAdj({
    brightness: 100 + (w.brightness - 100) * k,
    contrast: 100 + (w.contrast - 100) * k,
    saturate: 100 + (w.saturate - 100) * k,
    warmth: w.warmth * k,
    lift: w.lift * k,
    tint: { c: w.tint.c, a: w.tint.a * k, mode: w.tint.mode }
  });
}

function warmOff() {
  const p = Ed.photo; if (!p) return;
  Ed.applyAdj({ brightness: 100, contrast: 100, saturate: 100, warmth: 0, lift: 0, tint: null });
}

/* 사진 탭에서 보정값이 바뀌면 40ms 묶어서 픽셀 처리 */
let adjTimer = null;
function adjSoon(patch) {
  const p = Ed.photo; if (!p) return;
  Object.assign(p.adj, patch);
  if (adjTimer) return;
  adjTimer = setTimeout(() => { adjTimer = null; Ed.processPhoto(); Ed.render(); }, 40);
}

function detectAlpha(img) {
  try {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 240) clear++;
    return clear / (64 * 64) > 0.04;
  } catch (e) { return false; }
}

function doCutout(scene) {
  const p = Ed.photo;
  if (!p) { toast('먼저 사진을 불러와 주세요', 2400); return; }
  toast('누끼 따는 중…', 1600);
  setTimeout(() => {
    const r = Ed.makeCut(ST.cutTol);
    if (!r || !r.ok) {
      const msg = !r ? '누끼를 못 땄어요' :
        r.reason === 'nothing' ? '배경을 못 찾았어요 — 감도를 올려 다시 눌러보세요' :
        r.reason === 'toomuch' ? '피사체까지 지워졌어요 — 감도를 낮춰 다시 눌러보세요' :
        '이 사진은 자동 누끼가 어려워요. 감도를 조절해 보세요';
      toast(msg, 3200);
      return;
    }
    p.cut = r.canvas;
    Ed.setScene(scene || ST.scene || 'black');
    Ed.processPhoto();
    Ed.render(); renderPanel(); updateEmpty();
    toast('누끼 완료 — 배경 위에 올렸어요');
  }, 80);
}

function loadPhotoFile(file) {
  return new Promise(async (resolve) => {
    if (!file) return resolve(false);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch (e) { toast('이 사진은 열 수 없어요', 2600); return resolve(false); }
    const hasAlpha = detectAlpha(img);
    const scene = hasAlpha ? (ST.scene || 'black') : null;
    Ed.setPhoto(img, { hasAlpha, scene, scale: hasAlpha ? 0.88 : 1 });
    if (hasAlpha) Ed.setScene(scene);
    Ed.snapshot(); refreshView(); renderPanel();
    toast(hasAlpha ? '투명 PNG를 배경 위에 올렸어요' : '사진을 불러왔어요');
    resolve(true);
  });
}

/* ---------- 원터치 틀 ---------- */
function todayLine() {
  const d = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${days[d.getDay()]}`;
}

function addTplText(text, o) {
  o = o || {};
  const size = (o.size || 80) * Ed.W / 1080;
  const preset = { id: 'tpl', st: { font: o.font || 'Pretendard', size: o.size || 80, color: o.color || PAL.ink, weight: o.weight || null } };
  const el = Ed.addText(text, preset, { x: o.x, y: o.y });
  el.font = o.font || 'Pretendard';
  el.weight = o.weight || null;
  el.size = size;
  el.color = o.color || PAL.ink;
  el.s1 = null; el.s2 = null; el.shadow = null;
  el.bg = o.bg ? Object.assign({ pad: 0.32, r: 0, bw: 0 }, o.bg) : null;
  el.lineH = 1.16;
  el.tpl = o.tpl || null;
  ensureFont(el.font).then(() => Ed.render());
  return el;
}

function dropTplElements() {
  Ed.els = Ed.els.filter(e => !e.tpl);
  Ed.selId = null;
}

function applyTemplate(kind) {
  Ed.setRatio('4:5');
  const W = Ed.W, H = Ed.H;
  dropTplElements();
  if (Ed.photo) { Ed.photo.scene = null; Ed.photo.cut = null; Ed.photo.mode = 'cover'; Ed.photo.scale = 1; Ed.photo.ox = 0; Ed.photo.oy = 0; }
  if (kind === 'cute') {
    Ed.bg = '#FBEFDD';
    Ed.frameDefault = { x: 0.055, y: 0.045, w: 0.89, h: 0.695, r: 0, bw: 9, bc: '#FFFFFF', bg: '#FFFFFF' };
    if (Ed.photo) { Ed.photo.frame = Ed.frameDefault; Ed.photo.mode = 'cover'; Ed.photo.scale = 1; Ed.photo.ox = 0; Ed.photo.oy = 0; }
    addTplText('오늘의 귀여움', { font: '온글잎 류류체', size: 96, color: PAL.ink, x: W / 2, y: H * 0.805, tpl: 'cute' });
    addTplText('여기에 소제목', { font: 'Pretendard', weight: 700, size: 34, color: PAL.ink,
      bg: { c: PAL.butter, pad: 0.34, r: 0, bw: 0 }, x: W / 2, y: H * 0.872, tpl: 'cute' });
    addTplText(todayLine(), { font: 'Pretendard', weight: 600, size: 24, color: '#8B7A5F', x: W / 2, y: H * 0.932, tpl: 'cute' });
    const stars = (ST.manifests.jelly || []).filter(s => /star|별/i.test(s.name || s.file));
    const pick = stars.length ? stars : (ST.manifests.jelly || []);
    [[0.205, 0.802, 0.105], [0.795, 0.815, 0.085]].forEach(([fx, fy, sz], i) => {
      const s = pick[i % Math.max(1, pick.length)];
      if (!s) return;
      const src = `stickers/jelly/${s.file}`;
      const img = new Image();
      img.onload = () => { Ed.imgCache[src] = img; Ed.render(); };
      img.src = src;
      const el = Ed.addSticker(src, img.naturalWidth || 220, img.naturalHeight || 220, { size: sz });
      el.x = W * fx; el.y = H * fy; el.tpl = 'cute';
    });
    if (Ed.photo) applyWarm('cozy', 55);
  } else {
    Ed.bg = '#FFFFFF';
    Ed.frameDefault = { x: 0.06, y: 0.05, w: 0.88, h: 0.665, r: 0, bw: 3, bc: PAL.ink, bg: '#FFFFFF' };
    if (Ed.photo) { Ed.photo.frame = Ed.frameDefault; Ed.photo.mode = 'cover'; Ed.photo.scale = 1; Ed.photo.ox = 0; Ed.photo.oy = 0; }
    addTplText('오늘의 기록', { font: '느좋체', size: 94, color: PAL.ink, x: W / 2, y: H * 0.79, tpl: 'record' });
    addTplText('한 줄 소제목', { font: 'Pretendard', weight: 700, size: 33, color: PAL.ink,
      bg: { c: PAL.lime, pad: 0.34, r: 0, bw: 0 }, x: W / 2, y: H * 0.858, tpl: 'record' });
    addTplText(todayLine(), { font: 'Pretendard', weight: 600, size: 24, color: '#8B8378', x: W / 2, y: H * 0.918, tpl: 'record' });
  }
  Ed.snapshot();
  refreshView(); renderPanel();
  toast(kind === 'cute' ? '오늘의 귀여움 틀 — 사진을 고르면 완성' : '오늘의 기록 틀 — 사진을 고르면 완성', 2600);
}
/* ---------- 신규 요소 헬퍼 ---------- */
function hasText(el) {
  if (!el) return false;
  return isTextLike(el) || el.type === 'box' || el.type === 'deco';
}
function typeLabel(el) {
  if (!el) return '';
  return ({ text: '글씨', bubble: '말풍선', thought: '생각풍선', stack: '2단 박스', box: '박스', deco: '데코', sticker: '스티커' })[el.type] || '요소';
}
function applySizeRatio(el, size0, size20, ratio) {
  if (el.type === 'stack') {
    const s = clamp(size0 * ratio, 10, 420);
    el.size = s;
    el.size2 = clamp((size20 || size0 * 0.92) * ratio, 8, 420);
  } else if (el.type === 'bubble' || el.type === 'thought') {
    el.size = clamp(size0 * ratio, 12, 700);
  } else {
    el.size = clamp(size0 * ratio, 14, 900);
  }
}
function loadStickerImg(src) {
  if (Ed.imgCache[src]) return Ed.imgCache[src];
  const img = new Image();
  img.onload = () => { Ed.imgCache[src] = img; Ed.render(); };
  img.src = src;
  Ed.imgCache[src] = img;
  return img;
}

let toastTimer = null;
function toast(msg, ms) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2200);
}

/* ---------- stage sizing ---------- */
function fitStage() {
  const pad = 24;
  const bw = stage.clientWidth - pad, bh = stage.clientHeight - pad;
  const k = Math.min(bw / Ed.W, bh / Ed.H);
  cv.style.width = Math.round(Ed.W * k) + 'px';
  cv.style.height = Math.round(Ed.H * k) + 'px';
  Ed._fitScale = k;
}
function refreshView() {
  Ed.render();
  fitStage();
  updateEmpty();
  updateSelbar();
}
Ed.onRender = () => { updateEmpty(); updateSelbar(); };

function updateEmpty() {
  $('#emptyState').hidden = !!(Ed.photo || Ed.els.length);
}

/* ---------- fonts ---------- */
async function ensureFont(fam) {
  if (!fam || fam === 'emoji' || ST.loadedFonts.has(fam)) return;
  const f = FONTS.find(x => x.name === fam);
  const weights = f ? f.weights : [400];
  try {
    await Promise.all(weights.map(w => document.fonts.load(`${w} 40px "${fam}"`, '가나다ABC123')));
  } catch (e) { }
  ST.loadedFonts.add(fam);
}
async function ensureAllUsedFonts() {
  const fams = new Set(['Pretendard']);
  Ed.els.forEach(e => { if (e.font && e.font !== 'emoji') fams.add(e.font); });
  await Promise.all(Array.from(fams).map(ensureFont));
}

/* ---------- selection ---------- */
function selected() { return Ed.els.find(e => e.id === Ed.selId) || null; }
function updateSelbar() {
  const el = selected();
  $('#selbar').hidden = !el;
  $('#selEditBtn').hidden = !el || !(el.type === 'text' || el.type === 'bubble' ||
    el.type === 'thought' || el.type === 'stack' || el.type === 'box' ||
    (el.type === 'deco' && ['datetag', 'badge', 'stamp', 'music', 'polaroid'].includes(el.kind)));
}
function selectEl(id) {
  Ed.selId = id;
  updateSelbar();
  if (id) syncPanelToSelection();
  Ed.render();
}

/* ---------- pointer interactions ---------- */
const pointers = new Map();
let drag = null, pinch = null, lastTap = { t: 0, x: 0, y: 0 };

function canvasPos(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width * Ed.W, y: (ev.clientY - r.top) / r.height * Ed.H };
}

cv.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
  const p = canvasPos(ev);
  pointers.set(ev.pointerId, p);

  if (pointers.size === 2) {
    const [a, b] = Array.from(pointers.values());
    const sel = selected();
    const target = sel || (Ed.photoMode ? 'photo' : null);
    if (target) {
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      pinch = {
        target,
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        a0: Math.atan2(b.y - a.y, b.x - a.x),
        cx, cy,
        size0: sel && isTextLike(sel) ? sel.size : null,
        size20: sel && sel.type === 'stack' ? (sel.size2 || null) : null,
        scale0: sel && !isTextLike(sel) ? (sel.scale || 1) : 1,
        rot0: sel ? (sel.rot || 0) : 0,
        ps0: Ed.photo ? Ed.photo.scale : 1,
        pox: Ed.photo ? Ed.photo.ox : 0,
        poy: Ed.photo ? Ed.photo.oy : 0,
        moved: false
      };
      drag = null;
    }
    return;
  }
  if (pointers.size > 2) return;

  // 선택된 요소의 조작 버튼
  const h = Ed.hitHandle(p.x, p.y);
  if (h === 'del') { deleteSel(); return; }
  if (h === 'handle') {
    const el = selected();
    const d = Math.hypot(p.x - el.x, p.y - el.y);
    drag = {
      mode: 'handle', el, d0: d,
      ang0: Math.atan2(p.y - el.y, p.x - el.x),
      size0: isTextLike(el) ? el.size : null,
      size20: el.type === 'stack' ? (el.size2 || null) : null,
      scale0: el.scale || 1, rot0: el.rot || 0
    };
    return;
  }

  // 요소 히트테스트 (위에서부터)
  let hit = null;
  for (let i = Ed.els.length - 1; i >= 0; i--) {
    if (hitEl(Ed.els[i], p.x, p.y)) { hit = Ed.els[i]; break; }
  }

  const now = Date.now();
  const isDouble = now - lastTap.t < 330 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30 * (Ed.W / 1080);
  lastTap = { t: now, x: p.x, y: p.y };

  if (hit) {
    if (Ed.selId !== hit.id) selectEl(hit.id);
    if (isDouble && !hit.locked) { openEditorFor(hit); return; }
    drag = { mode: 'move', el: hit, ox: hit.x - p.x, oy: hit.y - p.y, moved: false };
    return;
  }

  if (Ed.photoMode && Ed.photo) {
    drag = { mode: 'photo', ox: Ed.photo.ox, oy: Ed.photo.oy, sx: p.x, sy: p.y };
    return;
  }
  if (Ed.selId) selectEl(null);
});

cv.addEventListener('pointermove', ev => {
  if (!pointers.has(ev.pointerId)) return;
  ev.preventDefault();
  const p = canvasPos(ev);
  pointers.set(ev.pointerId, p);

  if (pinch) {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return;
    const [a, b] = pts;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ratio = pinch.d0 > 10 ? d / pinch.d0 : 1;
    if (pinch.target === 'photo' && Ed.photo) {
      Ed.photo.scale = clamp(pinch.ps0 * ratio, 0.4, 6);
      Ed.photo.ox = pinch.pox + ((a.x + b.x) / 2 - pinch.cx);
      Ed.photo.oy = pinch.poy + ((a.y + b.y) / 2 - pinch.cy);
    } else if (pinch.target) {
      const el = pinch.target;
      if (isTextLike(el)) {
        applySizeRatio(el, pinch.size0, pinch.size20, ratio);
      } else {
        el.scale = clamp(pinch.scale0 * ratio, 0.15, 8);
      }
      el.rot = pinch.rot0 + (ang - pinch.a0);
    }
    pinch.moved = true;
    Ed.render();
    return;
  }

  if (!drag) return;
  if (drag.mode === 'move') {
    drag.el.x = p.x + drag.ox;
    drag.el.y = p.y + drag.oy;
    drag.moved = true;
  } else if (drag.mode === 'handle') {
    const el = drag.el;
    const d = Math.max(12, Math.hypot(p.x - el.x, p.y - el.y));
    const ratio = d / Math.max(12, drag.d0);
    if (drag.size0 != null) applySizeRatio(el, drag.size0, drag.size20, ratio);
    else el.scale = clamp(drag.scale0 * ratio, 0.15, 8);
    el.rot = drag.rot0 + (Math.atan2(p.y - el.y, p.x - el.x) - drag.ang0);
    drag.moved = true;
  } else if (drag.mode === 'photo' && Ed.photo) {
    Ed.photo.ox = drag.ox + (p.x - drag.sx);
    Ed.photo.oy = drag.oy + (p.y - drag.sy);
  }
  Ed.render();
});

function endPointer(ev) {
  if (!pointers.has(ev.pointerId)) return;
  pointers.delete(ev.pointerId);
  if (pinch) {
    if (pointers.size < 2) {
      if (pinch.moved) Ed.snapshot();
      pinch = null;
    }
    return;
  }
  if (drag) {
    if (drag.moved) Ed.snapshot();
    drag = null;
  }
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', ev => { if (drag || pinch) endPointer(ev); });

/* ---------- element actions ---------- */
function deleteSel() {
  const i = Ed.els.findIndex(e => e.id === Ed.selId);
  if (i < 0) return;
  Ed.els.splice(i, 1);
  Ed.selId = null;
  Ed.snapshot();
  updateSelbar();
  Ed.render();
  updateEmpty();
}
function duplicateSel() {
  const el = selected(); if (!el) return;
  const c = JSON.parse(JSON.stringify(el));
  c.id = 'e' + (Ed.nextId++);
  c.x += 26; c.y += 26;
  Ed.els.push(c);
  Ed.selId = c.id;
  Ed.snapshot(); refreshView();
}
function bringFront() {
  const el = selected(); if (!el) return;
  Ed.els.splice(Ed.els.indexOf(el), 1); Ed.els.push(el);
  Ed.snapshot(); refreshView();
}
function bringBack() {
  const el = selected(); if (!el) return;
  Ed.els.splice(Ed.els.indexOf(el), 1); Ed.els.unshift(el);
  Ed.snapshot(); refreshView();
}

$$('#selbar button').forEach(b => {
  b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'dup') duplicateSel();
    else if (a === 'front') bringFront();
    else if (a === 'back') bringBack();
    else if (a === 'del') deleteSel();
    else if (a === 'edit') openEditorFor(selected());
  });
});

/* ---------- text editing ---------- */
function openEditorFor(el) {
  if (!el) return;
  selectEl(el.id);
  setTab('text');
  setTimeout(() => {
    const ta = $('#taText');
    if (ta) { ta.value = el.text || ''; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }, 60);
}

/* ---------- photo ---------- */
$('#btnPickPhoto').addEventListener('click', () => $('#filePhoto').click());
$('#filePhoto').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  await loadPhotoFile(file);
});

/* 투명 PNG 붙여넣기 */
async function pasteImage() {
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = (it.types || []).find(t => t.startsWith('image/'));
        if (type) {
          const blob = await it.getType(type);
          const file = new File([blob], 'paste.png', { type });
          if (await loadPhotoFile(file)) return;
        }
      }
      toast('클립보드에 이미지가 없어요. 사진앱에서 길게 눌러 복사한 뒤 다시 눌러주세요', 3000);
    } else {
      toast('이 화면을 길게 눌러 “붙여넣기”를 눌러주세요', 3000);
    }
  } catch (e) {
    toast('붙여넣기 권한이 없어요 — 사진앱에서 복사 후 이 화면을 길게 눌러 붙여넣기 해주세요', 3400);
  }
}

document.addEventListener('paste', async e => {
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for (const it of items) {
    if (it.type && it.type.startsWith('image/')) {
      const file = it.getAsFile();
      if (file) { e.preventDefault(); await loadPhotoFile(file); return; }
    }
  }
});

/* ---------- panels ---------- */
function setTab(name) {
  ST.tab = name;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  renderPanel();
}

function syncPanelToSelection() {
  const el = selected();
  if (!el) return;
  if (el.type === 'text' || el.type === 'bubble') {
    ST.draftText = el.text;
    ST.preset = TEXT_PRESETS.find(p => p.id === el.presetId) || ST.preset;
    ST.font = el.font; ST.size = el.size;
    if (ST.tab === 'text' || ST.tab === 'bubble') renderPanel();
  }
  if (el.type === 'box') {
    ST.boxColor = el.fill || ST.boxColor;
    ST.boxStyle = el.style || ST.boxStyle;
    if (ST.tab === 'box') renderPanel();
  }
}

function renderPanel() {
  const p = $('#panel');
  p.classList.toggle('no-photo', !Ed.photo);
  let html = '';
  if (ST.tab === 'photo') html = panelPhoto();
  else if (ST.tab === 'text') html = panelText();
  else if (ST.tab === 'box') html = panelBox();
  else if (ST.tab === 'bubble') html = panelBubble();
  else if (ST.tab === 'sticker') html = panelSticker();
  else if (ST.tab === 'deco') html = panelDeco();
  else if (ST.tab === 'phrase') html = panelPhrase();
  else if (ST.tab === 'emoji') html = panelEmoji();
  p.innerHTML = html;
  bindPanel();
  const keep = p.scrollTop;
  p.scrollTop = keep;
}

/* ----- 사진 ----- */
function panelPhoto() {
  const p = Ed.photo;
  const adj = (p && p.adj) || { brightness: 100, contrast: 100, saturate: 100, warmth: 0 };
  const ratios = [['orig', '원본'], ['1:1', '1:1'], ['4:5', '4:5'], ['9:16', '9:16']];
  const fills = [['#FFFFFF', '화이트'], [PAL.cream, '크림'], [PAL.ink, '블랙'], [PAL.butter, '버터']];
  const adjRow = (key, label, min, max, val) => `<div class="field-row"><label>${label}</label>
      <input type="range" data-adj="${key}" min="${min}" max="${max}" step="1" value="${Math.round(val)}">
      <span class="val">${Math.round(val)}</span></div>`;
  return `
  <div class="p-head"><span class="p-title">사진</span>
    <button class="chip sm" data-act="pick">${p ? '사진 바꾸기' : '사진 불러오기'}</button></div>
  ${p ? '' : `<div class="photo-empty"><p>사진첩에서 한 장 골라주세요.<br>사진 없이 스티커만 얹어도 돼요.</p>
      <button class="btn lime wide" data-act="pick">사진 불러오기</button></div>`}

  <div class="p-title">원터치 보정</div>
  <div class="big-row">
    <button class="big-btn dark" data-act="cut-black">🖤 누끼 → 블랙배경</button>
    <button class="big-btn warm" data-act="warm">🎞️ 웜톤 보정</button>
  </div>
  <div class="p-title">원터치 틀</div>
  <div class="tpl-row">
    <button class="tpl-btn" data-act="tpl-cute"><b>오늘의 귀여움</b><span>웜톤 + 흰 프레임 + 제목·소제목</span></button>
    <button class="tpl-btn" data-act="tpl-record"><b>오늘의 기록</b><span>날짜 + 제목 + 직각 소제목</span></button>
  </div>
  <div class="row" style="margin-top:6px">
    <button class="chip ${p && p.scene === 'wood' ? 'on' : ''}" data-act="cut-wood">다크 우드 배경</button>
    <button class="chip" data-act="cut-only">누끼만 따기</button>
    <button class="chip" data-act="scene-off">배경 끄기</button>
  </div>
  <div class="field-row"><label>누끼 감도</label>
    <input type="range" id="rngCut" min="10" max="130" step="2" value="${ST.cutTol}">
    <span class="val" id="valCut">${ST.cutTol}</span></div>
  <div class="row">
    <button class="chip" data-act="paste">투명 PNG 붙여넣기</button>
  </div>

  <div class="p-title">웜톤</div>
  <div class="row">
    <button class="chip ${ST.warm === 'cozy' ? 'on' : ''}" data-warm="cozy">포근 웜톤</button>
    <button class="chip ${ST.warm === 'vintage' ? 'on' : ''}" data-warm="vintage">빈티지 웜톤</button>
    <button class="chip" data-act="warm-off">원본 톤</button>
  </div>
  <div class="field-row"><label>웜톤 강도</label>
    <input type="range" id="rngWarm" min="0" max="100" step="5" value="${ST.warmStrength}">
    <span class="val" id="valWarm">${ST.warmStrength}</span></div>

  <div class="p-title">미세 조정 ${p ? '' : '(사진을 넣으면 열려요)'}</div>
  <div class="adj-grid ${p ? '' : 'off'}">
    ${adjRow('brightness', '밝기', 60, 160, adj.brightness == null ? 100 : adj.brightness)}
    ${adjRow('contrast', '대비', 60, 160, adj.contrast == null ? 100 : adj.contrast)}
    ${adjRow('saturate', '채도', 0, 200, adj.saturate == null ? 100 : adj.saturate)}
    ${adjRow('warmth', '색온도', -80, 80, adj.warmth == null ? 0 : adj.warmth)}
  </div>

  <div class="p-title">비율</div>
  <div class="row">
    ${ratios.map(([v, l]) => `<button class="chip ${Ed.ratio === v ? 'on' : ''}" data-ratio="${v}">${l}</button>`).join('')}
  </div>
  <div class="p-title">사진 채우기</div>
  <div class="row">
    <button class="chip ${p && p.mode === 'cover' ? 'on' : ''}" data-fit="cover">꽉 채우기</button>
    <button class="chip ${p && p.mode === 'contain' ? 'on' : ''}" data-fit="contain">전체 보이기</button>
    ${fills.map(([c, n]) => `<button class="chip ${p && p.fill === c ? 'on' : ''}" data-fill="${c}">${n}</button>`).join('')}
  </div>
  <div class="row">
    <button class="chip ${Ed.photoMode ? 'on' : ''}" data-act="photomode">${Ed.photoMode ? '✓ 사진 조정 중' : '사진 위치·확대 조정'}</button>
    <button class="chip ${p && p.frame ? 'on' : ''}" data-act="frame-toggle">${p && p.frame ? '✓ 틀 프레임' : '틀 프레임'}</button>
    ${p ? '<button class="chip" data-act="delphoto">사진 빼기</button>' : ''}
    ${Ed.els.length ? '<button class="chip" data-act="clearall">모두 지우기</button>' : ''}
  </div>
  <div class="p-title">바탕색</div>
  <div class="row">
    ${[['#FFFFFF', '화이트'], [PAL.cream, '크림'], [PAL.butter, '버터'], [PAL.ink, '블랙'], [PAL.lime, '라임'], [PAL.pink, '핑크']]
      .map(([c, n]) => `<button class="chip ${Ed.bg === c ? 'on' : ''}" data-bg="${c}">${n}</button>`).join('')}
  </div>
  <p class="p-note">${Ed.photoMode ? '손가락으로 사진을 밀고, 두 손가락으로 확대·축소해요.' : '요소를 누르면 선택되고, 오른쪽 아래 네모를 끌면 크기·회전이 바뀌어요. 두 번 톡 누르면 글씨를 바로 고칠 수 있어요.'}</p>`;
}

/* ----- 글씨 (글씨·말풍선·생각풍선·2단박스·박스 모두 여기서 수정) ----- */
function panelText() {
  const el = selected();
  const edit = hasText(el);
  const txt = edit ? (el.text || '') : ST.draftText;
  const size = edit && el.size ? Math.round(el.size) : Math.round(ST.size);
  const fam = edit ? (el.font || ST.font) : ST.font;
  const col = edit ? (el.color || PAL.ink) : ST.textColor;
  const isText = el && el.type === 'text';
  const canStyle = !el || ['text', 'bubble', 'thought', 'stack', 'box'].includes(el.type);
  const styleBlock = canStyle ? `
  <div class="p-title" style="margin:6px 0 6px">오뜨 프리셋</div>
  <div class="preset-grid">
    ${TEXT_PRESETS.map(pr => presetCard(pr, isText ? el : null)).join('')}
  </div>
  <div class="p-title" style="margin:10px 0 6px">폰트</div>
  <div class="font-row">
    ${FONTS.map(f => `<button class="font-chip ${(fam === f.name) ? 'on' : ''}"
        data-font="${f.name}" style="font-family:'${f.name}'">${f.name}<small>${f.group}</small></button>`).join('')}
  </div>
  <div class="field-row"><label>크기</label>
    <input type="range" id="rngSize" min="20" max="340" step="2" value="${clamp(size, 20, 340)}">
    <span class="val" id="valSize">${size}</span></div>
  <div class="p-title">글자색</div>
  <div class="sw-row">
    ${SWATCHES.map(c => `<button class="sw ${(col === c) ? 'on' : ''}" data-tcolor="${c}" style="background:${c}"></button>`).join('')}
  </div>
  ${el && el.type === 'text' ? `<div class="p-title">배경 박스 <span class="p-note" style="margin:0">— 완전 직각</span></div>
  <div class="sw-row">
    <button class="sw ${!el.bg ? 'on' : ''}" data-tbg="none" style="background:#fff;position:relative;overflow:hidden">✕</button>
    ${BOX_COLORS.map(o => `<button class="sw ${el.bg && el.bg.c === o.c ? 'on' : ''}" data-tbg="${o.c}" style="background:${o.c}" title="${o.n}"></button>`).join('')}
  </div>` : ''}` : '';
  return `
  <div class="p-head"><span class="p-title">글씨 ${edit ? '· ' + typeLabel(el) + ' 수정 중' : ''}</span></div>
  <textarea class="txt-area" id="taText" placeholder="여기에 글씨를 써요 (줄바꿈 가능)" rows="2">${escapeHtml(txt)}</textarea>
  ${el && el.type === 'stack' ? `<div class="p-sub">↳ 아래 검정 박스 글씨</div>
    <textarea class="txt-area" id="taText2" rows="2">${escapeHtml(el.text2 || '')}</textarea>` : ''}
  ${el && el.type === 'thought' && el.inner ? `<p class="p-note">지금은 구름 속에 ${el.inner === 'emoji' ? '이모지' : '스티커'}가 들어 있어요. 글씨를 보이게 하려면 말풍선 탭에서 ‘글씨’를 눌러주세요.</p>` : ''}
  <div class="row" style="margin-top:8px">
    <button class="chip lime" data-act="addtext" style="background:${PAL.lime}">＋ 글씨 넣기</button>
    ${edit ? '<button class="chip" data-act="del">선택 삭제</button>' : ''}
  </div>
  ${styleBlock}
  <p class="p-note" style="margin-top:8px">${edit ? '지금은 선택된 요소의 글씨를 고치는 중이에요. 두 번 톡 눌러도 바로 고칠 수 있어요.' : '프리셋을 누르면 새 글씨가 생겨요.'}</p>`;
}

function presetCard(pr, el) {
  const s = pr.st;
  let style = `color:${s.color};font-family:'${s.font}';font-size:19px;font-weight:${s.weight || 400};`;
  let cls = 'preset';
  if (s.s1) style += `-webkit-text-stroke:${Math.max(1, s.s1.w * 26)}px ${s.s1.c};paint-order:stroke fill;`;
  if (s.bg) style += `background:${s.bg.c};padding:2px 6px;`;
  if (s.hl) style += `background:linear-gradient(transparent 62%, ${s.hl} 62%);`;
  if (el && el.presetId === pr.id) cls += ' on';
  return `<button class="${cls}" data-preset="${pr.id}">
    <span class="pv" style="${style}">${pr.sample}</span><span class="lbl">${pr.label}</span></button>`;
}

/* ----- 박스 ----- */
function panelBox() {
  const el = selected();
  const isBox = el && el.type === 'box';
  const isStack = el && el.type === 'stack';
  return `
  <div class="p-head"><span class="p-title">박스 ${isBox ? '· 선택된 박스 수정 중' : isStack ? '· 2단 박스 수정 중' : ''}</span></div>
  <div class="row">${BOX_STYLES.map(s => `<button class="chip ${ST.boxStyle === s.id ? 'on' : ''}" data-bstyle="${s.id}">${s.label}</button>`).join('')}</div>
  <div class="p-title">색 (전부 직각)</div>
  <div class="sw-row">
    ${BOX_COLORS.map(o => `<button class="sw ${((isBox ? el.fill : ST.boxColor) === o.c) ? 'on' : ''}" data-bcolor="${o.c}" style="background:${o.c}" title="${o.n}"></button>`).join('')}
  </div>
  <div class="row" style="margin-top:10px">
    <button class="chip" data-act="addbox" style="background:${PAL.ink};color:#fff">＋ 박스 넣기</button>
    <button class="chip" data-act="addstack">＋ 2단 겹친 박스</button>
    ${isBox ? '<button class="chip" data-act="boxtext">박스에 글씨</button><button class="chip" data-act="del">삭제</button>' : ''}
    ${isStack ? '<button class="chip" data-act="edit">위/아래 글씨 고치기</button><button class="chip" data-act="del">삭제</button>' : ''}
  </div>
  ${isStack ? `<p class="p-note">흰 박스·검정 박스 글이 각각 따로 고쳐져요. ‘글씨’ 탭에서도 두 칸 모두 수정할 수 있어요.</p>` : ''}
  <p class="p-note">색을 누르면 그 색 박스가 바로 생겨요. 선택된 박스가 있으면 그 박스 색이 바뀌어요.</p>`;
}

/* ----- 말풍선 ----- */
function thoughtStickerPicker() {
  const src = ST.thoughtSrc || 'face';
  let list = [];
  if (src === 'face') list = ST.manifests.line.filter(s => s.tags.includes('face') && s.file.includes('_icon_'));
  else if (src === 'bam') list = ST.manifests.bam;
  else list = ST.manifests.jelly;
  const dir = src === 'jelly' ? 'jelly' : src === 'bam' ? 'bam' : 'line';
  const tabs = [['face', '라벨기 표정'], ['bam', '오도독밤'], ['jelly', '3D 젤리']];
  return `<div class="src-row">${tabs.map(([k, l]) => `<button class="chip sm ${src === k ? 'on' : ''}" data-thsrc="${k}">${l}</button>`).join('')}</div>
    ${list.length ? `<div class="st-grid">${list.map(s => `<button class="st" data-thsticker="${s.file}" data-thdir="${dir}" title="${escapeHtml(s.name)}"><img src="stickers/${dir}/${s.file}" alt="${escapeHtml(s.name)}" loading="lazy"></button>`).join('')}</div>` : '<p class="p-note">목록 불러오는 중…</p>'}`;
}

function panelBubble() {
  const el = selected();
  const isB = el && el.type === 'bubble';
  const isT = el && el.type === 'thought';
  const curKind = isB ? el.kind : (isT ? 'thought' : ST.bubbleKind);
  const curFill = isB ? el.fill : ST.bubbleFill;
  const isImsg = isB && el.kind === 'imsg';
  const colors = isB && el.kind === 'imsg'
    ? [IMSG.red, IMSG.blue, IMSG.grey, PAL.white, PAL.cream, PAL.ink]
    : [PAL.white, PAL.cream, PAL.butter, PAL.lime, PAL.mint, PAL.sky, PAL.rose, PAL.lav, PAL.ink];
  let extra = '';
  if (isImsg) {
    extra += `<div class="row" style="margin-top:6px">
      <button class="chip" data-imsgc="${IMSG.red}" style="background:${IMSG.red};color:#fff;border-color:${IMSG.red}">내가 받은 말(빨강)</button>
      <button class="chip" data-imsgc="${IMSG.blue}" style="background:${IMSG.blue};color:#fff;border-color:${IMSG.blue}">내가 보낸 말(파랑)</button>
      <button class="chip" data-imsgc="${IMSG.grey}" style="background:${IMSG.grey};color:#fff;border-color:${IMSG.grey}">회색</button></div>
      <p class="p-note">글씨는 두 번 톡 누르면 바로 고칠 수 있어요.</p>`;
  }
  if (isT) {
    const mode = el.inner || 'text';
    extra += `<div class="p-title">구름 속 내용 <span class="p-note" style="margin:0">— 뭐든 넣어보세요</span></div>
      <div class="row">
        <button class="chip ${mode === 'text' ? 'on' : ''}" data-thmode="text">글씨</button>
        <button class="chip ${mode === 'emoji' ? 'on' : ''}" data-thmode="emoji">이모지</button>
        <button class="chip ${mode === 'sticker' ? 'on' : ''}" data-thmode="sticker">스티커</button>
      </div>`;
    if (mode === 'text') {
      extra += `<p class="p-note">구름 속 글씨는 ‘글씨’ 탭이나 두 번 톡으로 고쳐요.</p>`;
    } else if (mode === 'emoji') {
      extra += `<div class="field-row" style="margin-top:8px;gap:6px">
          <input type="text" id="thEmojiInput" class="txt-inline" maxlength="8" placeholder="이모지 직접 입력 (😀 붙여넣기)" value="${escapeHtml(el.innerEmoji || '')}">
        </div>
        <div class="emo-grid" style="margin-top:6px">${EMOJIS.map(e => `<button class="emo ${el.innerEmoji === e ? 'on' : ''}" data-themoji="${e}">${e}</button>`).join('')}</div>`;
    } else {
      extra += thoughtStickerPicker();
    }
    extra += `<div class="row" style="margin-top:10px">
        <button class="chip ${el.heart ? 'on' : ''}" data-thheart="1">♥ 하트 장식 ${el.heart ? '켜짐' : '꺼짐'}</button>
      </div>`;
  }
  return `
  <div class="p-head"><span class="p-title">말풍선 ${isB ? '· 선택된 말풍선 수정 중' : isT ? '· 생각풍선 수정 중' : ''}</span></div>
  <div class="row">${BUBBLES.map(b => `<button class="chip ${(curKind === b.id) ? 'on' : ''}" data-bubble="${b.id}">${b.label}</button>`).join('')}</div>
  ${isT ? '' : `<div class="p-title">색</div>
  <div class="sw-row">
    ${colors.map(c => `<button class="sw ${(curFill === c) ? 'on' : ''}" data-bfill="${c}" style="background:${c}"></button>`).join('')}
  </div>`}
  <div class="row" style="margin-top:10px">
    <button class="chip" data-act="addbubble" style="background:${PAL.ink};color:#fff">＋ 말풍선 넣기</button>
    ${(isB || isT) ? '<button class="chip" data-act="edit">글씨 수정</button><button class="chip" data-act="del">삭제</button>' : ''}
  </div>
  ${extra}
  <p class="p-note">말풍선 안 글씨는 두 번 톡 누르면 바로 고칠 수 있어요.</p>`;
}

/* ----- 스티커 ----- */
const SRC_TABS = [
  ['face', '표정·얼굴'], ['heart', '하트·별'], ['thing', '사물'], ['frame', '프레임'],
  ['phrase', '다꾸 문구'], ['jelly', '3D 젤리'], ['bam', '오도독밤'], ['mine', '내 사진']
];
function panelSticker() {
  return `
  <div class="p-head"><span class="p-title">스티커</span>
    <span class="p-note" style="margin:0">${ST.stickerSrc === 'mine' ? '' : '눌러서 얹기'}</span></div>
  <div class="src-row">${SRC_TABS.map(([k, l]) => `<button class="chip sm ${ST.stickerSrc === k ? 'on' : ''}" data-src="${k}">${l}</button>`).join('')}</div>
  <div id="stickerBody">${stickerBody()}</div>`;
}
function stickerBody() {
  if (ST.stickerSrc === 'mine') {
    return `<div class="photo-empty"><p>내가 가진 PNG·JPG를 스티커로 얹어요.<br>흰 배경 그림은 누끼까지 자동으로 따줘요.</p>
      <button class="btn lime wide" data-act="upsticker">내 이미지 불러오기</button></div>`;
  }
  let list = [];
  if (['face', 'heart', 'thing', 'frame', 'phrase'].includes(ST.stickerSrc)) {
    list = ST.manifests.line.filter(s => s.tags.includes(ST.stickerSrc));
    if (ST.stickerSrc === 'face') {
      const icon = list.filter(s => s.file.includes('_icon_'));
      const ph = list.filter(s => s.file.includes('_phrase_'));
      list = icon.concat(ph);
    }
  } else if (ST.stickerSrc === 'jelly') list = ST.manifests.jelly;
  else if (ST.stickerSrc === 'bam') list = ST.manifests.bam;
  if (!list.length) return '<p class="p-note">불러오는 중…</p>';
  return `<div class="st-grid">${list.map(s =>
    `<button class="st" data-sticker="${s.file}" data-cat="${ST.stickerSrc}" title="${s.name}">
       <img src="stickers/${ST.stickerSrc === 'jelly' ? 'jelly' : ST.stickerSrc === 'bam' ? 'bam' : 'line'}/${s.file}" alt="${s.name}" loading="lazy"></button>`).join('')}</div>`;
}

/* ----- 데코 ----- */
const DECO_ICON = { music: '♪', datetag: '▤', badge: 'PLUS', stamp: '◉', sparkle: '✦', tape: '▰', arrow: '↝', polaroid: '▢' };
function panelDeco() {
  return `
  <div class="p-head"><span class="p-title">데코 · 챡 스타일</span></div>
  <div class="deco-grid">
    ${DECOS.map(d => `<button class="deco-card" data-deco="${d.id}">
      <b>${DECO_ICON[d.id] || '✦'}</b><span>${d.label}</span></button>`).join('')}
  </div>
  <p class="p-note" style="margin-top:8px">음악바·날짜태그·스탬프는 두 번 톡 누르면 문구를 고칠 수 있어요.</p>`;
}

/* ----- 문구 ----- */
function panelPhrase() {
  const cats = ['프리셋', '챡 프레임', '병맛·재치', '카오모지·아스키아트', '응원·갓생', '다꾸·기록 태그', '애정·덕질', '영문·기타', '영어 한 줄'];
  let items = [];
  if (ST.phraseCat === '프리셋') {
    items = TEXT_PRESETS.map(p => ({ cat: '글씨 프리셋', text: p.sample, preset: p.id }));
  } else if (ST.phraseCat === '챡 프레임') {
    items = (window.FRAMES || []).map(f => ({ cat: f.cat, text: f.text }));
  } else if (ST.phraseCat === '영어 한 줄') {
    items = (window.EN_LINES || []).map(t => ({ cat: 'journalforlyds 원문', text: t }));
  } else {
    items = (window.PHRASES || []).filter(p => p.cat === ST.phraseCat);
  }
  return `
  <div class="p-head"><span class="p-title">문구</span><span class="p-note" style="margin:0">누르면 그대로 들어가요</span></div>
  <div class="row">${cats.map(c => `<button class="chip sm ${ST.phraseCat === c ? 'on' : ''}" data-pcat="${c}">${c}</button>`).join('')}</div>
  <div class="phrase-list">
    ${items.map(it => `<button class="phrase" data-phrase="${encodeURIComponent(it.text)}" ${it.preset ? `data-ppreset="${it.preset}"` : ''}><b>${it.cat}</b><span>${escapeHtml(it.text)}</span></button>`).join('')}
  </div>`;
}

/* ----- 이모지 ----- */
function panelEmoji() {
  return `
  <div class="p-head"><span class="p-title">이모지</span></div>
  <div class="emo-grid">${EMOJIS.map(e => `<button class="emo" data-emoji="${e}">${e}</button>`).join('')}</div>
  <p class="p-note" style="margin-top:8px">큰 이모지도 얹을 수 있어요 — 넣은 뒤 크기 조절.</p>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- panel bindings ---------- */
function bindPanel() {
  const p = $('#panel');

  p.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'pick') $('#filePhoto').click();
    else if (a === 'tpl-cute') applyTemplate('cute');
    else if (a === 'tpl-record') applyTemplate('record');
    else if (a === 'cut-black') doCutout('black');
    else if (a === 'cut-wood') doCutout('wood');
    else if (a === 'cut-only') doCutout(Ed.photo && Ed.photo.scene ? Ed.photo.scene : 'black');
    else if (a === 'scene-off') { if (Ed.photo) { Ed.photo.scene = null; Ed.photo.frame = Ed.frameDefault || null; Ed.render(); renderPanel(); } }
    else if (a === 'warm') { applyWarm(ST.warm || 'cozy', ST.warmStrength); renderPanel(); }
    else if (a === 'warm-off') { warmOff(); renderPanel(); }
    else if (a === 'paste') pasteImage();
    else if (a === 'frame-toggle') {
      if (Ed.photo) {
        if (Ed.photo.frame) { Ed.frameDefault = Ed.photo.frame; Ed.photo.frame = null; }
        else Ed.photo.frame = Ed.frameDefault || { x: 0.06, y: 0.06, w: 0.88, h: 0.72, r: 0, bw: 6, bc: '#FFFFFF', bg: '#FFFFFF' };
        Ed.render(); renderPanel();
      } else toast('사진을 먼저 불러와 주세요');
    }
    else if (a === 'photomode') { Ed.photoMode = !Ed.photoMode; renderPanel(); toast(Ed.photoMode ? '사진 조정 모드 — 끌어서 이동' : '사진 조정 끝'); }
    else if (a === 'delphoto') { Ed.photo = null; refreshView(); renderPanel(); }
    else if (a === 'clearall') {
      Ed.els = []; Ed.selId = null; Ed.snapshot(); refreshView(); renderPanel();
      toast('다 지웠어요 — ↺ 로 되돌릴 수 있어요');
    }
    else if (a === 'addtext') addTextFromPanel();
    else if (a === 'addbox') addBox(ST.boxColor, ST.boxStyle);
    else if (a === 'addstack') addStack();
    else if (a === 'addbubble') addBubble(ST.bubbleKind, ST.bubbleFill);
    else if (a === 'boxtext') { const el = selected(); if (el) openEditorFor(el); }
    else if (a === 'del') deleteSel();
    else if (a === 'edit') openEditorFor(selected());
    else if (a === 'upsticker') $('#fileSticker').click();
  }));

  p.querySelectorAll('[data-adj]').forEach(s => s.addEventListener('input', () => {
    const k = s.dataset.adj, v = +s.value;
    adjSoon({ [k]: v });
    const lab = s.parentElement.querySelector('.val');
    if (lab) lab.textContent = v;
  }));

  p.querySelectorAll('[data-warm]').forEach(b => b.addEventListener('click', () => {
    if (!Ed.photo) { toast('먼저 사진을 불러와 주세요'); return; }
    applyWarm(b.dataset.warm, ST.warmStrength);
    renderPanel();
  }));
  const rw = p.querySelector('#rngWarm');
  if (rw) rw.addEventListener('input', () => {
    ST.warmStrength = +rw.value;
    const lab = p.querySelector('#valWarm'); if (lab) lab.textContent = ST.warmStrength;
    if (Ed.photo) applyWarm(ST.warm, ST.warmStrength);
  });
  const rc = p.querySelector('#rngCut');
  if (rc) rc.addEventListener('input', () => {
    ST.cutTol = +rc.value;
    const lab = p.querySelector('#valCut'); if (lab) lab.textContent = ST.cutTol;
  });

  p.querySelectorAll('[data-ratio]').forEach(b => b.addEventListener('click', () => {
    Ed.setRatio(b.dataset.ratio); refreshView(); renderPanel();
  }));
  p.querySelectorAll('[data-fit]').forEach(b => b.addEventListener('click', () => {
    if (Ed.photo) Ed.photo.mode = b.dataset.fit; Ed.render(); renderPanel();
  }));
  p.querySelectorAll('[data-fill]').forEach(b => b.addEventListener('click', () => {
    if (Ed.photo) { Ed.photo.fill = b.dataset.fill; Ed.render(); renderPanel(); }
  }));
  p.querySelectorAll('[data-bg]').forEach(b => b.addEventListener('click', () => {
    Ed.bg = b.dataset.bg; Ed.render(); renderPanel();
  }));

  const ta = p.querySelector('#taText');
  if (ta) {
    ta.addEventListener('input', () => {
      const el = selected();
      if (el && hasText(el)) { el.text = ta.value; Ed.render(); }
      else ST.draftText = ta.value;
    });
    ta.addEventListener('change', () => { const el = selected(); if (el && hasText(el)) Ed.snapshot(); });
    ta.addEventListener('focus', () => { ta.scrollIntoView({ block: 'nearest' }); });
  }
  const ta2 = p.querySelector('#taText2');
  if (ta2) {
    ta2.addEventListener('input', () => {
      const el = selected();
      if (el && el.type === 'stack') { el.text2 = ta2.value; Ed.render(); }
    });
    ta2.addEventListener('change', () => { const el = selected(); if (el) Ed.snapshot(); });
    ta2.addEventListener('focus', () => { ta2.scrollIntoView({ block: 'nearest' }); });
  }

  p.querySelectorAll('[data-tbg]').forEach(b => b.addEventListener('click', () => {
    const el = selected();
    if (!el || el.type !== 'text') return;
    const c = b.dataset.tbg;
    if (c === 'none') el.bg = null;
    else el.bg = { c, pad: 0.32, r: 0, bw: 0 };
    Ed.snapshot(); Ed.render(); renderPanel();
  }));

  p.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    const pr = TEXT_PRESETS.find(x => x.id === b.dataset.preset);
    applyPreset(pr);
  }));

  p.querySelectorAll('[data-font]').forEach(b => b.addEventListener('click', async () => {
    const fam = b.dataset.font;
    await ensureFont(fam);
    const el = selected();
    if (el && (isTextLike(el) || el.type === 'box' || el.type === 'deco')) {
      el.font = fam;
      if (el.type === 'text') el.presetId = null;
      Ed.render();
    } else {
      ST.font = fam;
    }
    renderPanel();
  }));

  const rng = p.querySelector('#rngSize');
  if (rng) rng.addEventListener('input', () => {
    const v = +rng.value;
    const el = selected();
    if (el && isTextLike(el)) {
      if (el.type === 'stack') {
        const k = v / (el.size || 1);
        el.size = v; el.size2 = (el.size2 || v * 0.92) * k;
      } else el.size = v;
      Ed.render();
    } else if (el && el.type === 'box') { el.size = v; Ed.render(); }
    else ST.size = v;
    const lab = $('#valSize'); if (lab) lab.textContent = v;
  });

  p.querySelectorAll('[data-tcolor]').forEach(b => b.addEventListener('click', () => {
    const c = b.dataset.tcolor;
    const el = selected();
    if (el && hasText(el)) { el.color = c; if (el.type === 'text') el.presetId = null; Ed.render(); }
    else ST.textColor = c;
    renderPanel();
  }));

  p.querySelectorAll('[data-bstyle]').forEach(b => b.addEventListener('click', () => {
    ST.boxStyle = b.dataset.bstyle;
    const el = selected();
    if (el && el.type === 'box') {
      el.style = ST.boxStyle; el.bw = ST.boxStyle === 'dashed' ? 4 : 5;
      el.alpha = ST.boxStyle === 'tape' ? 0.72 : 1;
      el.fill = ST.boxStyle === 'frame' ? null : (el.fill || ST.boxColor);
      el.bc = ST.boxStyle === 'frame' ? ST.boxColor : PAL.ink;
      Ed.render();
    }
    renderPanel();
  }));

  p.querySelectorAll('[data-bcolor]').forEach(b => b.addEventListener('click', () => {
    const c = b.dataset.bcolor;
    ST.boxColor = c;
    const el = selected();
    if (el && el.type === 'box') {
      if (el.style === 'frame') el.bc = c; else el.fill = c;
      Ed.render(); renderPanel();
    } else {
      addBox(c, ST.boxStyle);
    }
  }));

  p.querySelectorAll('[data-bubble]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.bubble;
    ST.bubbleKind = id;
    const el = selected();
    if (id === 'thought') {
      if (el && el.type === 'thought') { renderPanel(); return; }
      const t = Ed.addThought({});
      ensureFont(t.font).then(() => Ed.render());
      Ed.render(); updateEmpty(); updateSelbar(); renderPanel();
      toast('3D 생각풍선 — 구름 속에 이모지·스티커·글씨를 넣어보세요');
      return;
    }
    if (el && el.type === 'bubble') {
      el.kind = id;
      if (id === 'imsg') { el.color = '#fff'; el.fill = [IMSG.red, IMSG.blue, IMSG.grey].includes(el.fill) ? el.fill : IMSG.blue; }
      Ed.render(); renderPanel();
    } else if (el && el.type === 'thought') {
      addBubble(id, ST.bubbleFill); renderPanel();
    } else {
      addBubble(id, ST.bubbleFill); renderPanel();
    }
  }));

  p.querySelectorAll('[data-imsgc]').forEach(b => b.addEventListener('click', () => {
    const el = selected();
    if (!el || el.type !== 'bubble') return;
    el.kind = 'imsg'; el.fill = b.dataset.imsgc; el.color = '#fff';
    Ed.snapshot(); Ed.render(); renderPanel();
  }));

  p.querySelectorAll('[data-thmode]').forEach(b => b.addEventListener('click', () => {
    const el = selected();
    if (!el || el.type !== 'thought') return;
    const m = b.dataset.thmode;
    el.inner = m === 'text' ? null : m;
    if (m === 'sticker' && !el.innerSrc) {
      const first = ST.manifests.bam[0] || ST.manifests.jelly[0] || ST.manifests.line[0];
      if (first) { el.innerSrc = `stickers/${ST.manifests.bam[0] ? 'bam' : 'jelly'}/${first.file}`; loadStickerImg(el.innerSrc); }
    }
    Ed.snapshot(); Ed.render(); renderPanel();
  }));

  p.querySelectorAll('[data-themoji]').forEach(b => b.addEventListener('click', () => {
    const el = selected();
    if (!el || el.type !== 'thought') return;
    el.inner = 'emoji'; el.innerEmoji = b.dataset.themoji;
    Ed.snapshot(); Ed.render(); renderPanel();
  }));
  const thInput = p.querySelector('#thEmojiInput');
  if (thInput) thInput.addEventListener('input', () => {
    const el = selected();
    if (el && el.type === 'thought') { el.inner = 'emoji'; el.innerEmoji = thInput.value; Ed.render(); }
  });
  p.querySelectorAll('[data-thsrc]').forEach(b => b.addEventListener('click', () => {
    ST.thoughtSrc = b.dataset.thsrc;
    renderPanel();
  }));
  p.querySelectorAll('[data-thsticker]').forEach(b => b.addEventListener('click', () => {
    const el = selected();
    if (!el || el.type !== 'thought') return;
    const src = `stickers/${b.dataset.thdir}/${b.dataset.thsticker}`;
    loadStickerImg(src);
    el.inner = 'sticker'; el.innerSrc = src;
    Ed.snapshot(); Ed.render(); renderPanel();
  }));
  p.querySelectorAll('[data-thheart]').forEach(b => b.addEventListener('click', () => {
    const el = selected();
    if (!el || el.type !== 'thought') return;
    el.heart = !el.heart;
    Ed.snapshot(); Ed.render(); renderPanel();
  }));

  p.querySelectorAll('[data-bfill]').forEach(b => b.addEventListener('click', () => {
    ST.bubbleFill = b.dataset.bfill;
    const el = selected();
    if (el && el.type === 'bubble') { el.fill = ST.bubbleFill; Ed.render(); }
    renderPanel();
  }));

  p.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => {
    ST.stickerSrc = b.dataset.src;
    renderPanel();
  }));

  p.querySelectorAll('[data-sticker]').forEach(b => b.addEventListener('click', () => {
    const cat = b.dataset.cat;
    const dir = cat === 'jelly' ? 'jelly' : cat === 'bam' ? 'bam' : 'line';
    insertSticker(`stickers/${dir}/${b.dataset.sticker}`);
  }));

  p.querySelectorAll('[data-deco]').forEach(b => b.addEventListener('click', () => {
    const el = Ed.addDeco(b.dataset.deco);
    Ed.render(); updateEmpty(); updateSelbar();
    toast('데코를 얹었어요');
  }));

  p.querySelectorAll('[data-pcat]').forEach(b => b.addEventListener('click', () => {
    ST.phraseCat = b.dataset.pcat;
    renderPanel();
  }));

  p.querySelectorAll('[data-phrase]').forEach(b => b.addEventListener('click', () => {
    const raw = decodeURIComponent(b.dataset.phrase);
    const preset = TEXT_PRESETS.find(x => x.id === b.dataset.ppreset);
    addPhraseText(raw, preset);
  }));

  p.querySelectorAll('[data-emoji]').forEach(b => b.addEventListener('click', () => {
    const el = Ed.addText(b.dataset.emoji, { st: { font: 'emoji', size: 120, color: PAL.ink } });
    Ed.render(); updateEmpty(); updateSelbar();
  }));
}

/* ---------- add flows ---------- */
function addTextFromPanel() {
  const el = selected();
  const pr = ST.preset;
  const draft = $('#taText') ? $('#taText').value : ST.draftText;
  const e = Ed.addText(draft || '크로플', pr);
  if (!draft) e.text = pr.sample || '크로플';
  e.font = ST.font; e.color = ST.textColor;
  ensureFont(e.font).then(() => Ed.render());
  Ed.render(); updateEmpty(); updateSelbar();
  toast('글씨를 넣었어요');
}

function applyPreset(pr) {
  if (!pr) return;
  ST.preset = pr;
  const el = selected();
  if (el && el.type === 'text') {
    const st = pr.st;
    el.font = st.font; el.weight = st.weight || null;
    el.size = (st.size || 130) * Ed.W / 1080;
    el.color = st.color;
    el.s1 = st.s1 ? Object.assign({}, st.s1) : null;
    el.s2 = st.s2 ? Object.assign({}, st.s2) : null;
    el.shadow = st.shadow ? Object.assign({}, st.shadow) : null;
    el.bg = st.bg ? Object.assign({}, st.bg) : null;
    el.hl = st.hl || null;
    el.presetId = pr.id;
    ensureFont(el.font).then(() => Ed.render());
    Ed.render(); renderPanel();
  } else {
    const e = Ed.addText(ST.draftText || pr.sample || '크로플', pr);
    ensureFont(e.font).then(() => Ed.render());
    Ed.render(); updateEmpty(); updateSelbar(); renderPanel();
  }
}

function addBox(color, style) {
  const el = Ed.addBox(color, style);
  Ed.render(); updateEmpty(); updateSelbar();
}

function addBubble(kind, fill) {
  const el = Ed.addBubble(kind, kind === 'imsg' ? IMSG.blue : fill);
  if (kind === 'imsg') { el.color = '#fff'; el.size = 42 * Ed.W / 1080; }
  if (kind === 'starburst') el.size = 50 * Ed.W / 1080;
  ensureFont(el.font).then(() => Ed.render());
  Ed.render(); updateEmpty(); updateSelbar();
}

function addStack() {
  const el = Ed.addStack({});
  ensureFont('Pretendard');
  Ed.render(); updateEmpty(); updateSelbar(); renderPanel();
  toast('2단 겹친 박스 — 위/아래 글씨 각각 수정돼요');
}

function addPhraseText(text, preset) {
  const pr = preset || ST.preset;
  const lines = text.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length));
  const isFrame = /[─═╔╗╚╝╭╮╰╯│]/.test(text);
  const e = Ed.addText(text, pr);
  if (isFrame) {
    // 챡 프레임은 장식 없이 깔끔한 타이포로
    e.color = PAL.ink; e.font = 'Pretendard'; e.weight = 500;
    e.s1 = null; e.s2 = null; e.shadow = null; e.bg = null; e.hl = null;
    e.presetId = null;
    e.size = clamp((Ed.W * 0.84) / Math.max(6, maxLen) / 0.62, 22, 56);
    e.lineH = 1.15;
  } else {
    // 긴 문구는 캔버스에 맞게 자동 축소
    const base = (pr.st.size || 130) * Ed.W / 1080;
    const byWidth = (Ed.W * 0.78) / Math.max(4, maxLen) / 0.62;
    const byHeight = (Ed.H * 0.72) / Math.max(1, lines.length) / 1.2;
    e.size = clamp(Math.min(base, byWidth, byHeight), 16, base);
    if (lines.length > 1) e.lineH = 1.05;
  }
  ensureFont(e.font).then(() => Ed.render());
  Ed.render(); updateEmpty(); updateSelbar();
  toast('문구를 넣었어요');
}

function insertSticker(src) {
  const img = new Image();
  img.onload = () => {
    Ed.imgCache[src] = img;
    const el = Ed.addSticker(src, img.naturalWidth, img.naturalHeight, { size: src.includes('line_') ? 0.32 : 0.28 });
    Ed.render(); updateEmpty(); updateSelbar();
  };
  img.onerror = () => toast('이미지를 불러오지 못했어요');
  img.src = src;
}

/* 내 이미지 → 스티커 (흰 배경 누끼 옵션) */
$('#fileSticker').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try { await img.decode(); } catch (err) { toast('이미지를 열 수 없어요'); return; }
  // 흰 배경 자동 누끼 (큰 사진은 1400px로 줄여서 처리)
  const maxSide = 1400;
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  try { knockOutWhite(ctx, c.width, c.height); } catch (err) { }
  const out = new Image();
  await new Promise(res => { out.onload = res; out.src = c.toDataURL('image/png'); });
  Ed.imgCache['mine:' + url] = out;
  const el = Ed.addSticker('mine:' + url, out.naturalWidth, out.naturalHeight, { size: 0.34 });
  Ed.render(); updateEmpty(); updateSelbar();
});

function knockOutWhite(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h);
  const p = d.data;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const isWhite = i => p[i * 4] > 236 && p[i * 4 + 1] > 236 && p[i * 4 + 2] > 236;
  const push = i => { if (!seen[i] && isWhite(i)) { seen[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop();
    p[i * 4 + 3] = 0;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  ctx.putImageData(d, 0, 0);
}

/* ---------- tabs ---------- */
$$('#tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

/* ---------- save ---------- */
$('#btnSave').addEventListener('click', () => {
  $('#saveSheet').hidden = false;
  const copySupported = !!(navigator.clipboard && window.ClipboardItem);
  $('#btnCopy').hidden = !copySupported;
});
$$('[data-close]').forEach(b => b.addEventListener('click', () => { $('#saveSheet').hidden = true; }));

function exportFactor() {
  return Math.max(1.33, 1440 / Ed.W);
}

async function makeBlob() {
  await ensureAllUsedFonts();
  const factor = exportFactor();
  const c = Ed.exportCanvas(factor);
  return await new Promise(res => c.toBlob(b => res(b), 'image/png'));
}
function fileName() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `chakk_ohtt_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.png`;
}
$('#btnDownload').addEventListener('click', async () => {
  const btn = $('#btnDownload');
  btn.textContent = '만드는 중…';
  try {
    const blob = await makeBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    toast('PNG 저장을 시작했어요');
    $('#saveSheet').hidden = true;
  } catch (e) { toast('저장에 실패했어요. 한 번 더 눌러주세요.', 3000); }
  btn.textContent = 'PNG로 저장';
});
$('#btnShare').addEventListener('click', async () => {
  try {
    const blob = await makeBlob();
    const file = new File([blob], fileName(), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '챡×오뜨 사진꾸미기' });
      $('#saveSheet').hidden = true;
    } else {
      toast('이 브라우저는 공유를 지원하지 않아요. PNG로 저장해 주세요.', 3000);
    }
  } catch (e) { }
});
$('#btnCopy').addEventListener('click', async () => {
  try {
    const blob = await makeBlob();
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
    toast('이미지를 복사했어요 — 인스타에 붙여넣기');
    $('#saveSheet').hidden = true;
  } catch (e) { toast('복사가 안 됐어요. PNG로 저장해 주세요.', 3000); }
});

/* ---------- undo / redo ---------- */
$('#btnUndo').addEventListener('click', () => { Ed.undo(); refreshView(); renderPanel(); });
$('#btnRedo').addEventListener('click', () => { Ed.redo(); refreshView(); renderPanel(); });
Ed.onChange = () => {
  $('#btnUndo').disabled = Ed.hist.length < 2;
  $('#btnRedo').disabled = Ed.fut.length === 0;
  saveLocal();
};
function saveLocal() {
  try {
    localStorage.setItem('chakk_els', JSON.stringify({ els: Ed.els, ratio: Ed.ratio, W: Ed.W, H: Ed.H }));
  } catch (e) { }
}
function loadLocal() {
  try {
    const raw = localStorage.getItem('chakk_els');
    if (!raw) return false;
    const o = JSON.parse(raw);
    if (!o.els || !o.els.length) return false;
    Ed.els = o.els; Ed.ratio = o.ratio || '4:5'; Ed.W = o.W || 1080; Ed.H = o.H || 1350;
    Ed.nextId = Ed.els.length + 2;
    Ed.hist = [JSON.stringify(Ed.els)];
    return true;
  } catch (e) { return false; }
}

/* ---------- boot ---------- */
async function loadManifests() {
  const get = async (p) => { try { return await (await fetch(p)).json(); } catch (e) { return []; } };
  const [a, b, c] = await Promise.all([
    get('stickers/line/manifest.json'), get('stickers/jelly/manifest.json'), get('stickers/bam/manifest.json')
  ]);
  ST.manifests.line = a; ST.manifests.jelly = b; ST.manifests.bam = c;
}

window.addEventListener('resize', () => { fitStage(); });
window.addEventListener('orientationchange', () => setTimeout(fitStage, 250));

(async function boot() {
  await loadManifests();
  if (loadLocal()) {
    Ed.els.forEach(el => {
      const src = el.type === 'sticker' ? el.src
        : (el.type === 'thought' && el.inner === 'sticker' ? el.innerSrc : null);
      if (src && !Ed.imgCache[src]) {
        const im = new Image();
        im.onload = () => { Ed.imgCache[src] = im; Ed.render(); };
        im.src = src;
      }
    });
  }
  Ed.render();
  fitStage();
  updateEmpty();
  updateSelbar();
  renderPanel();
  ensureFont('BM꾸불림체');
  ensureFont('온글잎 쑴체');
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
})();
