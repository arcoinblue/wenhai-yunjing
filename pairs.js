// Verb stem pairs (stem A ~ stem B). Data: data/pairs.json
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let D = null;

  // shared with the rhyme tables (localStorage 'wyj-opts')
  function loadOpts() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem('wyj-opts') || '{}'); } catch (e) { /* ignore */ }
    const l = document.querySelector(`input[name=lang][value=${o.lang === 'zh' ? 'zh' : 'en'}]`); if (l) l.checked = true;
    const v = document.querySelector(`input[name=view][value=${o.pairsView === 'meaning' ? 'meaning' : 'pattern'}]`); if (v) v.checked = true;
  }
  function saveOpts() {
    try {
      const o = JSON.parse(localStorage.getItem('wyj-opts') || '{}');
      o.lang = LANG(); o.pairsView = VIEW();
      localStorage.setItem('wyj-opts', JSON.stringify(o));
    } catch (e) { /* ignore */ }
  }
  const LANG = () => (document.querySelector('input[name=lang]:checked') || {}).value || 'en';
  const VIEW = () => (document.querySelector('input[name=view]:checked') || {}).value || 'pattern';

  // gloss with the [ᴀ]/[ʙ] markers set off
  const gloss = c => esc(D.chars[c][LANG()] || D.chars[c].en).replace(/\[([ᴀʙ])\]/g, '<span class="stm">[$1]</span>');

  // one stem as table cells: character, readings, meaning, Li Fanwen no., Wenhai position
  function cells(c) {
    const x = D.chars[c];
    const r = (v, cls) => `<td class="r ${cls}">${v ? esc(v) : '<span class="none">–</span>'}</td>`;
    return `<td class="ch tg" title="${esc(x.lfw)}">${esc(c)}</td>${r(x.ghc, 'ghc')}${r(x.mb, 'mb')}${r(x.miyake, 'miy')}` +
      `<td class="gl">${gloss(c)}</td><td class="ref">${esc(x.lfw || '')}</td>` +
      `<td class="ref wh" title="${x.pos ? 'Position in the Wenhai' : 'Not in the Wenhai'}">${esc(x.pos || '')}</td>`;
  }
  const NCOL = 7;
  const colHeads = () => '<th class="ch">Char</th><th>GHC</th><th>MB</th><th>Miyake</th><th class="gl">Meaning</th><th>Li</th><th>Wenhai</th>';
  // fixed column widths, so stem A and stem B line up from one section to the next
  const cols = () => '<col class="w-ch"><col class="w-r"><col class="w-r"><col class="w-r"><col><col class="w-li"><col class="w-wh">';
  const pairHead = () => `<colgroup>${cols()}<col class="w-t">${cols()}</colgroup><thead><tr class="h1"><th colspan="${NCOL}">Stem A</th><th class="tilde" rowspan="2"></th><th colspan="${NCOL}">Stem B</th></tr>
    <tr>${colHeads()}${colHeads()}</tr></thead>`;
  function pairRow(p, pat) {
    const note = pat || p.note;
    return `<tbody class="pair${p.tentative ? ' tentative' : ''}"><tr>${cells(p.a)}
      <td class="tilde">${p.tentative ? '<span class="tent" title="Tentative pair">?</span>' : '~'}</td>${cells(p.b)}</tr>
      ${note ? `<tr class="note"><td colspan="${2 * NCOL + 1}">${pat ? `<span class="pat">${esc(pat)}</span>` : ''}${p.note ? tgText(p.note) : ''}</td></tr>` : ''}</tbody>`;
  }
  // Tangut characters inside running text get the Tangut font
  const tgText = s => esc(s).replace(/([\u{16FE0}-\u{18AFF}\u{18D00}-\u{18D8F}]+)/gu, '<span class="tg">$1</span>');
  const slug = k => 'p-' + [...k].map(ch => ch.codePointAt(0).toString(36)).join('');

  function render() {
    const view = VIEW();
    let html = '', toc = '';
    if (view === 'pattern') {
      for (const g of D.patterns) {
        const id = slug(g.key);
        toc += `<a href="#${id}">${esc(g.key)}<span class="n">${g.pairs.length}</span></a>`;
        html += `<section class="psec" id="${id}"><h2>${esc(g.key)} <span class="n">${g.pairs.length} pair${g.pairs.length > 1 ? 's' : ''}</span></h2>
          <table class="pt">${pairHead()}${g.pairs.map(p => pairRow(p)).join('')}</table></section>`;
      }
    } else {
      const all = D.patterns.flatMap(g => g.pairs.map(p => ({ p, key: g.key })));
      const k = x => (D.chars[x.p.a].en || '').toLowerCase().replace(/[^a-z]/g, '');
      all.sort((a, b) => k(a).localeCompare(k(b)));
      html += `<section class="psec" id="p-all"><h2>All pairs <span class="n">${all.length}</span></h2>
        <table class="pt">${pairHead()}${all.map(x => pairRow(x.p, x.key)).join('')}</table></section>`;
      toc += `<a href="#p-all">All pairs<span class="n">${all.length}</span></a>`;
    }
    if (D.unpaired.length) {
      toc += `<a href="#p-unpaired">Unpaired<span class="n">${D.unpaired.length}</span></a>`;
      html += `<section class="psec" id="p-unpaired"><h2>Unpaired <span class="n">${D.unpaired.length} form${D.unpaired.length > 1 ? 's' : ''}</span></h2>
        <p class="muted">Marked as one stem, with no partner in the list.</p>
        <table class="pt singles"><colgroup><col class="w-st">${cols()}</colgroup><thead><tr><th>Stem</th>${colHeads()}</tr></thead><tbody>
        ${D.unpaired.map(c => `<tr><td class="stem">${D.chars[c].stem}</td>${cells(c)}</tr>`).join('')}</tbody></table></section>`;
    }
    $('#pmain').innerHTML = html;
    $('#toc').innerHTML = `<div class="toc-h">${view === 'pattern' ? 'Alternations' : 'Sections'}</div>` + toc;
  }

  loadOpts();
  document.querySelectorAll('input[name=lang], input[name=view]').forEach(r => r.onchange = () => { saveOpts(); render(); });
  fetch('data/pairs.json?v=1').then(r => r.json()).then(d => { D = d; render(); })
    .catch(() => { $('#pmain').innerHTML = '<p class="muted">Could not load data/pairs.json.</p>'; });
})();
