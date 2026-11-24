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

  function form(c) {
    const x = D.chars[c];
    const rd = (lab, v, cls) => `<span class="rd ${cls}"><span class="lab">${lab}</span>${v ? esc(v) : '<span class="none">—</span>'}</span>`;
    return `<div class="form">
      <div class="ch tg" title="${esc(x.lfw)}">${esc(c)}</div>
      <div class="info">
        <div class="rds">${rd('GHC', x.ghc, 'ghc')}${rd('MB', x.mb, 'mb')}${rd('Miyake', x.miyake, 'miy')}</div>
        <div class="gl">${gloss(c)}</div>
        <div class="meta">${x.lfw ? `<span class="lfw">${esc(x.lfw)}</span>` : ''}${x.pos ? `<span class="wtag" title="Position in the Wenhai">Wenhai ${esc(x.pos)}</span>` : ''}</div>
      </div></div>`;
  }
  function pairRow(p, pat) {
    return `<div class="pair${p.tentative ? ' tentative' : ''}">
      <div class="side A"><div class="stem">A</div>${form(p.a)}</div>
      <div class="tilde">${p.tentative ? '<span class="tent" title="Tentative pair">?</span>' : '~'}</div>
      <div class="side B"><div class="stem">B</div>${form(p.b)}</div>
      ${pat || p.note ? `<div class="note">${pat ? `<span class="pat">${esc(pat)}</span>` : ''}${p.note ? tgText(p.note) : ''}</div>` : ''}
    </div>`;
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
          ${g.pairs.map(p => pairRow(p)).join('')}</section>`;
      }
    } else {
      const all = D.patterns.flatMap(g => g.pairs.map(p => ({ p, key: g.key })));
      const k = x => (D.chars[x.p.a].en || '').toLowerCase().replace(/[^a-z]/g, '');
      all.sort((a, b) => k(a).localeCompare(k(b)));
      html += `<section class="psec" id="p-all"><h2>All pairs <span class="n">${all.length}</span></h2>
        ${all.map(x => pairRow(x.p, x.key)).join('')}</section>`;
      toc += `<a href="#p-all">All pairs<span class="n">${all.length}</span></a>`;
    }
    if (D.unpaired.length) {
      toc += `<a href="#p-unpaired">Unpaired<span class="n">${D.unpaired.length}</span></a>`;
      html += `<section class="psec" id="p-unpaired"><h2>Unpaired <span class="n">${D.unpaired.length} form${D.unpaired.length > 1 ? 's' : ''}</span></h2>
        <p class="muted">Marked as one stem, with no partner in the list.</p>
        <div class="singles">${D.unpaired.map(c => `<div class="side ${D.chars[c].stem}"><div class="stem">${D.chars[c].stem}</div>${form(c)}</div>`).join('')}</div></section>`;
    }
    $('#pmain').innerHTML = html;
    $('#toc').innerHTML = `<div class="toc-h">${view === 'pattern' ? 'Alternations' : 'Sections'}</div>` + toc;
  }

  loadOpts();
  document.querySelectorAll('input[name=lang], input[name=view]').forEach(r => r.onchange = () => { saveOpts(); render(); });
  fetch('data/pairs.json?v=1').then(r => r.json()).then(d => { D = d; render(); })
    .catch(() => { $('#pmain').innerHTML = '<p class="muted">Could not load data/pairs.json.</p>'; });
})();
