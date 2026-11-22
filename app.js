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
const DENG = { 1: '一', 2: '二', 3: '三', 4: '四' };
const DENGR = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
const BLOCKEN = { plain: 'plain', tense: 'tense', r: 'retroflex', long: 'long', longr: 'long retroflex', misc: 'other' };

let D = null, cur = 1, sel = null, charIndex = null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chars = s => Array.from(s || '');

// ---- load ---------------------------------------------------------------
fetch('data/wenhai.json?v=6').then(r => r.json()).then(d => {
  D = d;
  charIndex = {};
  for (const [id, g] of Object.entries(D.groups))
    g.m.forEach(m => (charIndex[m.c] ||= []).push({ id: +id, m }));
  const sel_ = $('#chartSel');
  D.charts.forEach(c => {
    const o = document.createElement('option');
    o.value = c.n; o.textContent = `${c.n}. ${c.sheCN}${c.blockLabel} (${c.sheName})`;
    sel_.appendChild(o);
  });
  sel_.onchange = () => go(+sel_.value);
  ['#optFanqie', '#optGhc', '#optMb', '#optMiyake', '#optFinal'].forEach(id => $(id).onchange = () => { saveOpts(); render(); });
  document.querySelectorAll('input[name=lang]').forEach(r => r.onchange = () => { saveOpts(); showPanel(); search(); });
  loadOpts();
  $('#q').oninput = search;
  window.onhashchange = fromHash;
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
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
  } catch (e) { /* storage unavailable */ }
}
function saveOpts() {
  try { localStorage.setItem('wyj-opts', JSON.stringify({ fq: $('#optFanqie').checked, gh: $('#optGhc').checked, mb: $('#optMb').checked,
    rd: $('#optMiyake').checked, rf: $('#optFinal').checked, lang: LANG() })); }
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
  T.push(`<th colspan="2" rowspan="2" class="corner"><button class="navbtn" data-nav="-1" title="previous chart">&lt;</button><br>${esc(C.sheCN)}<br>${esc(C.blockLabel)}</th>`);
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
  for (let s = 1; s <= 4; s++) {
    for (let d = 1; d <= 4; d++) {
      T.push(`<tr class="${d === 4 ? 'secend' : ''}">`);
      T.push(`<td class="deng">${DENG[d]}</td>`);
      const rn = C.rows[`${s}-${d}`];
      const rkey = `${s}-${d}`;
      T.push(`<td class="rowname">${rn ? `<span class="rn ${rn.trad ? 'trad' : ''} ${sel && sel.type === 'row' && sel.key === rkey ? 'sel' : ''}" data-row="${rkey}" title="${esc(rn.wr)} ${esc(rn.gf)}">${esc(rn.c)}</span>${rf && rn.gf ? `<span class="rf">${esc(rn.gf)}</span>` : ''}` : ''}</td>`);
      DISPLAY.forEach((c, i) => {
        const key = `${s}-${d}-${c[0]}`;
        const ids = C.cells[key];
        const cls = ['c']; if (isGroupStart(i) && i) cls.push('sep');
        if (ids) cls.push('has');
        if (sel && sel.type === 'cell' && sel.key === key) cls.push('sel');
        let inner;
        if (ids) {
          const g = D.groups[ids[0]];
          inner = `<span class="ch">${esc(g.rep)}</span>`;
          if (fq) inner += `<span class="fq">${esc(speller(g.fanqie))}</span>`;
          if (gh) inner += `<span class="rd">${esc(g.ghc)}</span>`;
          if (mb) inner += `<span class="rd">${esc(g.mb)}</span>`;
          if (rd) inner += `<span class="rd">${esc(reading(g.miyake))}</span>`;
          if (ids.length > 1) inner += '<span class="mark"></span>';
        } else inner = '<span class="o"></span>';
        T.push(`<td class="${cls.join(' ')}" ${ids ? `data-cell="${key}"` : ''}>${inner}</td>`);
      });
      if (d === 1) T.push(`<td class="seclab" rowspan="4" title="${SECDESC[s]}">${SECTIONS[s]}</td>`);
      if (s === 1 && d === 1) T.push(`<td class="title" rowspan="16">${esc(C.title)}　${esc(C.sheCN)}${esc(C.blockLabel)}</td>`);
      T.push('</tr>');
    }
  }
  T.push('</tbody>');
  const t = $('#chart');
  t.innerHTML = T.join('');
  t.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => go(cur + +b.dataset.nav));
  t.querySelectorAll('[data-cell]').forEach(td => td.onclick = () => { sel = { type: 'cell', key: td.dataset.cell }; setHash(); render(); showPanel(); });
  t.querySelectorAll('[data-row]').forEach(el => el.onclick = () => { sel = { type: 'row', key: el.dataset.row }; setHash(); render(); showPanel(); });
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
  if (!f) return '<span style="color:#888">—</span>';
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
  if (R) s += `${s ? ' · ' : ''}Miyake rhyme ${g.mrhyme} (${esc(R.final)})`;
  return s;
}
function cardHTML(id, idx, total) {
  const g = D.groups[id];
  const tag = g.shown ? '<span class="tag">in chart</span>' : '<span class="tag hid">not shown</span>';
  const rows = g.m.map((m, i) => {
    const diff = m.ghc !== g.ghc || m.miyake !== g.miyake;
    const tip = `GHC ${m.ghc} · MB ${m.mb} · Miyake ${m.miyake}${m.flag ? ' · ' + m.flag : ''}`;
    return `<tr class="${diff ? 'warn' : ''}" title="${esc(tip)}">
      <td class="n">${i + 1}</td><td class="tg">${esc(m.c)}</td>
      <td class="gl">${esc(gloss(m)) || '<span class="muted">—</span>'}${diff ? `<span class="rdiff">GHC ${esc(m.ghc)} · Miyake ${esc(m.miyake)}</span>` : ''}</td>
      <td class="lfw">${esc(m.lfw)}<br><span class="muted">${esc(m.pos)}</span></td></tr>`;
  }).join('');
  return `<div class="card">
    <div class="card-h"><span class="big">${esc(g.rep)}</span>
      <div class="info">小韻 ${idx} / ${total} ${tag}<br>Wenhai ${esc(g.pos)} · ${esc(g.part)}
        ${gloss(g.m[0]) ? `<br><span class="hgl">${esc(gloss(g.m.find(m => m.c === g.rep) || g.m[0]))}</span>` : ''}</div></div>
    <dl class="kv">
      <dt>Fanqie</dt><dd>${fanqieHTML(g.fanqie)}</dd>
      <dt>Rhyme</dt><dd>${rhymeLine(g)}</dd>
      <dt>GHC</dt><dd>${esc(g.ghc)}</dd>
      <dt>MB</dt><dd>${esc(g.mb)}</dd>
      <dt>Miyake</dt><dd>${esc(g.miyake)}</dd>
      <dt>Characters</dt><dd>${g.m.length}</dd>
    </dl>
    <table class="mem"><thead><tr><th></th><th>字</th><th>${LANG() === 'zh' ? '字義' : 'Meaning'}</th><th>LFW · Wenhai</th></tr></thead>
      <tbody>${rows}</tbody></table>
    ${g.flag ? `<div class="flag">⚠ ${esc(g.flag)}</div>` : ''}
  </div>`;
}
function slotTitle(s, d, k) {
  const c = COLMAP[k], K = CLASSES[c[1]];
  return `<div class="slot-h">${esc(D.charts[cur - 1].title)} · ${SECTIONS[s]} · ${DENG[d]}等</div>
    <div class="slot-sub">${SECDESC[s]} · grade ${DENGR[d]} · ${c[1]}. <span class="tg">${esc(K.tg)}</span> ${esc(K.tr)} (${K.zh}) · initial ${esc(c[3])} · ${c[2]}</div>`;
}
function showPanel() {
  const P = $('#panelBody');
  const C = D.charts[cur - 1];
  if (!sel) {
    P.innerHTML = `<div class="slot-h">${esc(C.title)} ${esc(C.sheCN)}${esc(C.blockLabel)}</div>
      <div class="slot-sub">攝 ${C.she} (${esc(C.sheName)}) · ${BLOCKEN[C.block]} · Miyake rhymes ${C.rhymes.join(', ')}</div>` +
      C.rhymes.map(r => rhymeCard(r)).join('') +
      '<p class="placeholder">Click a character in the chart to see its 小韻.<br>Click a row name (roundel) for the rhyme of that row.</p>';
    return;
  }
  if (sel.type === 'cell') {
    const [s, d, k] = sel.key.split('-');
    const ids = C.cells[sel.key] || [];
    P.innerHTML = slotTitle(+s, +d, k) + ids.map((id, i) => cardHTML(id, i + 1, ids.length)).join('');
  } else {
    const [s, d] = sel.key.split('-');
    const rn = C.rows[sel.key];
    if (!rn) { P.innerHTML = ''; return; }
    const n = Object.keys(C.cells).filter(k => k.startsWith(sel.key + '-')).length;
    P.innerHTML = `<div class="slot-h">${esc(C.title)} · ${SECTIONS[s]} · ${DENG[d]}等</div>
      <div class="slot-sub">${SECDESC[s]} · grade ${DENGR[d]} · ${n} cell(s) filled</div>
      <div class="card"><div class="card-h"><span class="rn rhyme-big ${rn.trad ? 'trad' : ''}">${esc(rn.c)}</span>
        <div class="info">${rn.trad ? 'Wenhai rhyme name' : 'No Wenhai rhyme name (上聲 lost);<br>first 小韻 of the row'}</div></div>
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
    <dt>Characters</dt><dd>${R.n} in Miyake's database</dd></dl></div>`;
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
    const where = g.chart ? `chart ${g.chart} · ${SECTIONS[g.sec]} · ${DENG[g.deng]} · ${COLMAP[g.col][3]}${g.shown ? '' : ' (not shown)'}` : 'not placed';
    li.innerHTML = `<span class="tg">${esc(m.c)}</span><span class="meta">${esc(m.ghc)} · ${esc(gloss(m))}<br>${where}</span>`;
    if (g.chart) li.onclick = () => go(g.chart, { type: 'cell', key: `${g.sec}-${g.deng}-${g.col}` });
    ul.appendChild(li);
  });
  if (!hits.size) ul.innerHTML = '<li class="meta">no match</li>';
}
