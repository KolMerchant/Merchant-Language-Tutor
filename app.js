import { LANGUAGES, langByCode, CATEGORIES, BUILTIN_WORDS, TOPICS, KID_TOPICS } from './languages.js';

/* =========================================================================
   Merchant Language Tutor — front end
   ========================================================================= */

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');

const LS = {
  state: 'mlt-state-v1',
  code: 'mlt-family-code',
  vocab: (code) => `mlt-vocab-${code}-v1`,
};
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const LEVELS = [
  { id: 'beginner', en: 'Beginner' },
  { id: 'elementary', en: 'Elementary' },
  { id: 'intermediate', en: 'Intermediate' },
  { id: 'advanced', en: 'Advanced' },
];
const KINDS = [
  { id: 'adult', en: 'Adult', note: 'Conversation practice + word cards' },
  { id: 'kid', en: 'Kid', note: 'Say-it games with stars' },
  { id: 'toddler', en: 'Little one', note: 'Tap pictures and listen' },
];
const COLORS = ['#5b4bd6', '#d63384', '#f2a516', '#2e9e5b', '#1e88e5', '#e2574c', '#00897b', '#8e24aa'];
const AVATARS = ['🧔', '👩', '👧', '🧒', '👶', '🧑', '👦', '👨', '👵', '👴', '🦁', '🐼', '🦄', '🐬', '🚀', '⚽', '🌻', '🦖'];
// People pictures accept a skin tone. '' = the default yellow.
const PEOPLE = new Set(['🧔', '👩', '👧', '🧒', '👶', '🧑', '👦', '👨', '👵', '👴']);
const TONES = [
  { v: '', label: 'Yellow' },
  { v: '\u{1F3FB}', label: 'Light' },
  { v: '\u{1F3FC}', label: 'Medium-light' },
  { v: '\u{1F3FD}', label: 'Medium' },
  { v: '\u{1F3FE}', label: 'Medium-dark' },
  { v: '\u{1F3FF}', label: 'Dark' },
];
const TONE_RE = /[\u{1F3FB}-\u{1F3FF}]/u;
// Older saves may hold a toned emoji in p.emoji: split it into picture + tone.
function normalizeAvatar(p) {
  const m = String(p.emoji || '').match(TONE_RE);
  if (m) { p.tone = m[0]; p.emoji = p.emoji.replace(TONE_RE, ''); }
  p.tone ||= '';
  return p;
}
function avatarOf(p) { return PEOPLE.has(p.emoji) ? p.emoji + (p.tone || '') : p.emoji; }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function tint(hex, amount = 0.82) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
function hashPin(pin) {
  let h = 5381;
  for (const ch of `mlt:${pin}`) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

/* ---------------------------------------------------------------- toast */
let toastTimer;
function toast(msg, ms = 3200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function explain(err) {
  const code = err?.message || '';
  if (code === 'openai_key_missing') return 'The AI isn’t set up yet: add OPENAI_API_KEY in Vercel, then redeploy.';
  if (code === 'family_code_required') return 'Please enter the family code.';
  if (code === 'Failed to fetch' || err?.name === 'TypeError') return 'No internet connection. Check Wi-Fi and try again.';
  return 'Something went wrong. Please try again.';
}

/* ------------------------------------------------------------------ api */
const server = { reachable: false, ai: false, sync: false };

async function api(path, { method = 'GET', json, raw = false } = {}) {
  const headers = {};
  const code = ls.get(LS.code);
  if (code) headers['x-family-code'] = code;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(path, { method, headers, body: json !== undefined ? JSON.stringify(json) : undefined });
  if (r.status === 401) { const e = new Error('family_code_required'); e.status = 401; throw e; }
  if (!r.ok) {
    let d = {};
    try { d = await r.json(); } catch { /* not json */ }
    const e = new Error(d.error || `http_${r.status}`);
    e.status = r.status;
    throw e;
  }
  return raw ? r : r.json();
}

/* ---------------------------------------------------------------- state */
function makeProfile(id, name, kind, age, emoji, color) {
  return { id, name, kind, age, emoji, tone: '', color, lang: 'es', levels: { es: 'beginner' }, progress: {}, updatedAt: 1 };
}
function defaultState() {
  return {
    v: 1, pin: null, pinAt: 0, deleted: [],
    profiles: [
      makeProfile('fatihi', 'Fatihi', 'adult', null, '🧔', '#5b4bd6'),
      makeProfile('helen', 'Helen', 'adult', null, '👩', '#d63384'),
      makeProfile('zuri', 'Zuri', 'kid', 7, '👧', '#f2a516'),
      makeProfile('zoe', 'Zoe', 'kid', 4, '🧒', '#2e9e5b'),
      makeProfile('zayn', 'Zayn', 'toddler', 1, '👶', '#1e88e5'),
    ],
  };
}
let state = null;

function prog(p, code = p.lang) {
  p.progress[code] ||= { stars: 0, turns: 0, cards: {}, resetAt: 0 };
  return p.progress[code];
}
function levelOf(p) { return p.levels?.[p.lang] || 'beginner'; }

function mergeProgress(x = {}, y = {}) {
  const out = {};
  for (const code of new Set([...Object.keys(x), ...Object.keys(y)])) {
    const a = x[code], b = y[code];
    if (!a || !b) { out[code] = clone(a || b); continue; }
    if ((a.resetAt || 0) !== (b.resetAt || 0)) { out[code] = clone((a.resetAt || 0) > (b.resetAt || 0) ? a : b); continue; }
    const cards = {};
    for (const id of new Set([...Object.keys(a.cards || {}), ...Object.keys(b.cards || {})])) {
      const ca = a.cards?.[id] || {}, cb = b.cards?.[id] || {};
      cards[id] = { seen: Math.max(ca.seen || 0, cb.seen || 0), said: Math.max(ca.said || 0, cb.said || 0) };
    }
    out[code] = { stars: Math.max(a.stars || 0, b.stars || 0), turns: Math.max(a.turns || 0, b.turns || 0), cards, resetAt: a.resetAt || 0 };
  }
  return out;
}
function mergeStates(remote, local) {
  if (!remote) return clone(local);
  if (!local) return clone(remote);
  const deleted = [...new Set([...(remote.deleted || []), ...(local.deleted || [])])];
  const byId = new Map();
  const order = [];
  for (const p of [...local.profiles, ...remote.profiles]) {
    if (deleted.includes(p.id)) continue;
    const cur = byId.get(p.id);
    if (!cur) { byId.set(p.id, clone(p)); order.push(p.id); continue; }
    const newer = (p.updatedAt || 0) > (cur.updatedAt || 0) ? p : cur;
    byId.set(p.id, { ...clone(newer), progress: mergeProgress(cur.progress, p.progress) });
  }
  const pinSrc = (remote.pinAt || 0) > (local.pinAt || 0) ? remote : local;
  return { v: 1, pin: pinSrc.pin, pinAt: pinSrc.pinAt || 0, deleted, profiles: order.map((id) => byId.get(id)) };
}
// Update the live state in place, so screens holding a profile keep a valid reference.
function applyState(next) {
  const live = new Map(state.profiles.map((p) => [p.id, p]));
  state.profiles = next.profiles.map((np) => {
    const cur = live.get(np.id);
    if (!cur) return np;
    for (const k of Object.keys(cur)) delete cur[k];
    return Object.assign(cur, np);
  });
  state.pin = next.pin; state.pinAt = next.pinAt; state.deleted = next.deleted;
}

let pushTimer = null;
function save() {
  ls.set(LS.state, JSON.stringify(state));
  if (!server.sync) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 1500);
}
async function syncNow() {
  if (!server.sync) return;
  try {
    const { state: remote } = await api('/api/state');
    const merged = mergeStates(remote, state);
    applyState(merged);
    ls.set(LS.state, JSON.stringify(state));
    await api('/api/state', { method: 'POST', json: { state: merged } });
  } catch (e) { console.warn('sync failed', e); }
}

/* ------------------------------------------------------------ words */
const wordCache = {};
async function getWords(lang) {
  if (wordCache[lang.code]) return wordCache[lang.code];
  let words = null;
  if (BUILTIN_WORDS[lang.code]) {
    words = Object.fromEntries(Object.entries(BUILTIN_WORDS[lang.code]).map(([id, w]) => [id, { word: w, roman: '' }]));
  } else {
    try { words = JSON.parse(ls.get(LS.vocab(lang.code)) || 'null'); } catch { words = null; }
    if (!words) {
      const items = CATEGORIES.flatMap((c) => c.cards.map((k) => ({ id: k.id, en: k.en })));
      const res = await api('/api/vocab', { method: 'POST', json: { language: { code: lang.code, name: lang.name, accent: lang.accent }, items } });
      words = {};
      for (const [id, v] of Object.entries(res.words || {})) {
        if (v && typeof v.word === 'string' && v.word.trim()) words[id] = { word: v.word.trim(), roman: String(v.roman || '').trim() };
      }
      if (Object.keys(words).length < 10) throw new Error('vocab_failed');
      ls.set(LS.vocab(lang.code), JSON.stringify(words));
    }
  }
  wordCache[lang.code] = words;
  return words;
}

/* ------------------------------------------------------------ speech out */
const audioEl = new Audio();
let speakToken = 0;
let endCurrent = null;
const memTts = new Map();

function stopSpeaking() {
  speakToken++;
  try { audioEl.pause(); } catch { /* ignore */ }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  if (endCurrent) { const f = endCurrent; endCurrent = null; f(); }
}

async function ttsBlob(text, style, slow, lang) {
  const key = `${lang.code}|${style}|${slow ? 1 : 0}|${text}`;
  if (memTts.has(key)) return memTts.get(key);
  const persist = style !== 'adult' || text.length < 60;
  const cacheUrl = `/__tts-cache/${encodeURIComponent(key)}`;
  let cache = null;
  if (persist) { try { cache = 'caches' in window ? await caches.open('mlt-tts-v1') : null; } catch { cache = null; } }
  if (cache) {
    const hit = await cache.match(cacheUrl).catch(() => null);
    if (hit) { const b = await hit.blob(); memTts.set(key, b); return b; }
  }
  const r = await api('/api/speak', { method: 'POST', json: { text, accent: lang.accent, style, slow }, raw: true });
  const b = await r.blob();
  if (memTts.size > 200) memTts.clear();
  memTts.set(key, b);
  if (cache) cache.put(cacheUrl, new Response(b, { headers: { 'Content-Type': 'audio/mpeg' } })).catch(() => {});
  return b;
}

function playBlob(blob, token) {
  return new Promise((resolve) => {
    if (token !== speakToken) return resolve();
    const url = URL.createObjectURL(blob);
    const done = () => { if (endCurrent === done) endCurrent = null; URL.revokeObjectURL(url); resolve(); };
    endCurrent = done;
    audioEl.onended = done;
    audioEl.onerror = done;
    audioEl.src = url;
    audioEl.play().catch(done);
  });
}

function browserSpeak(text, lang, slow, token) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth || token !== speakToken) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang.bcp;
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang.bcp.slice(0, 2).toLowerCase()));
    if (voice) u.voice = voice;
    u.rate = slow ? 0.75 : 0.95;
    const done = () => { if (endCurrent === done) endCurrent = null; resolve(); };
    endCurrent = done;
    u.onend = done; u.onerror = done;
    setTimeout(done, 4000 + text.length * 120);
    synth.speak(u);
  });
}

async function speak(text, { style = 'kid', slow = false, lang } = {}) {
  if (!text) return;
  stopSpeaking();
  const token = ++speakToken;
  if (server.ai) {
    try {
      const blob = await ttsBlob(text, style, slow, lang);
      return await playBlob(blob, token);
    } catch (e) { console.warn('tts failed, using device voice', e); }
  }
  return browserSpeak(text, lang, slow || style !== 'adult', token);
}

/* ------------------------------------------------------------ speech in */
const micSupported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
let micBlocked = false;
let activeRecorder = null;

function pickMime() {
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    try { if (MediaRecorder.isTypeSupported?.(m)) return m; } catch { /* ignore */ }
  }
  return '';
}

class Recorder {
  constructor() { this.finished = new Promise((r) => { this._resolve = r; }); }
  async start({ maxMs = 8000, autoStop = false } = {}) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mime = pickMime();
    this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => {
      this.stream.getTracks().forEach((t) => t.stop());
      try { this.ctx?.close(); } catch { /* ignore */ }
      const type = this.rec.mimeType || mime || 'audio/webm';
      this._resolve({ blob: new Blob(this.chunks, { type }), mime: type });
    };
    this.rec.start(250);
    this.startedAt = performance.now();
    this.timer = setTimeout(() => this.stop(), maxMs);
    if (autoStop) this.watchSilence();
    activeRecorder = this;
  }
  watchSilence() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const an = this.ctx.createAnalyser();
      an.fftSize = 1024;
      this.ctx.createMediaStreamSource(this.stream).connect(an);
      const data = new Uint8Array(an.fftSize);
      let heard = false, quietSince = null;
      const tick = () => {
        if (!this.rec || this.rec.state !== 'recording') return;
        an.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) { const x = (v - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        if (rms > 0.035) { heard = true; quietSince = null; }
        else if (heard) { quietSince ??= now; if (now - quietSince > 1300) return this.stop(); }
        else if (now - this.startedAt > 6000) return this.stop();
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* fall back to the time limit */ }
  }
  stop() {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
    if (activeRecorder === this) activeRecorder = null;
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
async function transcribe({ blob, mime }, lang, prompt) {
  if (!blob || blob.size < 800) return '';
  const audio = await blobToBase64(blob);
  const res = await api('/api/transcribe', { method: 'POST', json: { audio, mime, lang: lang.stt, prompt } });
  return res.text || '';
}

// Push-to-talk wiring shared by the games and the chat.
function wireMic(btn, label, { autoStop, maxMs, onAudio, idleText = 'Tap and talk' }) {
  let rec = null;
  let busy = false;
  const setIdle = () => { btn.classList.remove('recording', 'busy'); btn.textContent = '🎤'; if (label) label.textContent = idleText; };
  setIdle();
  btn.addEventListener('click', async () => {
    if (busy) return;
    if (rec) { rec.stop(); return; }
    stopSpeaking();
    rec = new Recorder();
    try {
      await rec.start({ autoStop, maxMs });
    } catch (e) {
      rec = null;
      micBlocked = true;
      toast('The microphone is blocked. Allow the mic for this site in the browser settings.', 5000);
      btn.dispatchEvent(new CustomEvent('micblocked'));
      return;
    }
    btn.classList.add('recording');
    btn.textContent = '⏹';
    if (label) label.textContent = autoStop ? 'Listening…' : 'Listening… tap to stop';
    const audio = await rec.finished;
    rec = null;
    busy = true;
    btn.classList.remove('recording');
    btn.classList.add('busy');
    btn.textContent = '⏳';
    if (label) label.textContent = 'Thinking…';
    try { await onAudio(audio); } finally { busy = false; if (btn.isConnected) setIdle(); }
  });
  return { setIdle };
}

/* ------------------------------------------------------------ matching */
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const similarity = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

function isMatch(heard, w, lang, age) {
  const H = norm(heard);
  if (!H) return false;
  const thr = age && age <= 4 ? 0.55 : 0.7;
  const T = norm(w.word);
  if (lang.script === 'other') {
    const h = H.replace(/\s/g, ''), t = T.replace(/\s/g, '');
    if (t && h.includes(t)) return true;
    const chars = [...t];
    if (chars.length && chars.filter((c) => h.includes(c)).length / chars.length >= 0.5) return true;
  }
  for (const target of [T, norm(w.roman)].filter(Boolean)) {
    if (` ${H} `.includes(` ${target} `)) return true;
    const words = H.split(' ');
    const n = target.split(' ').length;
    for (let i = 0; i + n <= words.length; i++) if (similarity(words.slice(i, i + n).join(' '), target) >= thr) return true;
    if (similarity(H, target) >= thr) return true;
  }
  return false;
}

/* ------------------------------------------------------------ ui helpers */
function render(html) {
  stopSpeaking();
  activeRecorder?.stop();
  closeModal();
  app.innerHTML = html;
  window.scrollTo(0, 0);
}
function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color || '#5b4bd6');
}
function topbar({ title, back = true, right = '' }) {
  return `<header class="topbar">
    ${back ? '<button class="icon-btn" data-act="back" aria-label="Back">⬅️</button>' : ''}
    <h1>${title}</h1>${right}</header>`;
}
function starsPill(p) { return `<span class="stars-pill">⭐ ${prog(p).stars}</span>`; }
function cardArt(card) {
  if (card.swatch) return `<div class="card-art"><div class="swatch" style="background:${card.swatch}"></div></div>`;
  if (card.number) return `<div class="card-art"><div class="number">${card.number}</div><div class="dots">${'<i></i>'.repeat(card.number)}</div></div>`;
  return `<div class="card-art"><div class="emoji">${card.emoji}</div></div>`;
}
function enWord(card) { return card.number ? String(card.number) : card.en.replace(/\s*\(.*\)/, ''); }
function burst() {
  const b = document.createElement('div');
  b.className = 'burst';
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('span');
    s.textContent = pick(['⭐', '🌟', '✨', '🎉']);
    s.style.left = '50%'; s.style.top = '45%';
    const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 180;
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    b.appendChild(s);
  }
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1300);
}
function on(sel, fn, root = app) { root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => fn(el, e))); }

/* ------------------------------------------------------------ modals */
let modalResolve = null;
function closeModal(value = null) {
  if (!modalRoot.firstChild) return;
  modalRoot.innerHTML = '';
  const r = modalResolve; modalResolve = null;
  r?.(value);
}
function openModal(html) {
  closeModal();
  modalRoot.innerHTML = `<div class="modal-back"><div class="modal">${html}</div></div>`;
  modalRoot.querySelector('.modal-back').addEventListener('click', (e) => { if (e.target.classList.contains('modal-back')) closeModal(null); });
  return new Promise((r) => { modalResolve = r; });
}
function pinModal(title, sub = '') {
  let pin = '';
  const p = openModal(`<h3>${esc(title)}</h3><div class="note">${esc(sub)}</div>
    <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
    <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}
      <button data-n="x" aria-label="Cancel">✖️</button><button data-n="0">0</button><button data-n="del" aria-label="Delete">⌫</button></div>`);
  const dots = modalRoot.querySelectorAll('.pin-dots i');
  const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
  on('[data-n]', (el) => {
    const n = el.dataset.n;
    if (n === 'x') return closeModal(null);
    if (n === 'del') pin = pin.slice(0, -1);
    else if (pin.length < 4) pin += n;
    paint();
    if (pin.length === 4) setTimeout(() => closeModal(pin), 120);
  }, modalRoot);
  return p;
}
function shakeAndRetry() { toast('Wrong PIN'); }
async function requirePin() {
  if (!state.pin) return true;
  const pin = await pinModal('Parent PIN', 'Enter the PIN to open settings');
  if (pin === null) return false;
  if (hashPin(pin) === state.pin) return true;
  shakeAndRetry();
  return false;
}
async function createPin() {
  for (;;) {
    const a = await pinModal('Create a parent PIN', 'Pick 4 numbers. Only grown-ups should know it.');
    if (a === null) return false;
    const b = await pinModal('Type it again', 'Just to be sure');
    if (b === null) return false;
    if (a === b) {
      state.pin = hashPin(a); state.pinAt = Date.now(); save();
      toast('PIN saved ✅');
      return true;
    }
    toast('Those didn’t match. Try again.');
  }
}
function confirmModal(text, yes = 'Yes', danger = false) {
  const p = openModal(`<h3>${esc(text)}</h3><div class="btn-row" style="justify-content:center;margin-top:16px">
    <button class="btn secondary" data-a="no">Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-a="yes">${esc(yes)}</button></div>`);
  on('[data-a]', (el) => closeModal(el.dataset.a === 'yes'), modalRoot);
  return p;
}
function choiceModal(title, options, current) {
  const p = openModal(`<h3>${esc(title)}</h3><div class="seg" style="flex-direction:column;margin-top:12px">
    ${options.map((o) => `<button data-v="${esc(o.id)}" class="${o.id === current ? 'on' : ''}" style="text-align:left;font-size:1.1rem">${o.label}</button>`).join('')}
    </div>`);
  on('[data-v]', (el) => closeModal(el.dataset.v), modalRoot);
  return p;
}

/* =========================================================================
   Screens
   ========================================================================= */

function screenFamilyCode(message = '') {
  setAccent();
  render(`<div class="center-screen">
    <img src="icons/icon-192.png" alt="" width="96" height="96" style="border-radius:24px">
    <h2 style="margin:0">Merchant Language Tutor</h2>
    <p class="note">Enter the family code to use the app on this device.</p>
    <form id="codeform" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      <input id="code" autocomplete="off" autocapitalize="none" style="border:2px solid var(--line);border-radius:14px;padding:14px;font-size:1.2rem;min-width:220px" placeholder="Family code">
      <button class="btn" type="submit">Continue</button>
    </form>
    <div class="note" style="color:var(--bad)">${esc(message)}</div></div>`);
  const input = document.getElementById('code');
  input.focus();
  document.getElementById('codeform').addEventListener('submit', (e) => {
    e.preventDefault();
    ls.set(LS.code, input.value.trim());
    boot();
  });
}

function screenHome() {
  setAccent();
  render(`<header class="topbar"><div class="brand" style="flex:1"><img src="icons/icon-192.png" alt=""><h1>Merchant Language Tutor</h1></div>
      <button class="icon-btn" data-act="settings" aria-label="Family settings">⚙️</button></header>
    <main class="page"><h2>Who’s learning today?</h2>
      <div class="profiles">${state.profiles.map((p) => {
        const lang = langByCode(p.lang);
        return `<button class="profile-tile" data-id="${p.id}" style="--c:${p.color};--cl:${tint(p.color)}">
          <div class="avatar">${avatarOf(p)}</div><div class="name">${esc(p.name)}</div>
          <div class="meta">${lang.flag} ${lang.name} · ⭐ ${prog(p).stars}</div></button>`;
      }).join('')}</div>
      ${server.ai ? '' : '<p class="note" style="margin-top:24px">⚠️ The AI voice and tutor aren’t connected yet, so the device voice is used and conversation practice is off. See the setup guide.</p>'}
    </main>`);
  on('.profile-tile', (el) => openProfile(state.profiles.find((p) => p.id === el.dataset.id)));
  on('[data-act=settings]', async () => { if (await requirePin()) screenSettings(); });
}

function openProfile(p) {
  setAccent(p.color);
  if (p.kind === 'adult') return screenAdultHome(p);
  return screenKidHome(p);
}

function langPill(p, clickable) {
  const lang = langByCode(p.lang);
  return `<button class="lang-pill" ${clickable ? 'data-act="lang"' : 'disabled'}>${lang.flag} ${lang.name}</button>`;
}
async function changeLanguage(p, then) {
  const v = await choiceModal('Which language?', LANGUAGES.map((l) => ({ id: l.code, label: `${l.flag} ${l.name} · ${l.native}` })), p.lang);
  if (!v || v === p.lang) return;
  p.lang = v; p.levels[v] ||= 'beginner'; p.updatedAt = Date.now(); save();
  then();
}

function screenKidHome(p) {
  const big = p.kind === 'toddler';
  const canTalk = p.kind === 'kid' && (p.age || 0) >= 6 && server.ai;
  render(`${topbar({ title: `${avatarOf(p)} ${esc(p.name)}`, right: `${langPill(p, false)}${starsPill(p)}` })}
    <main class="page">
      <h2>${big ? 'Tap a picture!' : 'Pick a game!'}</h2>
      <div class="tiles">${CATEGORIES.map((c) => `<button class="tile" data-cat="${c.id}"><span class="big">${c.icon}</span>${esc(c.en)}</button>`).join('')}</div>
      ${canTalk ? `<div class="section-label">Talk with Profe</div>
        <div class="tiles">${KID_TOPICS.map((t) => `<button class="tile" data-topic="${t.id}"><span class="big">${t.icon}</span>${esc(t.en)}</button>`).join('')}</div>` : ''}
    </main>`);
  on('[data-act=back]', screenHome);
  on('[data-cat]', (el) => {
    const cat = CATEGORIES.find((c) => c.id === el.dataset.cat);
    if (big) screenToddler(p, cat); else screenLearn(p, cat, 'learn');
  });
  on('[data-topic]', (el) => screenChat(p, KID_TOPICS.find((t) => t.id === el.dataset.topic)));
}

function screenAdultHome(p) {
  const lvl = LEVELS.find((l) => l.id === levelOf(p));
  render(`${topbar({ title: `${avatarOf(p)} ${esc(p.name)}`, right: `${langPill(p, true)}${starsPill(p)}` })}
    <main class="page">
      <div class="section-label">Talk with Profe · <button class="chip" data-act="level">${lvl.en} ✏️</button></div>
      ${server.ai ? `<div class="tiles">${TOPICS.map((t) => `<button class="tile" data-topic="${t.id}"><span class="big">${t.icon}</span>${esc(t.en)}</button>`).join('')}</div>`
        : '<p class="note">Conversation practice needs the AI connection (OPENAI_API_KEY). See the setup guide.</p>'}
      <div class="section-label">Picture words</div>
      <div class="tiles">${CATEGORIES.map((c) => `<button class="tile" data-cat="${c.id}"><span class="big">${c.icon}</span>${esc(c.en)}</button>`).join('')}</div>
    </main>`);
  on('[data-act=back]', screenHome);
  on('[data-act=lang]', () => changeLanguage(p, () => screenAdultHome(p)));
  on('[data-act=level]', async () => {
    const v = await choiceModal('Your level', LEVELS.map((l) => ({ id: l.id, label: l.en })), levelOf(p));
    if (!v) return;
    p.levels[p.lang] = v; p.updatedAt = Date.now(); save();
    screenAdultHome(p);
  });
  on('[data-topic]', (el) => screenChat(p, TOPICS.find((t) => t.id === el.dataset.topic)));
  on('[data-cat]', (el) => screenLearn(p, CATEGORIES.find((c) => c.id === el.dataset.cat), 'learn'));
}

async function loadWords(p, back) {
  const lang = langByCode(p.lang);
  if (BUILTIN_WORDS[lang.code] || wordCache[lang.code] || ls.get(LS.vocab(lang.code))) return getWords(lang);
  render(`<div class="center-screen"><div class="spinner"></div><p>Getting ${lang.name} words ready…</p></div>`);
  try { return await getWords(lang); } catch (e) {
    toast(e.message === 'vocab_failed' ? 'Couldn’t get the words. Try again.' : explain(e));
    back();
    return null;
  }
}

/* ---------- toddler: tap a picture, hear the word ---------- */
async function screenToddler(p, cat) {
  const words = await loadWords(p, () => screenKidHome(p));
  if (!words) return;
  const lang = langByCode(p.lang);
  const cards = cat.cards.filter((c) => words[c.id]);
  render(`${topbar({ title: `${cat.icon} ${esc(cat.en)}`, right: starsPill(p) })}
    <main class="page"><div class="toddler-grid">${cards.map((c) => `<button class="toddler-card" data-id="${c.id}">
      <div>${cardArt(c)}<div class="word"></div></div></button>`).join('')}</div></main>`);
  on('[data-act=back]', () => screenKidHome(p));
  on('.toddler-card', (el) => {
    const card = cards.find((c) => c.id === el.dataset.id);
    const w = words[card.id];
    el.querySelector('.word').textContent = w.word;
    el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce');
    const pr = prog(p);
    const rec = (pr.cards[card.id] ||= { seen: 0, said: 0 });
    if (!rec.seen) { pr.stars++; app.querySelector('.stars-pill').textContent = `⭐ ${pr.stars}`; }
    rec.seen++;
    save();
    speak(`${w.word}! ... ${w.word}!`, { style: 'toddler', lang });
  });
}

/* ---------- kids & adults: listen, then say it ---------- */
async function screenLearn(p, cat, mode) {
  const back = () => (p.kind === 'adult' ? screenAdultHome(p) : screenKidHome(p));
  const words = await loadWords(p, back);
  if (!words) return;
  const lang = langByCode(p.lang);
  const isAdult = p.kind === 'adult';
  const style = isAdult ? 'adult' : 'kid';
  const cards = shuffle(cat.cards.filter((c) => words[c.id]));
  const results = [];
  let i = 0, tries = 0, earned = 0, locked = false;

  render(`${topbar({ title: `${cat.icon} ${esc(cat.en)}${mode === 'quiz' ? ' · Quiz' : ''}`, right: starsPill(p) })}
    <main class="page learn">
      <div class="progress-dots">${cards.map(() => '<i></i>').join('')}</div>
      <div class="learn-card"><div class="art"></div><div class="word"></div><div class="roman"></div><div class="en"></div></div>
      <div class="feedback"></div><div class="heard"></div>
      <div class="controls">
        <button class="round" data-act="hear" aria-label="Hear it again">🔊</button>
        <button class="mic" aria-label="Talk">🎤</button>
        <button class="round" data-act="next" aria-label="Next">➡️</button>
      </div>
      <div class="mic-label"></div>
      <div class="said-row"></div>
    </main>`);
  on('[data-act=back]', back);

  const el = (s) => app.querySelector(s);
  const pill = el('.stars-pill');

  const promptFor = (card, w) => {
    if (mode === 'quiz') return isAdult ? '' : `What is this in ${lang.name}?`;
    if (isAdult) return w.word;
    return `${cap(enWord(card))}! In ${lang.name}, we say: ${w.word}. Can you say ${w.word}?`;
  };
  const reveal = (card, w) => {
    el('.word').textContent = w.word;
    el('.roman').textContent = w.roman || '';
  };

  function draw() {
    if (i >= cards.length) return finish();
    const card = cards[i], w = words[card.id];
    tries = 0; locked = false;
    app.querySelectorAll('.progress-dots i').forEach((d, k) => { d.className = k < i ? 'done' : k === i ? 'now' : ''; });
    el('.art').innerHTML = cardArt(card);
    if (mode === 'quiz') { el('.word').textContent = '❓'; el('.roman').textContent = ''; } else reveal(card, w);
    el('.en').textContent = isAdult || p.age >= 6 ? enWord(card) : '';
    el('.feedback').className = 'feedback'; el('.feedback').textContent = '';
    el('.heard').textContent = '';
    const pr = prog(p);
    (pr.cards[card.id] ||= { seen: 0, said: 0 }).seen++;
    save();
    const text = promptFor(card, w);
    if (text) speak(text, { style, lang, slow: isAdult });
  }

  async function success(card) {
    locked = true;
    const pr = prog(p);
    pr.stars++; earned++;
    pr.cards[card.id].said++;
    save();
    pill.textContent = `⭐ ${pr.stars}`;
    results[i] = true;
    const praise = pick(lang.praise);
    el('.feedback').className = 'feedback good';
    el('.feedback').textContent = `${praise} ⭐`;
    reveal(card, words[card.id]);
    burst();
    await speak(praise, { style, lang });
    await sleep(500);
    if (el('.learn')) { i++; draw(); }
  }

  async function miss(card, heardText) {
    const w = words[card.id];
    tries++;
    el('.heard').textContent = heardText ? `I heard: “${heardText}”` : '';
    if (!heardText) {
      el('.feedback').className = 'feedback try';
      el('.feedback').textContent = 'I didn’t hear you. Tap 🎤 and talk a bit louder!';
      return;
    }
    if (tries < 2) {
      el('.feedback').className = 'feedback try';
      el('.feedback').textContent = 'Almost! Listen and try again 👂';
      reveal(card, w);
      await speak(isAdult ? w.word : `${w.word}. Say ${w.word}!`, { style, lang, slow: true });
      return;
    }
    // Second miss: kids still get a star for trying; everyone moves on.
    locked = true;
    reveal(card, w);
    results[i] = false;
    if (!isAdult) {
      const pr = prog(p); pr.stars++; earned++; save(); pill.textContent = `⭐ ${pr.stars}`;
      el('.feedback').className = 'feedback good';
      el('.feedback').textContent = 'Good try! ⭐ Let’s do the next one.';
      await speak('Good try!', { style, lang });
    } else {
      el('.feedback').className = 'feedback try';
      el('.feedback').textContent = `It’s “${w.word}”. Moving on.`;
      await speak(w.word, { style, lang, slow: true });
    }
    await sleep(700);
    if (el('.learn')) { i++; draw(); }
  }

  const micBtn = el('.mic');
  if (!micSupported || micBlocked) showSaidIt();
  micBtn.addEventListener('micblocked', showSaidIt);
  wireMic(micBtn, el('.mic-label'), {
    autoStop: true, maxMs: isAdult ? 8000 : 6000, idleText: mode === 'quiz' ? 'Tap and say it!' : 'Tap and say it!',
    onAudio: async (audio) => {
      if (locked || i >= cards.length) return;
      const card = cards[i], w = words[card.id];
      let heardText = '';
      try { heardText = await transcribe(audio, lang, w.word); } catch (e) { toast(explain(e)); return; }
      if (isMatch(heardText, w, lang, p.age)) await success(card); else await miss(card, heardText);
    },
  });
  if (!micSupported) micBtn.disabled = true;

  function showSaidIt() {
    el('.said-row').innerHTML = '<button class="said-it">👍 I said it!</button>';
    el('.said-it').addEventListener('click', () => { if (!locked && i < cards.length) success(cards[i]); });
  }

  on('[data-act=hear]', () => {
    if (i >= cards.length) return;
    const card = cards[i], w = words[card.id];
    if (mode === 'quiz' && !isAdult) reveal(card, w);
    speak(mode === 'quiz' || isAdult ? w.word : promptFor(card, w), { style, lang, slow: true });
  });
  on('[data-act=next]', () => { if (!locked) { i++; draw(); } });

  function finish() {
    stopSpeaking();
    const good = results.filter(Boolean).length;
    const canQuiz = isAdult || (p.age || 0) >= 5;
    el('main').innerHTML = `<div class="learn-card"><div class="card-art"><div class="emoji">🏆</div></div>
      <div class="word">${isAdult ? `${good} / ${cards.length}` : `+${earned} ⭐`}</div>
      <div class="en">${isAdult ? 'said correctly' : 'You did it!'}</div></div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn" data-act="again">🔁 Play again</button>
        ${canQuiz && mode === 'learn' ? '<button class="btn" data-act="quiz">❓ Quiz me</button>' : ''}
        <button class="btn secondary" data-act="home">🏠 Games</button></div>`;
    burst();
    speak(isAdult ? pick(lang.praise) : `${pick(lang.praise)} You did it!`, { style, lang });
    on('[data-act=again]', () => screenLearn(p, cat, mode));
    on('[data-act=quiz]', () => screenLearn(p, cat, 'quiz'));
    on('[data-act=home]', back);
  }

  draw();
}

/* ---------- conversation with the AI tutor ---------- */
function screenChat(p, topic) {
  const lang = langByCode(p.lang);
  const isKid = p.kind !== 'adult';
  const history = [];
  let slow = isKid || levelOf(p) === 'beginner';
  let waiting = false;

  render(`${topbar({ title: `${topic.icon} ${esc(topic.en)}`, right: `<button class="chip ${slow ? 'on' : ''}" data-act="slow">🐢 Slow</button>${starsPill(p)}` })}
    <div class="chat-wrap">
      <div class="chat"></div>
      <div class="hint"></div>
      <form class="composer">
        <textarea rows="1" placeholder="${isKid ? 'Type here…' : `Type in ${lang.name} or English…`}"></textarea>
        <button class="send" type="submit" aria-label="Send">➤</button>
        <button class="mic" type="button" aria-label="Talk">🎤</button>
      </form>
    </div>`);
  on('[data-act=back]', () => (isKid ? screenKidHome(p) : screenAdultHome(p)));
  const chat = app.querySelector('.chat');
  const hint = app.querySelector('.hint');
  const ta = app.querySelector('textarea');
  const pill = app.querySelector('.stars-pill');
  on('[data-act=slow]', (el) => { slow = !slow; el.classList.toggle('on', slow); });

  const scroll = () => { chat.scrollTop = chat.scrollHeight; };
  const add = (node) => { chat.appendChild(node); scroll(); return node; };
  const div = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };

  function addTutor(res) {
    const b = add(div('bubble tutor', `<div class="txt">${esc(res.reply)}</div>
      ${res.romanized ? `<div class="roman">${esc(res.romanized)}</div>` : ''}
      <div class="en" hidden>${esc(res.english)}</div>
      <div class="bubble-actions"><button class="chip" data-a="say">🔊</button><button class="chip" data-a="en">🇬🇧 English</button></div>`));
    b.querySelector('[data-a=say]').addEventListener('click', () => speak(res.reply, { style: isKid ? 'kid' : 'adult', slow, lang }));
    b.querySelector('[data-a=en]').addEventListener('click', (e) => {
      const en = b.querySelector('.en'); en.hidden = !en.hidden; e.currentTarget.classList.toggle('on', !en.hidden); scroll();
    });
    hint.textContent = res.hint ? `💡 ${res.hint}` : '';
    speak(res.reply, { style: isKid ? 'kid' : 'adult', slow, lang });
  }

  async function ask(userText) {
    waiting = true;
    if (userText) {
      add(div('bubble me', esc(userText)));
      history.push({ role: 'user', content: userText });
    }
    const typing = add(div('typing', 'Profe is thinking…'));
    try {
      const res = await api('/api/tutor', {
        method: 'POST',
        json: { language: { name: lang.name, accent: lang.accent }, learner: { name: p.name, kind: isKid ? 'kid' : 'adult', age: p.age, level: levelOf(p) }, topic: topic.en, messages: history },
      });
      typing.remove();
      if (res.correction) {
        add(div('correction', `✏️ <b>Better:</b> ${esc(res.correction.better)}<br><span class="note">${esc(res.correction.why || '')}</span>`));
      }
      history.push({ role: 'assistant', content: res.reply });
      addTutor(res);
      if (userText) {
        const pr = prog(p); pr.turns++; pr.stars++; save(); pill.textContent = `⭐ ${pr.stars}`;
      }
    } catch (e) {
      typing.remove();
      toast(explain(e));
      if (userText) history.pop();
    } finally { waiting = false; }
  }

  app.querySelector('.composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = ta.value.trim();
    if (!t || waiting) return;
    ta.value = '';
    ask(t);
  });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); app.querySelector('.composer').requestSubmit(); } });

  const micBtn = app.querySelector('.composer .mic');
  if (!micSupported) micBtn.hidden = true;
  wireMic(micBtn, null, {
    autoStop: isKid, maxMs: isKid ? 10000 : 45000,
    onAudio: async (audio) => {
      if (waiting) return;
      const last = [...history].reverse().find((m) => m.role === 'assistant')?.content || '';
      let text = '';
      try { text = await transcribe(audio, lang, last.slice(0, 200)); } catch (e) { toast(explain(e)); return; }
      if (!text) { toast('I didn’t catch that. Try again a little louder.'); return; }
      await ask(text);
    },
  });

  ask('');
}

/* ---------- settings ---------- */
function screenSettings() {
  setAccent();
  render(`${topbar({ title: '⚙️ Family settings' })}
    <main class="page">
      <div class="panel"><h2 style="margin-top:0">People</h2>
        ${state.profiles.map((p) => {
          const lang = langByCode(p.lang);
          const kind = KINDS.find((k) => k.id === p.kind);
          return `<div class="row"><div class="avatar" style="width:52px;height:52px;font-size:1.8rem;--cl:${tint(p.color)}">${avatarOf(p)}</div>
            <div class="grow"><b>${esc(p.name)}</b><div class="note">${kind.en}${p.age ? `, ${p.age}` : ''} · ${lang.flag} ${lang.name} · ${LEVELS.find((l) => l.id === levelOf(p)).en} · ⭐ ${prog(p).stars}</div></div>
            <button class="btn secondary" data-edit="${p.id}">Edit</button></div>`;
        }).join('')}
        <div class="btn-row"><button class="btn" data-act="add">➕ Add a person</button></div>
      </div>
      <div class="panel"><h2 style="margin-top:0">Parent PIN</h2>
        <p class="note">Settings are locked with a PIN so the kids can’t change things.</p>
        <button class="btn secondary" data-act="pin">Change PIN</button></div>
      <div class="panel"><h2 style="margin-top:0">Connection</h2>
        <div class="row"><span class="status-dot ${server.ai ? 'ok' : ''}"></span><div class="grow">AI voice, listening and tutor</div><span class="note">${server.ai ? 'Connected' : 'Not set up'}</span></div>
        <div class="row"><span class="status-dot ${server.sync ? 'ok' : ''}"></span><div class="grow">Share profiles & stars across devices</div><span class="note">${server.sync ? 'On' : 'Off: saved on this device only'}</span></div>
        <div class="row"><span class="status-dot ${micSupported && !micBlocked ? 'ok' : ''}"></span><div class="grow">Microphone on this device</div><span class="note">${!micSupported ? 'Not supported by this browser' : micBlocked ? 'Blocked: allow it in site settings' : 'Ready'}</span></div>
        <div class="btn-row"><button class="btn secondary" data-act="forget">Sign this device out</button></div>
      </div>
    </main>`);
  on('[data-act=back]', screenHome);
  on('[data-edit]', (el) => screenEditProfile(state.profiles.find((p) => p.id === el.dataset.edit)));
  on('[data-act=add]', () => screenEditProfile(null));
  on('[data-act=pin]', async () => { await createPin(); });
  on('[data-act=forget]', async () => {
    if (await confirmModal('Sign this device out? You’ll need the family code again.', 'Sign out')) { ls.del(LS.code); boot(); }
  });
}

function screenEditProfile(existing) {
  const p = normalizeAvatar(existing ? clone(existing) : makeProfile(`p${Date.now().toString(36)}`, '', 'kid', 5, '🧒', pick(COLORS)));
  const draw = () => {
    render(`${topbar({ title: existing ? `Edit ${esc(existing.name)}` : 'Add a person' })}
      <main class="page"><div class="panel">
        <div class="field"><label for="nm">First name</label><input id="nm" maxlength="20" value="${esc(p.name)}" placeholder="First name only"></div>
        <div class="field"><label>Type</label><div class="seg" id="kind">${KINDS.map((k) => `<button data-v="${k.id}" class="${p.kind === k.id ? 'on' : ''}">${k.en}</button>`).join('')}</div>
          <div class="note">${KINDS.find((k) => k.id === p.kind).note}</div></div>
        ${p.kind !== 'adult' ? `<div class="field"><label for="age">Age</label><input id="age" type="number" min="0" max="17" value="${p.age ?? ''}" style="max-width:120px"></div>` : ''}
        <div class="field"><label for="lang">Language</label><select id="lang">${LANGUAGES.map((l) => `<option value="${l.code}" ${l.code === p.lang ? 'selected' : ''}>${l.flag} ${l.name} · ${l.native}</option>`).join('')}</select></div>
        <div class="field"><label>Level in this language</label><div class="seg" id="lvl">${LEVELS.map((l) => `<button data-v="${l.id}" class="${levelOf(p) === l.id ? 'on' : ''}">${l.en}</button>`).join('')}</div></div>
        <div class="field"><label>Picture</label><div class="emoji-pick" id="pics">${AVATARS.map((a) => `<button data-v="${a}" class="${p.emoji === a ? 'on' : ''}">${PEOPLE.has(a) ? a + p.tone : a}</button>`).join('')}</div></div>
        <div class="field"><label>Skin tone</label><div class="emoji-pick" id="tones">${TONES.map((t) => `<button data-v="${t.v}" class="${p.tone === t.v ? 'on' : ''}" aria-label="${t.label}" title="${t.label}">✋${t.v}</button>`).join('')}</div></div>
        <div class="field"><label>Color</label><div class="color-pick">${COLORS.map((c) => `<button data-v="${c}" class="${p.color === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>
        <div class="btn-row"><button class="btn" data-act="save">Save</button><button class="btn secondary" data-act="cancel">Cancel</button></div>
      </div>
      ${existing ? `<div class="panel"><div class="btn-row" style="margin:0">
        <button class="btn secondary" data-act="reset">Reset ${langByCode(p.lang).name} stars</button>
        <button class="btn danger" data-act="delete">Remove ${esc(existing.name)}</button></div></div>` : ''}
      </main>`);
    const keepName = () => { p.name = document.getElementById('nm').value; const a = document.getElementById('age'); if (a) p.age = a.value === '' ? null : Number(a.value); };
    on('#kind button', (el) => { keepName(); p.kind = el.dataset.v; if (p.kind === 'adult') p.age = null; draw(); });
    on('#lvl button', (el) => { p.levels[p.lang] = el.dataset.v; app.querySelectorAll('#lvl button').forEach((b) => b.classList.toggle('on', b === el)); });
    on('#pics button', (el) => { p.emoji = el.dataset.v; app.querySelectorAll('#pics button').forEach((b) => b.classList.toggle('on', b === el)); });
    on('#tones button', (el) => {
      p.tone = el.dataset.v;
      app.querySelectorAll('#tones button').forEach((b) => b.classList.toggle('on', b === el));
      app.querySelectorAll('#pics button').forEach((b) => { const a = b.dataset.v; b.textContent = PEOPLE.has(a) ? a + p.tone : a; });
    });
    on('.color-pick button', (el) => { p.color = el.dataset.v; app.querySelectorAll('.color-pick button').forEach((b) => b.classList.toggle('on', b === el)); });
    document.getElementById('lang').addEventListener('change', (e) => { keepName(); p.lang = e.target.value; p.levels[p.lang] ||= 'beginner'; draw(); });
    on('[data-act=back]', screenSettings);
    on('[data-act=cancel]', screenSettings);
    on('[data-act=save]', () => {
      keepName();
      p.name = p.name.trim();
      if (!p.name) return toast('Please type a first name.');
      p.updatedAt = Date.now();
      if (existing) Object.assign(existing, { ...p, progress: existing.progress });
      else state.profiles.push(p);
      save();
      toast('Saved ✅');
      screenSettings();
    });
    on('[data-act=reset]', async () => {
      if (!(await confirmModal(`Reset ${existing.name}’s ${langByCode(p.lang).name} stars to zero?`, 'Reset', true))) return;
      existing.progress[p.lang] = { stars: 0, turns: 0, cards: {}, resetAt: Date.now() };
      save(); toast('Stars reset'); screenSettings();
    });
    on('[data-act=delete]', async () => {
      if (!(await confirmModal(`Remove ${existing.name}? Their stars will be deleted.`, 'Remove', true))) return;
      state.profiles = state.profiles.filter((x) => x.id !== existing.id);
      state.deleted.push(existing.id);
      save(); screenSettings();
    });
  };
  draw();
}

/* ------------------------------------------------------------ boot */
async function boot() {
  render('<div class="center-screen"><div class="spinner"></div></div>');
  try {
    const h = await api('/api/health');
    Object.assign(server, { reachable: true, ai: !!h.ai, sync: !!h.sync });
  } catch (e) {
    if (e.status === 401) return screenFamilyCode(ls.get(LS.code) ? 'That code didn’t work.' : '');
    Object.assign(server, { reachable: false, ai: false, sync: false });
  }

  let local = null;
  try { local = JSON.parse(ls.get(LS.state) || 'null'); } catch { local = null; }
  let remote = null;
  if (server.sync) { try { remote = (await api('/api/state')).state; } catch { remote = null; } }
  state = mergeStates(remote, local || (remote ? null : defaultState()));
  state.deleted ||= [];
  state.profiles.forEach(normalizeAvatar);
  ls.set(LS.state, JSON.stringify(state));
  if (server.sync && JSON.stringify(remote) !== JSON.stringify(state)) syncNow();

  if (!state.pin) {
    render(`<div class="center-screen"><img src="icons/icon-192.png" alt="" width="96" height="96" style="border-radius:24px">
      <h2 style="margin:0">Welcome to Merchant Language Tutor!</h2>
      <p class="note">First, a grown-up picks a 4-number PIN that locks the settings.</p>
      <button class="btn" data-act="pin">Create PIN</button></div>`);
    on('[data-act=pin]', async () => { if (await createPin()) screenHome(); });
    return;
  }
  screenHome();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state && server.sync) syncNow();
  if (document.visibilityState === 'hidden') { stopSpeaking(); activeRecorder?.stop(); }
});

boot();
