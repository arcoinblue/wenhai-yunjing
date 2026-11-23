// Tangut font switch.
//  - Noto Serif Tangut: bundled (SIL OFL), always available.
//  - Tangut Yinchuan: not redistributable, so it is used only if installed, or if the reader loads
//    their own copy of the file (kept in this browser, never uploaded).
//  - BabelStone Tangut Wenhai (SIL OFL): bundled (unmodified, with its licence); covers about half of
//    the Tangut characters, and the rest fall back to Noto.
const FONTS = {
  noto: {
    name: 'Noto Serif Tangut', family: null,
    note: 'Google Noto, SIL Open Font License. Built in.',
  },
  yinchuan: {
    name: 'Tangut Yinchuan', family: 'TGYinchuan',
    local: ['Tangut Yinchuan', 'TangutYinchuan', 'TangutYinchuan-Regular'],
    url: 'https://babelstone.co.uk/Fonts/Yinchuan.html',
    note: 'Based on 景永时’s XXZT, maintained by Andrew West. Not hosted here.',
  },
  wenhai: {
    name: 'BabelStone Tangut Wenhai', family: 'TGWenhai',
    local: ['BabelStone Tangut Wenhai', 'BabelStoneTangutWenhai'],
    bundled: 'fonts/BabelStoneTangutWenhai.ttf',   // unmodified v1.002, SIL OFL 1.1
    url: 'https://babelstone.co.uk/Fonts/Wenhai.html',
    note: 'Andrew West, SIL Open Font License. Calligraphic; covers about half of the characters (the Wenhai headwords); others are shown in Noto.',
  },
};
const BASE = '"TangutWeb", "Noto Serif Tangut", var(--cjk)';
const TEST = '𘀏𗵁𘜶';

// ---- IndexedDB (same store as the page viewer) --------------------------------
const DB = 'wenhai-yunjing', STORE = 'files';
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbGet(k) {
  try { const db = await idb(); return await new Promise(res => {
    const q = db.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); }
  catch (e) { return null; }
}
async function idbPut(k, v) {
  try { const db = await idb(); await new Promise(res => {
    const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(v, k); t.oncomplete = res; t.onerror = res; }); }
  catch (e) { /* ignore */ }
}

// ---- registering faces -----------------------------------------------------------
const registered = {};
async function register(key) {
  const F = FONTS[key];
  if (!F.family) return 'builtin';
  if (registered[key]) return registered[key];
  // 1) installed on this computer, or bundled with the site
  const srcs = F.local.map(n => `local("${n}")`);
  if (F.bundled) srcs.push(`url("${F.bundled}")`);
  try {
    const face = new FontFace(F.family, srcs.join(', '));
    await face.load();
    document.fonts.add(face);
    return (registered[key] = F.bundled ? 'bundled' : 'installed');
  } catch (e) { /* not installed */ }
  // 2) a copy the reader loaded earlier
  const blob = await idbGet('font-' + key);
  if (blob) {
    try {
      const face = new FontFace(F.family, await blob.arrayBuffer());
      await face.load(); document.fonts.add(face);
      return (registered[key] = 'loaded');
    } catch (e) { /* bad file */ }
  }
  return null;
}
async function loadFromFile(key, file) {
  const F = FONTS[key];
  const face = new FontFace(F.family, await file.arrayBuffer());
  await face.load();                         // throws if not a usable font
  document.fonts.add(face);
  await idbPut('font-' + key, file);
  registered[key] = 'loaded';
}

// ---- UI ------------------------------------------------------------------------------
const $ = s => document.querySelector(s);
function apply(key, ok) {
  const F = FONTS[key];
  const stack = ok && F.family ? `"${F.family}", ${BASE}` : BASE;
  document.documentElement.style.setProperty('--tg', stack);
  window.dispatchEvent(new Event('tangut-font-changed'));
}
async function choose(key, save = true) {
  const F = FONTS[key] || FONTS.noto;
  if (save) { try { localStorage.setItem('wyj-font', key); } catch (e) { /* ignore */ } }
  const st = $('#fontStatus');
  st.innerHTML = '…';
  const how = await register(key);
  apply(key, !!how);
  const label = { builtin: 'built in', bundled: 'built in', installed: 'installed on this computer', loaded: 'loaded from your file' }[how];
  if (how) {
    st.innerHTML = `<span class="ok">✓ ${F.name} (${label})</span><br>${F.note}` +
      (how === 'loaded' ? ` <a href="#" id="fontReplace">replace file</a>` : '');
  } else {
    st.innerHTML = `${F.name} is not installed here. <a href="${F.url}" target="_blank" rel="noopener">Get it from BabelStone</a>, ` +
      `then install it, or <a href="#" id="fontLoad">load the font file</a> (kept in this browser, not uploaded).` +
      `<br>Showing Noto Serif Tangut meanwhile.`;
  }
  const pickBtn = $('#fontLoad') || $('#fontReplace');
  if (pickBtn) pickBtn.onclick = e => { e.preventDefault(); $('#fontFile').dataset.key = key; $('#fontFile').click(); };
}

function init() {
  const box = $('#fontBox');
  if (!box) return;
  box.innerHTML = Object.entries(FONTS).map(([k, F]) =>
    `<label><input type="radio" name="tgfont" value="${k}"> <span class="fname" data-k="${k}">${F.name}</span></label>`).join('') +
    `<div id="fontStatus" class="font-status"></div><input type="file" id="fontFile" accept=".ttf,.otf,.woff,.woff2,font/*" hidden>`;
  // show each option name in its own font where possible (sample glyph)
  box.querySelectorAll('input[name=tgfont]').forEach(r => r.onchange = () => choose(r.value));
  $('#fontFile').onchange = async e => {
    const f = e.target.files[0], key = e.target.dataset.key;
    if (!f || !key) return;
    try { await loadFromFile(key, f); await choose(key); }
    catch (err) { $('#fontStatus').innerHTML += '<br><span class="bad">That file could not be read as a font.</span>'; }
    e.target.value = '';
  };
  let key = 'noto';
  try { key = localStorage.getItem('wyj-font') || 'noto'; } catch (e) { /* ignore */ }
  if (!FONTS[key]) key = 'noto';
  const r = box.querySelector(`input[value=${key}]`); if (r) r.checked = true;
  choose(key, false);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
