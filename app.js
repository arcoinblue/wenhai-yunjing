'use strict';
/* Web韻圖 〜文海〜 : Yunjing-style rhyme tables of the Tangut Wenhai */

// ---- initial classes (九音) and columns, logical order ---------------------
const CLASSES = {
  I:    { tg: '𗠉𗙏𗊢', tr: 'mər¹ɣiẹ²ljɨ̱¹',        zh: '重唇音', en: 'bilabials' },
  II:   { tg: '𗠉𗙏𗣫', tr: 'mər¹ɣiẹ²tsəj¹',       zh: '輕唇音', en: 'labiodentals (a single consonant)' },
  III:  { tg: '𗢯𘁙𗙏', tr: 'lʰjwa¹dźjwa¹ɣiẹ²',    zh: '舌頭音', en: 'apicals' },
  IV:   { tg: '𗢯𗀔𗙏', tr: 'lʰjwa¹tśʰja̠¹ɣiẹ²',    zh: '舌上音', en: 'retroflexes' },
  V:    { tg: '𘟗𗙏',   tr: 'kowr²ɣiẹ²',           zh: '牙音',   en: 'velars' },
  VI:   { tg: '𘘄𘁙𗙏', tr: 'śjwi¹dźjwa¹ɣiẹ²',     zh: '齒頭音', en: 'dental fricatives and affricates' },
  VII:  { tg: '𘘄𗒘𗙏', tr: 'śjwi¹ɣiej¹ɣiẹ²',      zh: '正齒音', en: 'palatal fricatives and affricates' },
  VIII: { tg: '𗍂𗙏',   tr: 'njwij¹ɣiẹ²',          zh: '喉音',   en: 'laryngeals and empty initials' },
  IX:   { tg: '𘚶𘞨𗙏', tr: 'ljɨ¹zjịj²ɣiẹ²',        zh: '來日音', en: 'laterals and approximants' },
};
const COLS = [ // key, class, 清濁, Miyake initial
  ['p','I','清','p'], ['ph','I','次清','ph'], ['b','I','濁','b'], ['m','I','清濁','m'],
  ['v','II','清濁','v'],
  ['t','III','清','t'], ['th','III','次清','th'], ['d','III','濁','d'], ['n','III','清濁','n'],
  ['nr','IV','清濁','n'],
  ['k','V','清','k'], ['kh','V','次清','kh'], ['g','V','濁','g'], ['ng','V','清濁','ng'],
  ['ts','VI','清','ts'], ['tsh','VI','次清','tsh'], ['dz','VI','濁','dz'], ['s','VI','清','s'],
  ['ch','VII','清','ch'], ['chh','VII','次清','chh'], ['j','VII','濁','j'], ['sh','VII','清','sh'],
  ['O','VIII','清','Ø'], ['h','VIII','清','h'], ['gh','VIII','濁','gh'],
  ['l','IX','清濁','l'], ['lh','IX','清','lh'], ['r','IX','清濁','r'], ['z','IX','濁','z'], ['zh','IX','清濁','zh'],
];
const COLMAP = Object.fromEntries(COLS.map(c => [c[0], c]));
const DISPLAY = COLS.slice().reverse();               // Yunjing: 唇 on the right
const SECTIONS = { 1: '平開', 2: '上開', 3: '平合', 4: '上合' };
const SECDESC = { 1: 'tone 1, no -w-', 2: 'tone 2, no -w-', 3: 'tone 1, -w-', 4: 'tone 2, -w-' };
const DENG = { 1: '一', 2: '二', 3: '三' };
const SEC_ORDER = [1, 3, 2, 4];   // 平開, 平合, 上開, 上合: tone 1 sections first, then tone 2
const ALLCH = () => !$('#optWenhaiOnly').checked;               // include characters not in the Wenhai
const LAY = () => ((document.querySelector('input[name=lay]:checked') || {}).value === 'deng' ? 'deng' : 'tone');
const cellIds = (C, key) => {
  const a = C.cells[key] || [];
  return ALLCH() ? a.concat((C.cellsX || {})[key] || []) : a;
};
const rowOf = (C, rk) => C.rows[rk] || (ALLCH() ? (C.rowsX || {})[rk] : null) || null;
const NDENG = 3;   // 等 from GHC medials: none = 一, -i- = 二, -j- = 三
const DENGDESC = { 1: 'no medial i/j (GHC)', 2: 'GHC medial -i-', 3: 'GHC medial -j-' };
const MGRADE = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
const BLOCKEN = { plain: 'plain', tense: 'tense', r: 'retroflex', long: 'long', longr: 'long retroflex', misc: 'other' };

let D = null, cur = 1, sel = null, charIndex = null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chars = s => Array.from(s || '');

// ---- load ---------------------------------------------------------------
fetch('data/wenhai.json?v=19').then(r => r.json()).then(d => {
  D = d;
  charIndex = {};
  for (const [id, g] of Object.entries(D.groups))
    g.m.forEach(m => (charIndex[m.c] ||= []).push({ id: +id, m }));
  const sel_ = $('#chartSel');
  D.charts.forEach(c => {
    const o = document.createElement('option');
    o.value = c.n; o.textContent = `${c.n}. ${c.sheCN}${c.blockLabel} (${c.fin || c.sheName})`;
    sel_.appendChild(o);
  });
  sel_.onchange = () => go(+sel_.value);
  ['#optFanqie', '#optGhc', '#optMb', '#optMiyake', '#optFinal'].forEach(id => $(id).onchange = () => { saveOpts(); render(); });
  document.querySelectorAll('input[name=lang]').forEach(r => r.onchange = () => { saveOpts(); showPanel(); search(); });
  $('#optFit').onchange = () => { saveOpts(); fit(); };
  $('#optWenhaiOnly').onchange = () => { saveOpts(); render(); showPanel(); search(); };
  document.querySelectorAll('input[name=lay]').forEach(r => r.onchange = () => { saveOpts(); render(); });
  $('#foldSide').onclick = () => setFold('side', !$('#app').classList.contains('side-folded'));
  $('#foldPanel').onclick = () => setFold('panel', !$('#app').classList.contains('panel-folded'));
  window.addEventListener('resize', () => requestAnimationFrame(fit));
  window.addEventListener('tangut-font-changed', () => requestAnimationFrame(fit));
  $('#app').addEventListener('transitionend', e => { if (e.target.id === 'app') fit(); });
  loadOpts();
  $('#q').oninput = search;
  window.onhashchange = fromHash;
  $('#panelBody').addEventListener('click', e => {
    const a = e.target.closest('[data-pos]'); if (!a) return;
    e.preventDefault(); openPage(a.dataset.pos);
  });
  initPageView();
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (!$('#pageView').hidden) return;          // the page viewer has its own keys
    if (e.key === 'ArrowLeft' || e.key === 'p') go(cur - 1);
    if (e.key === 'ArrowRight' || e.key === 'n') go(cur + 1);
  });
  fromHash();
});

function loadOpts() {
  try {
    const o = JSON.parse(localStorage.getItem('wyj-opts') || '{}');
    $('#optFanqie').checked = !!o.fq; $('#optGhc').checked = !!o.gh; $('#optMb').checked = !!o.mb;
    $('#optMiyake').checked = !!o.rd; $('#optFinal').checked = o.rf !== false;
    const l = document.querySelector(`input[name=lang][value=${o.lang === 'zh' ? 'zh' : 'en'}]`); if (l) l.checked = true;
    $('#optFit').checked = o.fit !== false;
    $('#optWenhaiOnly').checked = o.wonly !== false;
    const ly = document.querySelector(`input[name=lay][value=${o.lay === 'deng' ? 'deng' : 'tone'}]`); if (ly) ly.checked = true;
    setFold('side', !!o.sideF, false); setFold('panel', !!o.panelF, false);
  } catch (e) { /* storage unavailable */ }
}
function saveOpts() {
  try { localStorage.setItem('wyj-opts', JSON.stringify({ fq: $('#optFanqie').checked, gh: $('#optGhc').checked, mb: $('#optMb').checked,
    rd: $('#optMiyake').checked, rf: $('#optFinal').checked, lang: LANG(), fit: $('#optFit').checked,
    wonly: $('#optWenhaiOnly').checked, lay: LAY(),
    sideF: $('#app').classList.contains('side-folded'), panelF: $('#app').classList.contains('panel-folded') })); }
  catch (e) { /* ignore */ }
}

// ---- routing ------------------------------------------------------------
function fromHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const c = Math.min(Math.max(+p.get('c') || 1, 1), D.charts.length);
  cur = c;
  sel = p.get('s') ? { type: 'cell', key: p.get('s') } : p.get('r') ? { type: 'row', key: p.get('r') } : null;
  $('#chartSel').value = c;
  render();
  showPanel();
}
function setHash() {
  const p = new URLSearchParams({ c: cur });
  if (sel) p.set(sel.type === 'cell' ? 's' : 'r', sel.key);
  history.replaceState(null, '', '#' + p.toString());
}
function go(n, s = null) {
  if (n < 1 || n > D.charts.length) return;
  cur = n; sel = s;
  $('#chartSel').value = n;
  setHash(); render(); showPanel();
}

// ---- chart --------------------------------------------------------------
function groupsOfDisplay() {
  const out = []; let last = null;
  DISPLAY.forEach(c => {
    if (last && last.cls === c[1]) last.n++;
    else { last = { cls: c[1], n: 1 }; out.push(last); }
  });
  return out;
}
function isGroupStart(i) { return i === 0 || DISPLAY[i - 1][1] !== DISPLAY[i][1]; }

function render() {
  const C = D.charts[cur - 1];
  const fq = $('#optFanqie').checked, gh = $('#optGhc').checked, mb = $('#optMb').checked,
    rd = $('#optMiyake').checked, rf = $('#optFinal').checked;
  const T = [];
  // header row 1: nav + 九音 names
  T.push('<thead><tr>');
  T.push(`<th colspan="2" rowspan="2" class="corner"><button class="navbtn" data-nav="-1" title="previous chart">&lt;</button><br>${esc(C.sheCN)}<br>${esc(C.blockLabel)}<br><span class="cfin">${esc(C.fin || '')}</span></th>`);
  groupsOfDisplay().forEach((g, i) => {
    const K = CLASSES[g.cls];
    const tip = `${g.cls}. ${K.tg} ${K.tr} (${K.zh}): ${K.en}`;
    let label;
    if (g.n === 1) label = `<span class="v">${esc(K.tg)}</span>`;
    else label = `<div class="spread">${chars(K.tg).reverse().map(c => `<span>${c}</span>`).join('')}</div>`;
    T.push(`<th colspan="${g.n}" class="grp ${g.n === 1 ? 'single' : ''} ${i ? 'sep' : ''}" title="${esc(tip)}">${label}</th>`);
  });
  T.push(`<th colspan="2" rowspan="2"><button class="navbtn" data-nav="1" title="next chart">&gt;</button></th></tr>`);
  // header row 2: 清濁
  T.push('<tr>');
  DISPLAY.forEach((c, i) => T.push(`<th class="qz ${isGroupStart(i) && i ? 'sep' : ''}" title="Miyake initial: ${esc(c[3])}"><span>${c[2]}</span></th>`));
  T.push('</tr></thead><tbody>');
  // body
  // rows: tone/開合 sections, each with 3 等 (default), or 3 等 groups, each with the 4 sections
  const ROWS = [];
  if (LAY() === 'deng') {
    for (let d = 1; d <= NDENG; d++) SEC_ORDER.forEach((s, j) => ROWS.push({ s, d, first: j === 0, last: j === 3,
      lab: SECTIONS[s], labTip: SECDESC[s], grp: `${DENG[d]}等`, grpTip: DENGDESC[d], span: 4 }));
  } else {
    SEC_ORDER.forEach(s => { for (let d = 1; d <= NDENG; d++) ROWS.push({ s, d, first: d === 1, last: d === NDENG,
      lab: DENG[d], labTip: DENGDESC[d], grp: SECTIONS[s], grpTip: SECDESC[s], span: NDENG }); });
  }
  ROWS.forEach((R, ri) => {
    {
      const s = R.s, d = R.d;
      T.push(`<tr class="${R.last ? 'secend' : ''}">`);
      T.push(`<td class="deng ${LAY() === 'deng' ? 'sm' : ''}" title="${esc(R.labTip)}">${R.lab}</td>`);
      const rn = rowOf(C, `${s}-${d}`);
      const rkey = `${s}-${d}`;
      T.push(`<td class="rowname">${rn ? `<span class="rn ${rn.trad ? 'trad' : ''} ${rn.nw ? 'nwr' : ''} ${sel && sel.type === 'row' && sel.key === rkey ? 'sel' : ''}" data-row="${rkey}" title="${esc(rn.wr)} ${esc(rn.gf)}">${esc(rn.c)}</span>${rf && rn.gf ? `<span class="rf">${esc(rn.gf)}</span>` : ''}` : ''}</td>`);
      DISPLAY.forEach((c, i) => {
        const key = `${s}-${d}-${c[0]}`;
        const ids = cellIds(C, key); const any = ids.length > 0;
        const cls = ['c']; if (isGroupStart(i) && i) cls.push('sep');
        if (any) cls.push('has');
        if (any && D.groups[ids[0]].nw) cls.push('nwc');
        if (sel && sel.type === 'cell' && sel.key === key) cls.push('sel');
        let inner;
        if (any) {
          const g = D.groups[ids[0]];
          inner = `<span class="ch">${esc(g.rep)}</span>`;
          if (fq) inner += `<span class="fq">${esc(speller(g.fanqie))}</span>`;
          if (gh) inner += `<span class="rd">${esc(g.ghc)}</span>`;
          if (mb) inner += `<span class="rd">${esc(g.mb)}</span>`;
          if (rd) inner += `<span class="rd">${esc(reading(g.miyake))}</span>`;
          if (ids.length > 1) inner += '<span class="mark"></span>';
        } else inner = '<span class="o"></span>';
        T.push(`<td class="${cls.join(' ')}" ${any ? `data-cell="${key}"` : ''}>${inner}</td>`);
      });
      if (R.first) T.push(`<td class="seclab" rowspan="${R.span}" title="${esc(R.grpTip)}"><div class="vt">${R.grp}</div></td>`);
      if (ri === 0) T.push(`<td class="title" rowspan="${ROWS.length}"><div class="vt">${esc(C.title)}　${esc(C.sheCN)}${esc(C.blockLabel)}</div></td>`);
      T.push('</tr>');
    }
  });
  T.push('</tbody>');
  const t = $('#chart');
  t.innerHTML = T.join('');
  t.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => go(cur + +b.dataset.nav));
  t.querySelectorAll('[data-cell]').forEach(td => td.onclick = () => { sel = { type: 'cell', key: td.dataset.cell }; setHash(); render(); showPanel(); });
  t.querySelectorAll('[data-row]').forEach(el => el.onclick = () => { sel = { type: 'row', key: el.dataset.row }; setHash(); render(); showPanel(); });
  fit();
}

// ---- fit chart to the available width (instead of squeezing columns) ------
function fit() {
  const wrap = $('#chartWrap'), main = $('#main');
  wrap.style.zoom = 1;
  if (!$('#optFit').checked) return;
  const avail = main.clientWidth - 36;
  const need = wrap.offsetWidth;
  const z = Math.min(1, avail / need);
  wrap.style.zoom = z > 0.3 ? z.toFixed(3) : 0.3;
}

// ---- foldable side panels ---------------------------------------------------
function setFold(which, folded, save = true) {
  $('#app').classList.toggle(which + '-folded', folded);
  const b = which === 'side' ? $('#foldSide') : $('#foldPanel');
  b.textContent = which === 'side' ? (folded ? '›' : '‹') : (folded ? '‹' : '›');
  b.title = (folded ? 'Show ' : 'Hide ') + (which === 'side' ? 'sidebar' : 'details panel');
  if (save) saveOpts();
  requestAnimationFrame(fit);
  setTimeout(fit, 260);          // after the grid transition has finished
}

const LANG = () => (document.querySelector('input[name=lang]:checked') || {}).value || 'en';
const gloss = m => (LANG() === 'zh' ? (m.zh || m.en) : (m.en || m.zh)) || '';
const speller = f => { const a = chars(f.replace(/\s/g, '')); const i = a.indexOf('𘈖'); return (i > 0 ? a.slice(0, i) : a.slice(0, 2)).join(''); };
const reading = cx => (cx || '').replace(/^\d/, '').replace(/\d$/, '');

// ---- panel --------------------------------------------------------------
function readingOf(ch) {   // GHC first; Miyake only if GHC is missing
  const hits = charIndex[ch];
  if (!hits) return (D.spell && D.spell[ch]) || '';
  for (const k of ['ghc', 'mb', 'miyake']) {
    const v = [...new Set(hits.map(h => h.m[k]).filter(Boolean))];
    if (v.length) return v.join(', ');
  }
  return '';
}
function fanqieHTML(f) {
  if (!f) return '<span class="none">—</span>';
  return chars(f.replace(/\s/g, '')).map(c => {
    const r = c === '𘈖' ? '反' : (c === '□' ? '' : readingOf(c));
    return `<span class="fqpart"><span class="tg">${esc(c)}</span><small>${esc(r)}</small></span>`;
  }).join('');
}
function rhymeLine(g) {
  const R = D.rhymes[g.mrhyme];
  let s = '';
  if (g.wr) s += `Wenhai ${esc(g.wr)} ${g.wrName ? `<span class="tg">${esc(g.wrName)}</span>` : ''}`;
  if (g.gf) s += `${s ? ' · ' : ''}GHC -${esc(g.gf)}`;
  if (R) s += `${s ? ' · ' : ''}Miyake rhyme ${g.mrhyme} (${esc(R.final)}${g.mgrade ? `, grade ${MGRADE[g.mgrade]}` : ''})`;
  return s;
}
function cardHTML(id, idx, total) {
  const g = D.groups[id];
  const tag = (idx === 1 ? '<span class="tag">in chart</span>' : '<span class="tag hid">not shown</span>') +
    (g.nw ? ' <span class="tag nwt">not in the Wenhai</span>' : '');
  // the representative is shown in the card header, so it is left out of the list below
  let ri = g.m.findIndex(m => m.c === g.rep); if (ri < 0) ri = 0;
  const rep = g.m[ri], others = g.m.filter((_, i) => i !== ri);
  const rows = others.map((m, i) => {
    const diff = m.ghc !== g.ghc || m.miyake !== g.miyake;
    const tip = `GHC ${m.ghc} · MB ${m.mb} · Miyake ${m.miyake}${m.flag ? ' · ' + m.flag : ''}`;
    return `<tr class="${diff ? 'warn' : ''}" title="${esc(tip)}">
      <td class="n">${i + 1}</td><td class="tg">${esc(m.c)}</td>
      <td class="gl">${esc(gloss(m)) || '<span class="muted">—</span>'}${diff ? `<span class="rdiff">GHC ${esc(m.ghc)} · Miyake ${esc(m.miyake)}</span>` : ''}</td>
      <td class="lfw">${esc(m.lfw)}<br>${posLink(m.pos, 'muted')}</td></tr>`;
  }).join('');
  return `<div class="card">
    <div class="card-h"><span class="big">${esc(g.rep)}</span>
      <div class="info">${g.nw ? 'Homophones' : '小韻'} ${idx} / ${total} ${tag}<br>${g.nw ? esc(rep.lfw) : `Wenhai ${posLink(rep.pos)} · ${esc(rep.lfw)} · ${esc(g.part)}`}
        ${gloss(rep) ? `<br><span class="hgl">${esc(gloss(rep))}</span>` : ''}</div></div>
    <dl class="kv">
      ${g.nw ? '' : `<dt>Fanqie</dt><dd>${fanqieHTML(g.fanqie)}</dd>`}
      <dt>Rhyme</dt><dd>${rhymeLine(g)}</dd>
      <dt>GHC</dt><dd>${esc(g.ghc)}</dd>
      ${g.nw ? '' : `<dt>MB</dt><dd>${esc(g.mb)}</dd>`}
      <dt>Miyake</dt><dd>${esc(g.miyake)}</dd>
      <dt>Characters</dt><dd>${g.m.length}</dd>
    </dl>
    ${others.length ? `<table class="mem"><thead><tr><th></th><th>字</th><th>${LANG() === 'zh' ? '字義' : 'Meaning'}</th><th>${g.nw ? 'LFW' : 'LFW · Wenhai'}</th></tr></thead>
      <tbody>${rows}</tbody></table>` : ''}
    ${g.flag ? `<div class="flag">⚠ ${esc(g.flag)}</div>` : ''}
  </div>`;
}
function slotTitle(s, d, k) {
  const c = COLMAP[k], K = CLASSES[c[1]];
  return `<div class="slot-h">${esc(D.charts[cur - 1].title)} · ${SECTIONS[s]} · ${DENG[d]}等</div>
    <div class="slot-sub">${SECDESC[s]} · ${DENGDESC[d]} · ${c[1]}. <span class="tg">${esc(K.tg)}</span> ${esc(K.tr)} (${K.zh}) · initial ${esc(c[3])} · ${c[2]}</div>`;
}
function showPanel() {
  if (sel && $('#app').classList.contains('panel-folded')) setFold('panel', false);
  const P = $('#panelBody');
  const C = D.charts[cur - 1];
  if (!sel) {
    P.innerHTML = `<div class="slot-h">${esc(C.title)} ${esc(C.sheCN)}${esc(C.blockLabel)}</div>
      <div class="slot-sub">攝 ${C.she} · ${BLOCKEN[C.block]} <b>${esc(C.fin || C.sheName)}</b> · Miyake rhymes ${C.rhymes.join(', ')}</div>` +
      C.rhymes.map(r => rhymeCard(r)).join('') +
      '<p class="placeholder">Click a character in the chart to see its 小韻.<br>Click a row name (roundel) for the rhyme of that row.</p>';
    return;
  }
  if (sel.type === 'cell') {
    const [s, d, k] = sel.key.split('-');
    const ids = cellIds(C, sel.key);
    P.innerHTML = slotTitle(+s, +d, k) + ids.map((id, i) => cardHTML(id, i + 1, ids.length)).join('');
  } else {
    const [s, d] = sel.key.split('-');
    const rn = rowOf(C, sel.key);
    if (!rn) { P.innerHTML = ''; return; }
    const n = [...new Set(Object.keys(C.cells).concat(ALLCH() ? Object.keys(C.cellsX || {}) : []))]
      .filter(k => k.startsWith(sel.key + '-')).length;
    P.innerHTML = `<div class="slot-h">${esc(C.title)} · ${SECTIONS[s]} · ${DENG[d]}等</div>
      <div class="slot-sub">${SECDESC[s]} · ${DENGDESC[d]} · ${n} cell(s) filled</div>
      <div class="card"><div class="card-h"><span class="rn rhyme-big ${rn.trad ? 'trad' : ''}">${esc(rn.c)}</span>
        <div class="info">${rn.trad ? 'Wenhai rhyme name' : rn.nw ? 'No Wenhai entries in this row;<br>first homophone group (not in the Wenhai)' : 'No Wenhai rhyme name (上聲 lost);<br>first 小韻 of the row'}</div></div>
      <dl class="kv"><dt>GHC final</dt><dd><b>${esc(rn.gf || '—')}</b></dd>
      <dt>Wenhai rhyme</dt><dd>${esc(rn.wr || '—')}${rn.all && rn.all !== rn.wr ? ` (row also has ${esc(rn.all)})` : ''}</dd>
      <dt>Source</dt><dd>${esc(rn.src)}</dd></dl></div>` +
      rn.mr.map(r => rhymeCard(r)).join('');
  }
}
function rhymeCard(r) {
  const R = D.rhymes[r];
  if (!R) return '';
  const names = R.wenhai.map(w => `${esc(w)}${R.wenhaiNames[w] ? ` <span class="tg">${esc(R.wenhaiNames[w])}</span>` : ''}`).join(' · ');
  const gr = Object.entries(R.grades).map(([k, v]) => `${k} (${v})`).join(', ');
  const alt = (R.ghcAll || []).slice(1, 4);
  return `<div class="card"><dl class="kv">
    <dt>Rhyme</dt><dd><b>${r}</b></dd>
    <dt>GHC</dt><dd><b>${esc(R.ghc || '—')}</b>${alt.length ? ` <span class="muted">(also ${alt.map(esc).join(', ')})</span>` : ''}</dd>
    <dt>Miyake</dt><dd>${esc(R.final)}</dd>
    <dt>Wenhai</dt><dd>${names || '—'}</dd>
    <dt>Grades</dt><dd>${gr}</dd>
    <dt>Characters</dt><dd>${R.n} in Miyake's database</dd></dl>
    <a class="cmp" href="rhymes.html#r=${r}">Compare reconstructions of rhyme ${r} ›</a></div>`;
}

// ---- search -------------------------------------------------------------
function search() {
  const q = $('#q').value.trim();
  const ul = $('#results');
  ul.innerHTML = '';
  if (!q) return;
  const hits = new Map();
  const add = (id, why) => { if (!hits.has(id)) hits.set(id, why); };
  const tg = chars(q).filter(c => c.codePointAt(0) >= 0x17000);
  if (tg.length) {
    tg.forEach(c => (charIndex[c] || []).forEach(h => add(h.id, h.m)));
  } else {
    const ql = q.toLowerCase().replace(/^l(?=\d)/, '');
    for (const [id, g] of Object.entries(D.groups)) {
      for (const m of g.m) {
        const lfw = m.lfw.replace(/^L0*/, '');
        if (m.pos === q || lfw === ql.replace(/^0+/, '') || reading(m.miyake).toLowerCase() === ql ||
            m.miyake.toLowerCase() === ql || m.ghc.replace(/[¹²]/g, '') === q || m.ghc === q ||
            m.mb === q || m.mb.replace(/[¹²]/g, '') === q) { add(+id, m); break; }
      }
    }
  }
  if (!hits.size && !tg.length && q.length >= 2) {
    const ql = q.toLowerCase();
    for (const [id, g] of Object.entries(D.groups))
      for (const m of g.m)
        if ((m.en && m.en.toLowerCase().includes(ql)) || (m.zh && m.zh.includes(q))) { add(+id, m); break; }
  }
  [...hits].slice(0, 80).forEach(([id, m]) => {
    const g = D.groups[id];
    const li = document.createElement('li');
    const where = (g.chart ? `chart ${g.chart} · ${SECTIONS[g.sec]} · ${DENG[g.deng]}等 · ${COLMAP[g.col][3]}${g.shown || g.nw ? '' : ' (not shown)'}` : 'not placed') +
      (g.nw ? ' · <i>not in the Wenhai</i>' : '');
    li.innerHTML = `<span class="tg">${esc(m.c)}</span><span class="meta">${esc(m.ghc)} · ${esc(gloss(m))}<br>${where}</span>`;
    if (g.chart) li.onclick = () => {
      if (g.nw && !ALLCH()) { $('#optWenhaiOnly').checked = false; saveOpts(); }
      go(g.chart, { type: 'cell', key: `${g.sec}-${g.deng}-${g.col}` });
    };
    ul.appendChild(li);
  });
  if (!hits.size) ul.innerHTML = '<li class="meta">no match</li>';
}

// ---- Wenhai page viewer -------------------------------------------------------
// Scans: pages/<folio>-<side>.jpg, each = transcription (left) + facsimile half-folio (right).
// Folio 04 side 2 is front matter; folios 05–93 are the 平聲, M02–M22 the 雜類.
// No scans for the lost leaves (45 side 2 – 47 side 1) or for sides without text.
const PAGES = `
04-2 05-1 05-2 06-1 06-2 07-1 07-2 08-1 08-2 09-1 09-2 10-1 10-2 11-1 11-2 12-1 12-2 13-1 13-2 14-1
14-2 15-1 15-2 16-1 16-2 17-1 17-2 18-1 18-2 19-1 19-2 20-1 20-2 21-1 21-2 22-1 22-2 23-1 23-2 24-1
24-2 25-1 25-2 26-1 26-2 27-1 27-2 28-1 28-2 29-1 29-2 30-1 30-2 31-1 31-2 32-1 32-2 33-1 33-2 34-1
34-2 35-1 35-2 36-1 36-2 37-1 37-2 38-1 38-2 39-1 39-2 40-1 40-2 41-1 41-2 42-1 42-2 43-1 43-2 44-1
44-2 45-1 47-2 48-1 48-2 49-1 49-2 50-1 50-2 51-1 51-2 52-1 52-2 53-1 53-2 54-1 54-2 55-1 55-2 56-1
56-2 57-1 57-2 58-1 58-2 59-1 59-2 60-1 60-2 61-1 61-2 62-1 62-2 63-1 63-2 64-1 64-2 65-1 65-2 66-1
66-2 67-1 67-2 68-1 68-2 69-1 69-2 70-1 70-2 71-1 71-2 72-1 72-2 73-1 73-2 74-1 74-2 75-1 75-2 76-1
76-2 77-1 77-2 78-1 78-2 79-1 79-2 80-1 80-2 81-1 81-2 82-1 82-2 83-1 83-2 84-1 84-2 85-1 85-2 86-1
86-2 87-1 87-2 88-1 88-2 89-1 89-2 90-1 90-2 91-1 91-2 92-1 92-2 93-1 M02-1 M02-2 M03-1 M03-2 M04-1
M04-2 M05-1 M05-2 M06-1 M06-2 M07-1 M07-2 M08-1 M09-1 M09-2 M10-1 M10-2 M11-1 M11-2 M12-1 M13-2
M14-1 M14-2 M15-1 M15-2 M16-1 M17-2 M18-1 M18-2 M19-1 M19-2 M20-1 M20-2 M21-1 M22-1 M22-2`.trim().split(/\s+/);
const PAGESET = new Set(PAGES);
function parsePos(pos) {
  const m = /^(M?\d{2})\.([12])(\d)(\d)?/.exec(pos || '');
  return m ? { folio: m[1], side: m[2], col: m[3], entry: m[4] || '', page: `${m[1]}-${m[2]}` } : null;
}
function posLink(pos, cls = '') {
  const p = parsePos(pos);
  if (!p || !PAGESET.has(p.page)) return `<span class="${cls}">${esc(pos)}</span>`;
  return `<a href="pages/${p.page}.jpg" class="wpos ${cls}" data-pos="${esc(pos)}" title="Show this Wenhai page">${esc(pos)}</a>`;
}
const PV = { page: null, pos: null, z: 1, x: 0, y: 0 };
function initPageView() {
  const V = $('#pageView'), st = $('#pvStage'), img = $('#pvImg');
  const apply = () => { img.style.transform = `translate(${PV.x}px,${PV.y}px) scale(${PV.z})`; };
  PV.fitTo = (part = 'all') => {           // all | copy (left half) | orig (right half)
    const W = st.clientWidth, H = st.clientHeight, iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw) return;
    const x0 = part === 'orig' ? iw / 2 : 0, w = part === 'all' ? iw : iw / 2;
    PV.z = Math.min(W / w, H / ih);
    PV.x = (W - w * PV.z) / 2 - x0 * PV.z; PV.y = (H - ih * PV.z) / 2;
    apply();
    V.querySelectorAll('[data-fit]').forEach(b => b.classList.toggle('on', b.dataset.fit === part));
  };
  const zoomAt = (f, cx, cy) => {
    const z = Math.min(Math.max(PV.z * f, 0.05), 3);
    PV.x = cx - (cx - PV.x) * z / PV.z; PV.y = cy - (cy - PV.y) * z / PV.z; PV.z = z; apply();
    V.querySelectorAll('[data-fit]').forEach(b => b.classList.remove('on'));
  };
  img.onload = () => { $('#pvLoad').hidden = true; PV.fitTo(PV.part || 'all'); };
  st.addEventListener('wheel', e => {
    e.preventDefault();
    const r = st.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  let drag = null;
  st.addEventListener('pointerdown', e => { drag = { x: e.clientX - PV.x, y: e.clientY - PV.y }; st.setPointerCapture(e.pointerId); st.classList.add('drag'); });
  st.addEventListener('pointermove', e => { if (!drag) return; PV.x = e.clientX - drag.x; PV.y = e.clientY - drag.y; apply(); });
  const end = () => { drag = null; st.classList.remove('drag'); };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  st.addEventListener('dblclick', e => { const r = st.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top); });
  V.querySelectorAll('[data-fit]').forEach(b => b.onclick = () => { PV.part = b.dataset.fit; PV.fitTo(PV.part); });
  $('#pvNext').onclick = () => turnPage(1);
  $('#pvPrev').onclick = () => turnPage(-1);
  $('#pvClose').onclick = closePage;
  V.addEventListener('click', e => { if (e.target === V) closePage(); });
  document.addEventListener('keydown', e => {
    if (V.hidden) return;
    if (e.key === 'Escape') closePage();
    else if (e.key === 'ArrowLeft') turnPage(1);     // the book reads right to left
    else if (e.key === 'ArrowRight') turnPage(-1);
    else if (e.key === '+' || e.key === '=') zoomAt(1.25, st.clientWidth / 2, st.clientHeight / 2);
    else if (e.key === '-') zoomAt(0.8, st.clientWidth / 2, st.clientHeight / 2);
    else if (e.key === '0') PV.fitTo(PV.part || 'all');
    else return;
    e.preventDefault();
  });
  window.addEventListener('resize', () => { if (!V.hidden) PV.fitTo(PV.part || 'all'); });
}
function openPage(pos) {
  const p = parsePos(pos); if (!p || !PAGESET.has(p.page)) return;
  PV.pos = pos; $('#pageView').hidden = false; document.body.classList.add('pv-open');
  showPage(p.page);
}
function showPage(page) {
  PV.page = page;
  const [folio, side] = page.split('-');
  const p = parsePos(PV.pos), here = p && p.page === page;
  const part = folio.startsWith('M') ? '雜類' : '平聲';
  const fn = folio.startsWith('M') ? 'M' + +folio.slice(1) : +folio;
  $('#pvCap').innerHTML = `<b>Folio ${fn}, side ${side}</b> · ${part}` +
    (here ? `<span class="pv-where"> · <b>${esc(PV.pos)}</b>: column ${p.col} from the right${p.entry ? `, entry ${p.entry}` : ''}</span>` : '');
  const i = PAGES.indexOf(page);
  $('#pvNext').disabled = i >= PAGES.length - 1; $('#pvPrev').disabled = i <= 0;
  $('#pvLoad').hidden = false;
  $('#pvImg').src = `pages/${page}.jpg`;
}
function turnPage(d) {
  const i = PAGES.indexOf(PV.page) + d;
  if (i >= 0 && i < PAGES.length) showPage(PAGES[i]);
}
function closePage() { $('#pageView').hidden = true; document.body.classList.remove('pv-open'); $('#pvImg').removeAttribute('src'); }
