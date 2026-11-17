import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/addons/OrbitControls.js';
import { CATEGORIES, STRUCTURES, HEMI_LONG, HIDDEN_BY_DEFAULT } from './catalog.js';

const $ = (id) => document.getElementById(id);
const HIGHLIGHT = new THREE.Color('#ffb000');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SIDE_SHORT = { L: 'G', R: 'D', M: '' };

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------------------------------------------------------- état
const state = {
  structures: [],          // une entrée par maillage (côté)
  byId: new Map(),
  byKey: new Map(),        // clé -> [structures]
  selection: new Set(),    // ids sélectionnés
  primary: null,           // structure affichée dans la fiche
  clickPoint: null,
  catFocus: null,          // catégorie surlignée
  hemi: { L: true, R: true, M: true },
  isolate: null,           // Set d'ids, ou null
  others: 'ghost',
  showLabels: false,
  hover: null,
  clip: { axis: 'none', t: 0.5, flip: false },
  quiz: null,
};

// ---------------------------------------------------------------- scène
const canvas = $('canvas');
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 1, 3000);
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4250, 1.25));
const headlight = new THREE.DirectionalLight(0xffffff, 1.6);
headlight.position.set(0.3, 0.6, 1);
camera.add(headlight);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !reduceMotion;
controls.dampingFactor = 0.12;
controls.rotateSpeed = 0.8;
controls.minDistance = 30;
controls.maxDistance = 900;

const clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const brainBox = new THREE.Box3();

function readStageColor() {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#0b1016';
  scene.background = new THREE.Color(c);
}
readStageColor();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readStageColor);
new MutationObserver(readStageColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  idTarget.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
  requestOcclusion();
}

// tampon d'identifiants (pour savoir quelles étiquettes sont visibles)
const idTarget = new THREE.WebGLRenderTarget(2, 2);
let idPixels = null;

// ---------------------------------------------------------------- chargement
async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  const total = +res.headers.get('content-length') || 0;
  if (!res.body || !total) return new Uint8Array(await res.arrayBuffer()).buffer;
  const reader = res.body.getReader();
  const chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    onProgress(Math.min(1, got / total));
  }
  const out = new Uint8Array(got); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

async function load() {
  const [index, bin] = await Promise.all([
    fetch('./data/meshes.json').then((r) => r.json()),
    fetchWithProgress('./data/meshes.bin', (p) => { $('loading-bar').style.width = `${Math.round(p * 100)}%`; }),
  ]);

  // couleurs : teinte de la catégorie, variations entre structures voisines
  const catCount = {};
  const keyOrder = Object.keys(STRUCTURES);
  const keyColor = {};
  for (const key of keyOrder) {
    const [, cat] = STRUCTURES[key];
    const i = (catCount[cat] = (catCount[cat] ?? -1) + 1);
    const base = new THREE.Color(CATEGORIES.find((c) => c.id === cat).color);
    const dh = ((i % 3) - 1) * 0.03;
    const dl = (i % 2 ? 0.07 : -0.06) + (i % 4 === 3 ? 0.04 : 0);
    keyColor[key] = base.clone().offsetHSL(dh, 0, dl);
  }

  index.structures.forEach((e, n) => {
    const meta = STRUCTURES[e.key];
    if (!meta) return;
    const [name, cat, desc] = meta;
    const q = new Uint16Array(bin, e.posOffset, e.vertCount * 3);
    const pos = new Float32Array(e.vertCount * 3);
    for (let i = 0; i < e.vertCount; i++) {
      for (let a = 0; a < 3; a++) {
        pos[i * 3 + a] = e.min[a] + (q[i * 3 + a] / 65535) * (e.max[a] - e.min[a]);
      }
    }
    const idx = new Uint16Array(bin, e.idxOffset, e.triCount * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();

    const color = keyColor[e.key];
    const mat = new THREE.MeshStandardMaterial({ color: color.clone(), roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    const pickId = n + 1;
    const idMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    idMat.color.setRGB(((pickId >> 16) & 255) / 255, ((pickId >> 8) & 255) / 255, (pickId & 255) / 255, THREE.LinearSRGBColorSpace);

    const s = {
      id: e.id, key: e.key, hemi: e.hemi, cat, name, desc, color, mesh, mat, idMat, pickId,
      center: new THREE.Vector3(...e.center),
      userVisible: !HIDDEN_BY_DEFAULT.has(e.key),
      tris: e.triCount,
      candidates: [], anchor: null, labelEl: null, labelVisible: false,
    };
    mesh.userData.s = s;
    scene.add(mesh);
    state.structures.push(s);
    state.byId.set(s.id, s);
    if (!state.byKey.has(s.key)) state.byKey.set(s.key, []);
    state.byKey.get(s.key).push(s);
    if (e.key !== 'CerebralWhiteMatter') brainBox.union(geo.boundingBox);
  });
  state.byPick = new Map(state.structures.map((s) => [s.pickId, s]));

  const brainCenter = brainBox.getCenter(new THREE.Vector3());
  for (const s of state.structures) computeCandidates(s, brainCenter);

  controls.target.copy(brainCenter);
  resize();
  setView('left-front', false);
  buildTree();
  bindUI();
  applyState();
  $('loading').hidden = true;
  animate();
}

// points d'ancrage possibles pour l'étiquette (répartis sur la surface)
function computeCandidates(s, brainCenter) {
  const pos = s.mesh.geometry.attributes.position;
  const n = pos.count;
  const step = Math.max(1, Math.floor(n / 1500));
  const pts = [];
  for (let i = 0; i < n; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i));
  // cible : centre de la structure poussé vers l'extérieur du cerveau
  const out = s.center.clone().sub(brainCenter);
  const target = s.center.clone().add(out.lengthSq() > 1 ? out.normalize().multiplyScalar(12) : out);
  const chosen = [];
  let best = pts[0], bd = Infinity;
  for (const p of pts) { const d = p.distanceToSquared(target); if (d < bd) { bd = d; best = p; } }
  chosen.push(best);
  const dmin = pts.map((p) => p.distanceToSquared(best));
  while (chosen.length < 14 && chosen.length < pts.length) {
    let bi = 0, bv = -1;
    for (let i = 0; i < pts.length; i++) if (dmin[i] > bv) { bv = dmin[i]; bi = i; }
    if (bv < 4) break;
    const p = pts[bi]; chosen.push(p);
    for (let i = 0; i < pts.length; i++) dmin[i] = Math.min(dmin[i], pts[i].distanceToSquared(p));
  }
  chosen.sort((a, b) => a.distanceToSquared(target) - b.distanceToSquared(target));
  s.candidates = chosen;
  s.anchor = chosen[0];
}

// ---------------------------------------------------------------- visibilité et matériaux
function focusSet() {
  if (state.quiz && state.quiz.mode === 'find') return state.quiz.revealed ? new Set([state.quiz.target.id]) : null;
  if (state.selection.size) return state.selection;
  if (state.catFocus) {
    return new Set(state.structures.filter((s) => s.cat === state.catFocus && baseVisible(s)).map((s) => s.id));
  }
  return null;
}
function baseVisible(s) {
  return s.userVisible && state.hemi[s.hemi] && (!state.isolate || state.isolate.has(s.id));
}
function isGhost(s, focus) { return focus && !focus.has(s.id) && state.others === 'ghost'; }
function sceneVisible(s, focus) {
  if (!baseVisible(s)) return false;
  if (focus && !focus.has(s.id) && state.others === 'hidden') return false;
  return true;
}

function applyState() {
  const focus = focusSet();
  const single = state.selection.size > 0 || (state.quiz && state.quiz.mode === 'find' && state.quiz.revealed);
  for (const s of state.structures) {
    const vis = sceneVisible(s, focus);
    s.mesh.visible = vis;
    const m = s.mat;
    const ghost = isGhost(s, focus);
    m.transparent = ghost;
    m.opacity = ghost ? 0.11 : 1;
    m.depthWrite = !ghost;
    s.mesh.renderOrder = ghost ? 2 : 0;
    m.color.copy(s.color);
    m.emissive.setRGB(0, 0, 0);
    m.emissiveIntensity = 1;
    if (focus && focus.has(s.id)) {
      if (single) { m.color.lerp(HIGHLIGHT, 0.7); m.emissive.copy(HIGHLIGHT).multiplyScalar(0.3); }
      else { m.emissive.copy(s.color).multiplyScalar(0.25); }
    } else if (ghost) {
      m.color.lerp(new THREE.Color(0x9aa6b5), 0.5);
    }
    if (state.hover === s && !(focus && focus.has(s.id)) && !state.quiz) {
      m.emissive.setRGB(0.18, 0.18, 0.2);
    }
    m.needsUpdate = true;
  }
  updateTree();
  updateCard();
  updateLabelsSet();
  $('restore').hidden = !state.isolate && !state.structures.some((s) => !s.userVisible && !HIDDEN_BY_DEFAULT.has(s.key));
  requestOcclusion();
}

// ---------------------------------------------------------------- sélection
function select(ids, { point = null, focusCam = false } = {}) {
  state.catFocus = null;
  state.selection = new Set(ids);
  state.primary = ids.length ? state.byId.get(ids[0]) : null;
  state.clickPoint = point;
  applyState();
  if (focusCam && ids.length) focusOn(ids.map((id) => state.byId.get(id)));
  if (window.innerWidth <= 820 && ids.length) $('app').dataset.drawer = 'closed';
}
function clearSelection() {
  state.selection = new Set(); state.primary = null; state.catFocus = null; state.clickPoint = null;
  applyState();
}

// ---------------------------------------------------------------- caméra
const views = {
  left: [-1, 0, 0], right: [1, 0, 0], front: [0, 0, -1], back: [0, 0, 1],
  top: [0, 1, 0.001], bottom: [0, -1, -0.001], 'left-front': [-0.82, 0.32, -0.48],
};
let camAnim = null;
// écran étroit (téléphone en portrait) : on recule pour garder tout le cerveau dans le cadre
const aspectFactor = () => Math.max(1, 1.05 / Math.max(camera.aspect, 0.3));
function animateCamera(toPos, toTarget, animate = true) {
  if (!animate || reduceMotion) {
    camera.position.copy(toPos); controls.target.copy(toTarget); controls.update(); requestOcclusion(); return;
  }
  camAnim = { t0: performance.now(), dur: 650, fromP: camera.position.clone(), toP: toPos, fromT: controls.target.clone(), toT: toTarget };
}
function setView(name, animate = true) {
  const dir = new THREE.Vector3(...views[name]).normalize();
  const center = state.isolate || state.selection.size ? controls.target.clone() : brainBox.getCenter(new THREE.Vector3());
  const dist = state.isolate || state.selection.size ? camera.position.distanceTo(controls.target) : 380 * aspectFactor();
  animateCamera(center.clone().add(dir.multiplyScalar(dist)), center, animate);
}
function focusOn(list) {
  const box = new THREE.Box3();
  for (const s of list) box.union(s.mesh.geometry.boundingBox);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  // on se place face à la structure (vue depuis l'extérieur du cerveau) si elle est excentrée
  let dir = camera.position.clone().sub(controls.target).normalize();
  const out = sphere.center.clone().sub(brainBox.getCenter(new THREE.Vector3()));
  if (list.length === 1 && out.length() > 25) {
    out.normalize(); out.y += 0.25;
    dir = out.normalize();
  }
  const dist = Math.max(320, sphere.radius * 4.5) * aspectFactor();
  animateCamera(sphere.center.clone().add(dir.multiplyScalar(dist)), sphere.center.clone());
}

// ---------------------------------------------------------------- coupe
function applyClip() {
  const { axis, t, flip } = state.clip;
  $('clip-pos').hidden = axis === 'none';
  $('clip-flip').hidden = axis === 'none';
  if (axis === 'none') { renderer.clippingPlanes = []; requestOcclusion(); return; }
  const a = { sagittal: 'x', coronal: 'z', axial: 'y' }[axis];
  const lo = brainBox.min[a], hi = brainBox.max[a];
  // coronale : on parcourt d'avant (z négatif) en arrière
  const v = lo + (hi - lo) * t;
  const n = new THREE.Vector3(); n[a] = flip ? -1 : 1;
  clipPlane.normal.copy(n);
  clipPlane.constant = flip ? v : -v;
  renderer.clippingPlanes = [clipPlane];
  requestOcclusion();
}
const clipped = (p) => renderer.clippingPlanes.length && clipPlane.distanceToPoint(p) < 0;

// ---------------------------------------------------------------- lancer de rayon
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const meshes = state.structures.filter((s) => s.mesh.visible).map((s) => s.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  for (const h of hits) if (!clipped(h.point)) return { s: h.object.userData.s, point: h.point.clone() };
  return null;
}

// ---------------------------------------------------------------- étiquettes
const labelsEl = $('labels');
let labelList = [];
function sideName(s) { return SIDE_SHORT[s.hemi] ? `${s.name} (${SIDE_SHORT[s.hemi]})` : s.name; }

function updateLabelsSet() {
  const focus = focusSet();
  const inQuiz = !!state.quiz;
  let list = [];
  if (!inQuiz) {
    if (focus) list = state.structures.filter((s) => focus.has(s.id) && s.mesh.visible);
    else if (state.showLabels) list = state.structures.filter((s) => s.mesh.visible);
  } else if (state.quiz.mode === 'find' && state.quiz.revealed) {
    list = [state.quiz.target];
  }
  if (focus && state.showLabels && !inQuiz && state.others !== 'normal') {
    // les noms des autres structures restent lisibles au survol seulement
  }
  for (const s of labelList) if (!list.includes(s) && s.labelEl) { s.labelEl.remove(); s.labelEl = null; }
  for (const s of list) {
    if (!s.labelEl) {
      const el = document.createElement('div');
      el.className = 'tag';
      el.textContent = sideName(s);
      el.style.setProperty('--dot', `#${s.color.getHexString()}`);
      el.addEventListener('click', (ev) => { ev.stopPropagation(); if (!state.quiz) select([s.id], { focusCam: false }); });
      labelsEl.appendChild(el);
      s.labelEl = el;
    }
    s.labelEl.classList.toggle('sel', state.selection.has(s.id) || (inQuiz && state.quiz.target === s));
  }
  labelList = list;
}

// Rendu du tampon d'identifiants : chaque structure opaque est peinte avec une couleur unique.
let occlusionDue = 0;
function requestOcclusion(delay = 140) { occlusionDue = performance.now() + delay; }
function renderIds() {
  const focus = focusSet();
  const saved = [];
  const oldBg = scene.background;
  scene.background = null;
  for (const s of state.structures) {
    saved.push(s.mesh.visible);
    if (s.mesh.visible && isGhost(s, focus)) s.mesh.visible = false;
    s.mesh.material = s.idMat;
  }
  headlight.visible = false;
  renderer.setRenderTarget(idTarget);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, camera);
  const w = idTarget.width, h = idTarget.height;
  if (!idPixels || idPixels.length !== w * h * 4) idPixels = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(idTarget, 0, 0, w, h, idPixels);
  renderer.setRenderTarget(null);
  headlight.visible = true;
  scene.background = oldBg;
  state.structures.forEach((s, i) => { s.mesh.visible = saved[i]; s.mesh.material = s.mat; });
}
const tmpV = new THREE.Vector3();
function screenOf(p) {
  tmpV.copy(p).project(camera);
  return { x: (tmpV.x * 0.5 + 0.5) * stage.clientWidth, y: (-tmpV.y * 0.5 + 0.5) * stage.clientHeight, z: tmpV.z };
}
function idAt(x, y) {
  const w = idTarget.width, h = idTarget.height;
  const px = Math.floor(x / 2), py = h - 1 - Math.floor(y / 2);
  if (px < 0 || py < 0 || px >= w || py >= h) return -1;
  const o = (py * w + px) * 4;
  return (idPixels[o] << 16) | (idPixels[o + 1] << 8) | idPixels[o + 2];
}
function anchorVisible(s, p) {
  if (clipped(p)) return false;
  const q = screenOf(p);
  if (q.z > 1) return false;
  // l'ancre doit être entourée d'une zone visible suffisante (et non d'un simple trou)
  let own = 0, total = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const id = idAt(q.x + dx * 2, q.y + dy * 2);
    if (id < 0) continue;
    total++;
    if (id === s.pickId) own++;
  }
  return total > 0 && own / total >= 0.4;
}
function updateOcclusion() {
  if (!labelList.length) return;
  renderIds();
  const focus = focusSet();
  for (const s of labelList) {
    const ghostAround = focus && focus.has(s.id) && state.others !== 'normal';
    let found = null;
    for (const c of s.candidates) if (anchorVisible(s, c)) { found = c; break; }
    if (!found && ghostAround) found = s.candidates.find((c) => !clipped(c)) || null;
    s.labelVisible = !!found;
    if (found) s.anchor = found;
  }
}
function placeLabels() {
  if (!labelList.length) return;
  const placed = [];
  const order = [...labelList].sort((a, b) => (state.selection.has(b.id) - state.selection.has(a.id)) || (b.tris - a.tris));
  for (const s of order) {
    const el = s.labelEl;
    if (!el) continue;
    if (!s.labelVisible) { el.style.display = 'none'; continue; }
    const q = screenOf(s.anchor);
    const w = el.offsetWidth || 120, h = 22;
    const rect = { x: q.x - 4, y: q.y - h / 2, w, h };
    const sel = el.classList.contains('sel');
    const overlap = !sel && placed.some((r) => rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y);
    if (overlap) { el.style.display = 'none'; continue; }
    placed.push(rect);
    el.style.display = '';
    const x = Math.max(4, Math.min(q.x - 4, stage.clientWidth - w - 4));
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(q.y - h / 2)}px)`;
  }
}

// ---------------------------------------------------------------- liste latérale
function buildTree() {
  const tree = $('tree');
  tree.innerHTML = '';
  for (const cat of CATEGORIES) {
    const keys = Object.keys(STRUCTURES).filter((k) => STRUCTURES[k][1] === cat.id && state.byKey.has(k));
    if (!keys.length) continue;
    const sec = document.createElement('section');
    sec.className = 'cat';
    sec.dataset.cat = cat.id;
    sec.dataset.open = 'false';
    sec.innerHTML = `
      <div class="cat-head">
        <button class="cat-toggle" aria-expanded="false">
          <svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>
          <span class="swatch" style="background:${cat.color}"></span>
          <span>${cat.name}</span> <span class="cat-count">${keys.length}</span>
        </button>
        <button class="icon-btn cat-focus" aria-pressed="false" title="Surligner toute la catégorie et afficher les noms" aria-label="Surligner ${cat.name}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
        </button>
        <button class="icon-btn cat-eye" title="Afficher / masquer la catégorie" aria-label="Afficher ou masquer ${cat.name}">${eyeIcon(true)}</button>
      </div>
      <ul class="cat-items"></ul>`;
    const ul = sec.querySelector('.cat-items');
    for (const key of keys) {
      const list = state.byKey.get(key);
      const li = document.createElement('li');
      li.className = 'item';
      li.dataset.key = key;
      const sides = list.filter((s) => s.hemi !== 'M')
        .sort((a, b) => a.hemi.localeCompare(b.hemi))
        .map((s) => `<button class="side" data-id="${s.id}" title="${HEMI_LONG[s.hemi]}">${SIDE_SHORT[s.hemi]}</button>`).join('');
      li.innerHTML = `<button class="item-name" title="${list[0].name}">${list[0].name}</button>${sides}
        <button class="icon-btn eye" aria-label="Afficher ou masquer ${list[0].name}">${eyeIcon(true)}</button>`;
      ul.appendChild(li);
    }
    tree.appendChild(sec);
  }

  tree.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const sec = btn.closest('.cat');
    const item = btn.closest('.item');
    if (btn.classList.contains('cat-toggle')) {
      const open = sec.dataset.open !== 'true';
      sec.dataset.open = String(open);
      btn.setAttribute('aria-expanded', String(open));
    } else if (btn.classList.contains('cat-focus')) {
      const cat = sec.dataset.cat;
      const on = state.catFocus !== cat;
      state.selection = new Set(); state.primary = null;
      state.catFocus = on ? cat : null;
      if (on) for (const s of state.structures) if (s.cat === cat) s.userVisible = true;
      applyState();
    } else if (btn.classList.contains('cat-eye')) {
      const members = state.structures.filter((s) => s.cat === sec.dataset.cat);
      const anyOn = members.some((s) => s.userVisible);
      for (const s of members) s.userVisible = !anyOn;
      dropHiddenFromSelection();
      applyState();
    } else if (item && btn.classList.contains('eye')) {
      const members = state.byKey.get(item.dataset.key);
      const anyOn = members.some((s) => s.userVisible);
      for (const s of members) s.userVisible = !anyOn;
      dropHiddenFromSelection();
      applyState();
    } else if (item && btn.classList.contains('side')) {
      const s = state.byId.get(btn.dataset.id);
      revealForSelection([s]);
      select([s.id], { focusCam: true });
    } else if (item && btn.classList.contains('item-name')) {
      const members = state.byKey.get(item.dataset.key);
      revealForSelection(members);
      const shown = members.filter((s) => state.hemi[s.hemi]);
      select((shown.length ? shown : members).map((s) => s.id), { focusCam: true });
    }
  });
}
function revealForSelection(list) {
  for (const s of list) { s.userVisible = true; if (state.isolate && !state.isolate.has(s.id)) state.isolate.add(s.id); }
  if (!list.some((s) => state.hemi[s.hemi])) { state.hemi[list[0].hemi] = true; syncHemiChips(); }
}
function dropHiddenFromSelection() {
  for (const id of [...state.selection]) if (!baseVisible(state.byId.get(id))) state.selection.delete(id);
  if (!state.selection.size) state.primary = null;
  else if (!state.selection.has(state.primary?.id)) state.primary = state.byId.get([...state.selection][0]);
}
function eyeIcon(on) {
  return on
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
}
function updateTree() {
  const q = norm($('search').value.trim());
  for (const sec of document.querySelectorAll('.cat')) {
    let matches = 0;
    for (const li of sec.querySelectorAll('.item')) {
      const members = state.byKey.get(li.dataset.key);
      const on = members.some((s) => s.userVisible);
      li.classList.toggle('off', !on);
      li.classList.toggle('selected', members.some((s) => state.selection.has(s.id)));
      const eye = li.querySelector('.eye');
      const want = on ? 'on' : 'off';
      if (eye.dataset.state !== want) { eye.innerHTML = eyeIcon(on); eye.dataset.state = want; }
      for (const b of li.querySelectorAll('.side')) b.style.borderColor = state.selection.has(b.dataset.id) ? 'var(--accent)' : '';
      const m = members[0];
      const hit = !q || norm(m.name).includes(q) || norm(m.desc).includes(q) || m.key.toLowerCase().includes(q);
      li.hidden = !hit;
      if (hit) matches++;
    }
    sec.hidden = q && !matches;
    if (q && matches) sec.dataset.open = 'true';
    const members = state.structures.filter((s) => s.cat === sec.dataset.cat);
    const anyOn = members.some((s) => s.userVisible);
    const ce = sec.querySelector('.cat-eye');
    const want = anyOn ? 'on' : 'off';
    if (ce.dataset.state !== want) { ce.innerHTML = eyeIcon(anyOn); ce.dataset.state = want; }
    sec.querySelector('.cat-focus').setAttribute('aria-pressed', String(state.catFocus === sec.dataset.cat));
  }
}

// ---------------------------------------------------------------- fiche
const fmt = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(0)}`;
const mni = (p) => `x ${fmt(p.x)}, y ${fmt(-p.z)}, z ${fmt(p.y)} mm`;
function updateCard() {
  const s = state.primary;
  const card = $('card');
  if (!s || state.quiz) { card.hidden = true; return; }
  card.hidden = false;
  const cat = CATEGORIES.find((c) => c.id === s.cat);
  $('card-swatch').style.background = cat.color;
  $('card-cat').textContent = cat.name;
  $('card-name').textContent = s.name;
  const sides = [...state.selection].map((id) => state.byId.get(id).hemi);
  $('card-hemi').textContent = sides.length > 1 ? 'Les deux hémisphères' : HEMI_LONG[s.hemi];
  $('card-desc').textContent = s.desc;
  let coords = `Centre (MNI) : ${mni(s.center)}`;
  if (state.clickPoint) coords += `<br>Point cliqué : ${mni(state.clickPoint)}`;
  $('card-coords').innerHTML = coords;
  const pair = state.byKey.get(s.key);
  $('act-both').hidden = pair.length < 2 || state.selection.size > 1;
  $('act-isolate').textContent = state.isolate ? 'Tout réafficher' : 'Isoler';
}

// ---------------------------------------------------------------- quiz
function quizPool() {
  return state.structures.filter((s) => baseVisible(s) && s.key !== 'CerebralWhiteMatter');
}
function startQuiz(mode = state.quiz?.mode || 'find') {
  state.selection = new Set(); state.primary = null; state.catFocus = null;
  state.quiz = { mode, score: state.quiz?.score ?? 0, total: state.quiz?.total ?? 0, target: null };
  $('quiz').hidden = false;
  $('qmode-find').setAttribute('aria-pressed', String(mode === 'find'));
  $('qmode-name').setAttribute('aria-pressed', String(mode === 'name'));
  nextQuestion();
}
function nextQuestion() {
  const qz = state.quiz;
  const pool = quizPool();
  $('quiz-scope').textContent = `Questions tirées des ${pool.length} structures visibles. Masquez des catégories dans la liste pour cibler la révision.`;
  if (pool.length < 2) { $('quiz-target').textContent = 'Affichez au moins deux structures.'; return; }
  let t;
  do { t = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && qz.target && t.key === qz.target.key);
  qz.target = t; qz.tries = 0; qz.revealed = false; qz.done = false;
  $('quiz-feedback').textContent = ''; $('quiz-feedback').className = 'quiz-feedback';
  if (qz.mode === 'find') {
    $('quiz-q').textContent = 'Cliquez dans la scène sur :';
    $('quiz-target').textContent = t.hemi === 'M' ? t.name : `${t.name} — ${HEMI_LONG[t.hemi].toLowerCase()}`;
    $('quiz-choices').hidden = true;
    state.selection = new Set();
  } else {
    $('quiz-q').textContent = 'Quelle est la structure en surbrillance ?';
    $('quiz-target').textContent = '';
    const others = [...new Map(pool.filter((s) => s.key !== t.key).map((s) => [s.key, s])).values()];
    const same = others.filter((s) => s.cat === t.cat).sort(() => Math.random() - 0.5);
    const rest = others.filter((s) => s.cat !== t.cat).sort(() => Math.random() - 0.5);
    const choices = [t, ...[...same, ...rest].slice(0, 3)].sort(() => Math.random() - 0.5);
    const box = $('quiz-choices');
    box.hidden = false;
    box.innerHTML = '';
    for (const c of choices) {
      const b = document.createElement('button');
      b.textContent = c.name;
      b.dataset.key = c.key;
      b.addEventListener('click', () => answerName(b, c));
      box.appendChild(b);
    }
    state.selection = new Set([t.id]);
    focusOn([t]);
  }
  updateScore();
  applyState();
}
function updateScore() { $('quiz-score').textContent = `${state.quiz.score} / ${state.quiz.total}`; }
function feedback(text, ok) { const f = $('quiz-feedback'); f.textContent = text; f.className = `quiz-feedback ${ok ? 'ok' : 'ko'}`; }
function answerFind(s) {
  const qz = state.quiz;
  if (qz.done) return;
  if (s === qz.target) {
    if (qz.tries === 0) qz.score++;
    qz.total++; qz.done = true; qz.revealed = true;
    feedback(qz.tries === 0 ? 'Exact !' : 'Trouvé.', true);
  } else {
    qz.tries++;
    const msg = s.key === qz.target.key ? 'Bonne structure, mais mauvais hémisphère.' : `Non : vous avez cliqué sur « ${sideName(s)} ».`;
    if (qz.tries >= 3) { qz.total++; qz.done = true; qz.revealed = true; feedback(`${msg} La réponse est en surbrillance.`, false); }
    else feedback(`${msg} Essayez encore.`, false);
  }
  updateScore();
  applyState();
}
function answerName(btn, c) {
  const qz = state.quiz;
  if (qz.done) return;
  qz.done = true; qz.total++;
  const ok = c.key === qz.target.key;
  if (ok) qz.score++;
  for (const b of $('quiz-choices').children) {
    if (b.dataset.key === qz.target.key) b.classList.add('ok');
    else if (b === btn) b.classList.add('ko');
  }
  feedback(ok ? 'Exact !' : `Non, il s'agit de : ${qz.target.name}.`, ok);
  updateScore();
}
function revealAnswer() {
  const qz = state.quiz;
  if (!qz || !qz.target) return;
  if (!qz.done) { qz.total++; qz.done = true; updateScore(); }
  if (qz.mode === 'find') { qz.revealed = true; focusOn([qz.target]); feedback(`Voici : ${sideName(qz.target)}.`, false); applyState(); }
  else {
    for (const b of $('quiz-choices').children) if (b.dataset.key === qz.target.key) b.classList.add('ok');
    feedback(`Il s'agit de : ${qz.target.name}.`, false);
  }
}
function stopQuiz() {
  state.quiz = null;
  $('quiz').hidden = true;
  state.selection = new Set(); state.primary = null;
  applyState();
}

// ---------------------------------------------------------------- interface
function syncHemiChips() {
  for (const h of ['L', 'R', 'M']) $(`hemi-${h}`).setAttribute('aria-pressed', String(state.hemi[h]));
}
function bindUI() {
  for (const h of ['L', 'R', 'M']) {
    $(`hemi-${h}`).addEventListener('click', () => {
      state.hemi[h] = !state.hemi[h];
      syncHemiChips();
      dropHiddenFromSelection();
      applyState();
    });
  }
  $('search').addEventListener('input', updateTree);
  $('search').addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const q = norm($('search').value.trim());
    const items = [...document.querySelectorAll('.item:not([hidden])')];
    const best = items.find((li) => norm(state.byKey.get(li.dataset.key)[0].name).startsWith(q))
      || items.find((li) => norm(state.byKey.get(li.dataset.key)[0].name).includes(q))
      || items[0];
    if (best) best.querySelector('.item-name').click();
  });
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('labels-btn').addEventListener('click', () => {
    state.showLabels = !state.showLabels;
    $('labels-btn').setAttribute('aria-pressed', String(state.showLabels));
    applyState();
  });
  $('others').addEventListener('change', (ev) => { state.others = ev.target.value; applyState(); });
  $('clip-axis').addEventListener('change', (ev) => { state.clip.axis = ev.target.value; applyClip(); });
  $('clip-pos').addEventListener('input', (ev) => { state.clip.t = ev.target.value / 1000; applyClip(); });
  $('clip-flip').addEventListener('click', () => { state.clip.flip = !state.clip.flip; applyClip(); });

  $('card-close').addEventListener('click', clearSelection);
  $('act-focus').addEventListener('click', () => focusOn([...state.selection].map((id) => state.byId.get(id))));
  $('act-isolate').addEventListener('click', () => {
    if (state.isolate) state.isolate = null;
    else { state.isolate = new Set(state.selection); focusOn([...state.selection].map((id) => state.byId.get(id))); }
    applyState();
  });
  $('act-hide').addEventListener('click', () => {
    for (const id of state.selection) state.byId.get(id).userVisible = false;
    clearSelection();
  });
  $('act-both').addEventListener('click', () => {
    const s = state.primary;
    const members = state.byKey.get(s.key);
    for (const m of members) state.hemi[m.hemi] = true;
    syncHemiChips();
    revealForSelection(members);
    select([s.id, ...members.filter((m) => m !== s).map((m) => m.id)], { focusCam: true });
  });
  $('restore').addEventListener('click', () => {
    state.isolate = null;
    for (const s of state.structures) s.userVisible = !HIDDEN_BY_DEFAULT.has(s.key);
    applyState();
  });

  $('menu-btn').addEventListener('click', () => {
    const app = $('app');
    app.dataset.drawer = app.dataset.drawer === 'open' ? 'closed' : 'open';
  });

  $('quiz-btn').addEventListener('click', () => (state.quiz ? stopQuiz() : startQuiz('find')));
  $('quiz-close').addEventListener('click', stopQuiz);
  $('qmode-find').addEventListener('click', () => startQuiz('find'));
  $('qmode-name').addEventListener('click', () => startQuiz('name'));
  $('quiz-next').addEventListener('click', nextQuestion);
  $('quiz-skip').addEventListener('click', revealAnswer);

  // clic et survol dans la scène
  let down = null;
  canvas.addEventListener('pointerdown', (ev) => {
    down = { x: ev.clientX, y: ev.clientY, b: ev.button };
    if (window.innerWidth <= 820) $('app').dataset.drawer = 'closed';
  });
  canvas.addEventListener('pointerup', (ev) => {
    if (!down || down.b !== 0) return;
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
    down = null;
    if (moved > 5) return;
    hideTooltip();
    const hit = pick(ev.clientX, ev.clientY);
    if (state.quiz) {
      if (state.quiz.mode === 'find' && hit) answerFind(hit.s);
      return;
    }
    if (hit) select([hit.s.id], { point: hit.point });
    else clearSelection();
  });
  let hoverQueued = null;
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse' || ev.buttons) { hideTooltip(); return; }
    hoverQueued = { x: ev.clientX, y: ev.clientY };
  });
  canvas.addEventListener('pointerleave', () => { hoverQueued = null; hideTooltip(); setHover(null); });
  state.processHover = () => {
    if (!hoverQueued) return;
    const { x, y } = hoverQueued; hoverQueued = null;
    const hit = pick(x, y);
    setHover(hit ? hit.s : null);
    const tip = $('tooltip');
    if (hit && !state.quiz) {
      const r = stage.getBoundingClientRect();
      tip.textContent = sideName(hit.s);
      tip.style.left = `${x - r.left}px`; tip.style.top = `${y - r.top}px`;
      tip.hidden = false;
    } else tip.hidden = true;
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  };
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !state.quiz && document.activeElement !== $('search')) clearSelection();
  });
  controls.addEventListener('change', () => requestOcclusion(90));
  window.addEventListener('resize', resize);
}
function hideTooltip() { $('tooltip').hidden = true; }
function setHover(s) {
  if (state.hover === s) return;
  const prev = state.hover;
  state.hover = s;
  for (const x of [prev, s]) {
    if (!x) continue;
    const focus = focusSet();
    if (focus && focus.has(x.id)) continue;
    if (x === s && !state.quiz) x.mat.emissive.setRGB(0.18, 0.18, 0.2);
    else x.mat.emissive.setRGB(0, 0, 0);
  }
}

// ---------------------------------------------------------------- boucle
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  if (camAnim) {
    const k = Math.min(1, (now - camAnim.t0) / camAnim.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(camAnim.fromP, camAnim.toP, e);
    controls.target.lerpVectors(camAnim.fromT, camAnim.toT, e);
    if (k >= 1) camAnim = null;
    requestOcclusion(60);
  }
  controls.update();
  state.processHover?.();
  // pulsation douce de la structure sélectionnée
  if (!reduceMotion) {
    const pulse = 0.22 + 0.13 * Math.sin(clock.getElapsedTime() * 3.2);
    const focus = focusSet();
    const single = state.selection.size > 0 || (state.quiz && state.quiz.revealed);
    if (focus && single) for (const id of focus) state.byId.get(id).mat.emissive.copy(HIGHLIGHT).multiplyScalar(pulse);
  }
  if (occlusionDue && now >= occlusionDue) { occlusionDue = 0; updateOcclusion(); }
  renderer.render(scene, camera);
  placeLabels();
}

load().catch((err) => {
  console.error(err);
  $('loading').innerHTML = `<div>Le modèle n'a pas pu être chargé : ${err.message}.<br>Ouvrez la page depuis un serveur web (pas en <code>file://</code>).</div>`;
});
