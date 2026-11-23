// Page viewer for 史金波, 白濱, 黃振華 (1983)《文海研究》.
// The PDF is never uploaded: the reader picks their own copy, which is kept in this browser (IndexedDB).
import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const BOOK = '史金波・白濱・黃振華 1983《文海研究》';
const EXPECTED_PAGES = 877;

// Wenhai position -> PDF page (checked against the leaf numbers in the margins)
//   平聲 leaves 4–45:  137 + 2(leaf-4)        (leaf 46 is lost; the book skips it)
//   平聲 leaves 47–93: 135 + 2(leaf-4)
//   雜類 leaves 2–22:  315 + 2(leaf-2)
// + 1 for the second half-leaf.  Printed page number = PDF page - 1.
export function pageOf(pos) {
  const m = /^(M?)(\d{2})\.(\d)(\d)?(\d)?/.exec(String(pos || '').trim());
  if (!m) return null;
  const zalei = m[1] === 'M', leaf = +m[2], half = +m[3];
  const line = m[4] ? +m[4] : null, item = m[5] ? +m[5] : null;
  let p;
  if (zalei) { if (leaf < 2 || leaf > 22) return null; p = 315 + 2 * (leaf - 2); }
  else if (leaf >= 4 && leaf <= 45) p = 137 + 2 * (leaf - 4);
  else if (leaf >= 47 && leaf <= 93) p = 135 + 2 * (leaf - 4);
  else return null;
  return { pdf: p + (half === 2 ? 1 : 0), zalei, leaf, half, line, item };
}

// ---- IndexedDB storage of the reader's own file ---------------------------
const DB = 'wenhai-yunjing', STORE = 'files', KEY = 'wenhai1983';
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbGet() {
  try { const db = await idb(); return await new Promise((res, rej) => {
    const q = db.transaction(STORE).objectStore(STORE).get(KEY); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  catch (e) { return null; }
}
async function idbPut(v) {
  try { const db = await idb(); await new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(v, KEY); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; }
  catch (e) { return false; }
}
async function idbDel() {
  try { const db = await idb(); await new Promise(res => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).delete(KEY); t.oncomplete = res; }); }
  catch (e) { /* ignore */ }
}

// ---- viewer UI --------------------------------------------------------------
let doc = null, page = 1, target = null, scale = 0, offset = 0, renderTask = null;
const $ = s => document.querySelector(s);

function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
function build() {
  if ($('#pv')) return;
  document.body.appendChild(el(`
  <div id="pv" class="pv" hidden>
    <div class="pv-box">
      <div class="pv-bar">
        <div class="pv-title"><b id="pvWhere"></b><span id="pvBook"></span></div>
        <div class="pv-tools">
          <button id="pvPrev" title="Previous page">‹</button>
          <span id="pvPage"></span>
          <button id="pvNext" title="Next page">›</button>
          <button id="pvOut" title="Zoom out">−</button>
          <button id="pvFit" title="Fit to window">Fit</button>
          <button id="pvIn" title="Zoom in">+</button>
          <button id="pvClose" title="Close (Esc)">✕</button>
        </div>
      </div>
      <div id="pvBody" class="pv-body"><canvas id="pvCanvas"></canvas></div>
      <div id="pvPick" class="pv-pick" hidden>
        <p>To see the edited Wenhai pages, open your copy of<br><b>${BOOK}</b> (PDF).</p>
        <label class="pv-file">Choose PDF…<input type="file" id="pvFile" accept="application/pdf,.pdf" hidden></label>
        <p class="pv-note">The file stays in this browser and is not uploaded anywhere. It is remembered for next time.</p>
        <p id="pvErr" class="pv-err"></p>
      </div>
      <div class="pv-foot">
        <span id="pvLine"></span>
        <span class="pv-right">page offset <input id="pvOff" type="number" value="0" step="1"> ·
          <a href="#" id="pvForget">use a different PDF</a></span>
      </div>
    </div>
  </div>`));
  $('#pv').addEventListener('click', e => { if (e.target.id === 'pv') close(); });
  $('#pvClose').onclick = close;
  $('#pvPrev').onclick = () => show(page - 1);
  $('#pvNext').onclick = () => show(page + 1);
  $('#pvIn').onclick = () => { scale = (scale || fitScale()) * 1.25; show(page); };
  $('#pvOut').onclick = () => { scale = (scale || fitScale()) / 1.25; show(page); };
  $('#pvFit').onclick = () => { scale = 0; show(page); };
  $('#pvFile').onchange = async e => { const f = e.target.files[0]; if (f) await loadFile(f, true); };
  $('#pvForget').onclick = async e => { e.preventDefault(); await idbDel(); doc = null; pick(); };
  $('#pvOff').onchange = e => {
    offset = parseInt(e.target.value, 10) || 0;
    try { localStorage.setItem('wyj-pdf-offset', offset); } catch (err) { /* ignore */ }
    if (target) show(target.pdf + offset);
  };
  document.addEventListener('keydown', e => {
    if ($('#pv').hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(page - 1);
    if (e.key === 'ArrowRight') show(page + 1);
  });
  try { offset = parseInt(localStorage.getItem('wyj-pdf-offset'), 10) || 0; } catch (e) { offset = 0; }
  $('#pvOff').value = offset;
}
function close() { $('#pv').hidden = true; }
function pick(msg = '') {
  $('#pvPick').hidden = false; $('#pvBody').hidden = true; $('#pvErr').textContent = msg;
}

async function loadFile(blob, save) {
  $('#pvErr').textContent = 'Opening…';
  try {
    const data = new Uint8Array(await blob.arrayBuffer());
    doc = await pdfjsLib.getDocument({ data }).promise;
  } catch (e) { doc = null; pick('Could not open this file as a PDF.'); return false; }
  if (save) await idbPut(blob);
  $('#pvErr').textContent = doc.numPages !== EXPECTED_PAGES
    ? `Note: this PDF has ${doc.numPages} pages (the expected scan has ${EXPECTED_PAGES}). If pages are off, adjust the page offset below.` : '';
  $('#pvPick').hidden = true; $('#pvBody').hidden = false;
  if (target) show(target.pdf + offset);
  return true;
}

function fitScale() {
  if (!doc || !doc._firstView) return 1;
  const body = $('#pvBody');
  const v = doc._firstView;
  return Math.min((body.clientWidth - 24) / v.width, (body.clientHeight - 24) / v.height);
}

async function show(n) {
  if (!doc) return;
  page = Math.min(Math.max(n, 1), doc.numPages);
  const p = await doc.getPage(page);
  doc._firstView = p.getViewport({ scale: 1 });
  const s = scale || fitScale();
  const vp = p.getViewport({ scale: s });
  const dpr = window.devicePixelRatio || 1;
  const c = $('#pvCanvas');
  c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
  c.style.width = Math.floor(vp.width) + 'px'; c.style.height = Math.floor(vp.height) + 'px';
  if (renderTask) { try { renderTask.cancel(); } catch (e) { /* ignore */ } }
  renderTask = p.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
  try { await renderTask.promise; } catch (e) { /* cancelled */ }
  $('#pvPage').textContent = `p. ${page - 1} (PDF ${page})`;
  const onTarget = target && page === target.pdf + offset;
  $('#pvLine').textContent = onTarget && target.line
    ? `Line ${target.line}${target.item ? `, entry ${target.item}` : ''} — lines are counted from the right` : '';
}

export async function openWenhaiPage(pos) {
  build();
  target = pageOf(pos);
  $('#pv').hidden = false;
  if (!target) {
    $('#pvWhere').textContent = `Wenhai ${pos}`; $('#pvBook').textContent = ' — no page in the edition for this position';
    $('#pvBody').hidden = true; $('#pvPick').hidden = true; return;
  }
  $('#pvWhere').textContent = `Wenhai ${pos}`;
  $('#pvBook').textContent = ` · ${target.zalei ? '雜類' : '平聲'} leaf ${target.leaf}${target.half === 1 ? 'a' : 'b'} · ${BOOK}`;
  scale = 0;
  if (!doc) {
    const saved = await idbGet();
    if (saved) { $('#pvPick').hidden = true; $('#pvBody').hidden = false; await loadFile(saved, false); return; }
    pick(); return;
  }
  $('#pvPick').hidden = true; $('#pvBody').hidden = false;
  show(target.pdf + offset);
}
window.openWenhaiPage = openWenhaiPage;
window.wenhaiPageOf = pageOf;
