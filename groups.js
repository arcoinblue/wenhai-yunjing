// Character groups: characters related by sound (GHC alternations), character (Downes codes) and meaning.
// Data: data/groups.json, built by tools/build_groups.py
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SYL = /[^aeiou\-]+[aeiou]+/g;
  const PAGE = 60;
  let D = null, CH = [], byChar = new Map(), linksOf = [], shown = PAGE;

  // ---- options (shared localStorage 'wyj-opts') ------------------------------------------------
  const opt = () => { try { return JSON.parse(localStorage.getItem('wyj-opts') || '{}'); } catch (e) { return {}; } };
  const val = n => (document.querySelector(`input[name=${n}]:checked`) || {}).value;
  function loadOpts() {
    const o = opt();
    const set = (n, v) => { const el = document.querySelector(`input[name=${n}][value="${v}"]`); if (el) el.checked = true; };
    set('lang', o.lang === 'zh' ? 'zh' : 'en');
    if (o.grpMode) set('mode', o.grpMode);
    if (o.grpSort) set('sort', o.grpSort);
  }
  function saveOpts() {
    try { const o = opt(); o.lang = val('lang'); o.grpMode = val('mode'); o.grpSort = val('sort'); localStorage.setItem('wyj-opts', JSON.stringify(o)); }
    catch (e) { /* ignore */ }
  }

  // ---- data ------------------------------------------------------------------------------------------
  function prep(d) {
    D = d;
    CH = d.chars.map(([c, ghc, mb, miy, en, zh, pos, lfw, code, she, rh, cell], i) =>
      ({ i, c, ghc, mb, miy, en, zh, pos, lfw, code, she, rh, cell, plain: plain(ghc) }));
    CH.forEach(x => byChar.set(x.c, x));
    linksOf = CH.map(() => []);
    D.L = d.links.map(([a, b, p, pl, g, gp, m, how, sa, sb], i) => {
      const l = { i, a, b, p, pl, g, gp: gp ? gp.split('|') : [], m, how, sa, sb };
      linksOf[a].push(l); linksOf[b].push(l);
      return l;
    });
    $('#altList').textContent = d.alt.join(', ');
    $('#thr').textContent = `character ≥ ${d.th.g.toFixed(2)}, meaning ≥ ${d.th.m.toFixed(2)}`;
  }
  const plain = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/ŋ/g, 'ng').replace(/ɣ/g, 'gh').replace(/[ꞏˑ]/g, '').replace(/ʰ/g, 'h').replace(/¹/g, '1').replace(/²/g, '2')
    .replace(/ɨ/g, 'i').replace(/ə/g, 'e').replace(/[^a-z0-9]/g, '');
  const gloss = x => esc((val('lang') === 'zh' ? x.zh || x.en : x.en || x.zh)).replace(/\[([ᴀʙ])\]/g, '<span class="stm">[$1]</span>');

  // ---- pieces -----------------------------------------------------------------------------------------
  // Mark the shared radical runs in a code, syllable by syllable inside each block.
  function markCode(code, pieces) {
    if (!code) return '<span class="none">–</span>';
    return code.split('-').map(b => {
      const s = b.match(SYL) || [b], on = new Array(s.length).fill(false);
      for (const p of pieces) {
        const ps = p.match(SYL) || []; if (!ps.length) continue;
        for (let i = 0; i + ps.length <= s.length; i++)
          if (ps.every((x, k) => s[i + k] === x)) for (let k = 0; k < ps.length; k++) on[i + k] = true;
      }
      let out = '', open = false;
      s.forEach((x, i) => {
        if (on[i] && !open) { out += '<mark class="gp">'; open = true; }
        if (!on[i] && open) { out += '</mark>'; open = false; }
        out += esc(x);
      });
      return out + (open ? '</mark>' : '');
    }).join('-');
  }

  // ---- pieces of a row ----------------------------------------------------------------------------
  const r = (v, cls) => `<td class="r ${cls}">${v ? esc(v) : '<span class="none">–</span>'}</td>`;
  function tablesLink(x) {
    if (!x.cell) return esc(x.ghc);
    const [c, s] = x.cell.split('|');
    return `<a href="tables.html#c=${c}&amp;s=${encodeURIComponent(s)}" title="Show in the rhyme tables">${esc(x.ghc)}</a>`;
  }
  function memberRow(x, pieces) {
    return `<tr><td class="ch tg"><a class="cl" href="#ch=${encodeURIComponent(x.c)}" title="All links of this character">${esc(x.c)}</a></td>
      <td class="r ghc">${tablesLink(x)}</td>${r(x.mb, 'mb')}${r(x.miy, 'miy')}
      <td class="code mono">${markCode(x.code, pieces)}</td><td class="gl">${gloss(x)}</td>
      <td class="ref">${esc(x.lfw || '')}</td><td class="ref wh" title="${x.pos ? 'Position in the Wenhai' : 'Not in the Wenhai'}">${esc(x.pos || '')}</td></tr>`;
  }
  const memberHead = () => `<colgroup><col class="w-ch"><col class="w-r"><col class="w-r"><col class="w-r"><col class="w-code"><col><col class="w-li"><col class="w-wh"></colgroup>
    <thead><tr><th class="ch">Char</th><th>GHC</th><th>MB</th><th>Miyake</th><th>Radical code</th><th class="gl">Meaning</th><th>Li</th><th>Wenhai</th></tr></thead>`;

  const bar = (v, on) => `<span class="bar${on ? ' on' : ''}" title="${v.toFixed(2)}"><i style="width:${Math.round(v * 100)}%"></i></span><span class="sc">${v.toFixed(2)}</span>`;
  function linkCells(l, other) {
    const thG = D.th.g, thM = D.th.m;
    const sound = `<td class="lk snd">${bar(l.p, true)}<span class="lab">${esc(l.pl)}</span></td>`;
    const chr = `<td class="lk chr">${bar(l.g, l.g >= thG)}${l.gp.length ? `<span class="lab mono">${l.gp.map(esc).join(', ')}</span>` : ''}</td>`;
    const mng = `<td class="lk mng">${bar(l.m, l.m >= thM)}${l.m ? `<span class="lab">${l.sa === l.sb ? esc(l.sa) : `${esc(l.sa)} ~ ${esc(l.sb)}`}${l.how && l.how.includes('中') ? ' <span class="nm">(中)</span>' : ''}</span>` : ''}</td>`;
    return sound + chr + mng;
  }
  const linkHead = first => `<thead><tr>${first}<th>Sound</th><th>Character</th><th>Meaning</th></tr></thead>`;

  // ---- groups -------------------------------------------------------------------------------------------
  function score(g) { return g.s; }
  function majorityShe(g) {
    const n = {}; g.m.forEach(i => { n[CH[i].she] = (n[CH[i].she] || 0) + 1; });
    return +Object.entries(n).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  }
  function matches(g, q) {
    if (!q) return true;
    const pq = plain(q), lq = q.toLowerCase();
    const tg = /[\u{16FE0}-\u{18AFF}\u{18D00}-\u{18D8F}]/u.test(q);
    return g.m.some(i => {
      const x = CH[i];
      if (tg) return q.includes(x.c);
      if (pq && /[a-z]/.test(pq) && (x.plain === pq || x.plain.replace(/[12]/g, '') === pq)) return true;
      return (x.en || '').toLowerCase().includes(lq) || (x.zh || '').includes(q);
    });
  }
  function groupHtml(g, n) {
    const L = g.e.map(i => D.L[i]);
    const pieces = [...new Set(L.flatMap(l => l.gp))];
    const alts = [...new Set(L.flatMap(l => l.pl.split(' · ')))];
    const members = g.m.map(i => CH[i]);
    return `<section class="psec grp" id="g${n}">
      <h2>${members.map(x => `<span class="tg">${esc(x.c)}</span>`).join('')}
        <span class="n">group ${n} · ${members.length} characters · score ${g.s.toFixed(2)}</span></h2>
      <div class="alts">${alts.map(a => `<span class="alt">${esc(a)}</span>`).join('')}</div>
      <table class="pt mem">${memberHead()}<tbody>${members.map(x => memberRow(x, pieces)).join('')}</tbody></table>
      <details class="links"><summary>${L.length} link${L.length > 1 ? 's' : ''}</summary>
        <table class="pt lt"><colgroup><col class="w-pair"><col class="w-l"><col class="w-l"><col class="w-l"></colgroup>
        ${linkHead('<th>Pair</th>')}<tbody>
        ${L.map(l => `<tr><td class="pair tg">${esc(CH[l.a].c)}<span class="tl">~</span>${esc(CH[l.b].c)}</td>${linkCells(l)}</tr>`).join('')}
        </tbody></table></details>
    </section>`;
  }

  function list() {
    const mode = D.modes[val('mode')], q = $('#q').value.trim();
    let G = mode.groups.map((g, k) => ({ ...g, n: k + 1 })).filter(g => matches(g, q));
    const sort = val('sort');
    if (sort === 'score') G.sort((a, b) => b.s - a.s);
    if (sort === 'she') { G.forEach(g => { g.she = majorityShe(g); }); G.sort((a, b) => a.she - b.she || b.m.length - a.m.length || b.s - a.s); }
    return { mode, G, sort };
  }

  function render() {
    const { mode, G, sort } = list();
    let html = charPanel();
    const total = G.reduce((s, g) => s + g.m.length, 0);
    html += `<p class="muted gsum">${G.length} group${G.length === 1 ? '' : 's'} · ${total} characters · ${esc(mode.label)}</p>`;
    let toc = `<div class="toc-h">Groups <span class="n">${G.length}</span></div>`;
    const part = G.slice(0, shown);
    if (sort === 'she') {
      let last = -1;
      const count = {}; G.forEach(g => { count[g.she] = (count[g.she] || 0) + 1; });
      for (const g of part) {
        if (g.she !== last) { html += `<h2 class="she" id="she${g.she}">攝 ${esc(D.she[g.she])} <span class="n">${count[g.she]}</span></h2>`; last = g.she; }
        html += groupHtml(g, g.n);
      }
      toc += Object.keys(count).map(s => `<a href="#she${s}" data-she="${s}">攝 ${esc(D.she[s])}<span class="n">${count[s]}</span></a>`).join('');
    } else {
      html += part.map(g => groupHtml(g, g.n)).join('');
      const sizes = {}; G.forEach(g => { sizes[g.m.length] = (sizes[g.m.length] || 0) + 1; });
      toc += Object.keys(sizes).sort((a, b) => b - a).map(k => `<span class="tocrow">${k} characters<span class="n">${sizes[k]}</span></span>`).join('');
    }
    if (G.length > shown) html += `<p class="more"><button class="btn" id="more">Show ${Math.min(PAGE, G.length - shown)} more</button> <span class="muted">of ${G.length - shown} left</span></p>`;
    if (!G.length) html += '<p class="muted">No group matches.</p>';
    $('#gmain').innerHTML = html;
    $('#toc').innerHTML = toc;
    const m = $('#more'); if (m) m.onclick = () => { shown += PAGE; render(); };
    $('#toc').querySelectorAll('a[data-she]').forEach(a => a.onclick = e => {
      // make sure the section is rendered before jumping to it
      const idx = G.findIndex(g => g.she === +a.dataset.she);
      if (idx >= shown) { e.preventDefault(); shown = idx + PAGE; render(); location.hash = ''; document.getElementById('she' + a.dataset.she).scrollIntoView(); }
    });
    const cp = $('#cpClose'); if (cp) cp.onclick = () => { history.replaceState(null, '', location.pathname); render(); };
  }

  // ---- one character: all its links, in every mode -------------------------------------------------------------
  function charPanel() {
    const h = new URLSearchParams(location.hash.slice(1)).get('ch');
    const x = h && byChar.get(h);
    if (!h) return '';
    if (!x) return `<section class="cpanel"><p class="muted">${esc(h)}: no links (not in the rhyme tables, or nothing passes even the loosest thresholds). <button class="btn sm" id="cpClose">Close</button></p></section>`;
    const L = linksOf[x.i].slice().sort((a, b) => b.p * (b.g + b.m) - a.p * (a.g + a.m));
    const inModes = Object.entries(D.modes).map(([k, md]) => {
      const n = md.groups.findIndex(g => g.m.includes(x.i));
      return n < 0 ? '' : `<span class="alt">${esc(md.label)}: group ${n + 1}</span>`;
    }).join('');
    return `<section class="cpanel psec">
      <h2><span class="tg big">${esc(x.c)}</span> ${tablesLink(x)} <span class="n">${gloss(x)}</span>
        <button class="btn sm" id="cpClose">Close</button></h2>
      <div class="alts">${inModes || '<span class="muted">In no group.</span>'}</div>
      <table class="pt lt cp"><colgroup><col class="w-ch"><col class="w-r"><col><col class="w-c3"><col class="w-c3"><col class="w-c3"></colgroup>
      <thead><tr><th class="ch">Char</th><th>GHC</th><th class="gl">Meaning</th><th>Sound</th><th>Character</th><th>Meaning</th></tr></thead><tbody>
      ${L.map(l => { const y = CH[l.a === x.i ? l.b : l.a];
        return `<tr><td class="ch tg"><a class="cl" href="#ch=${encodeURIComponent(y.c)}">${esc(y.c)}</a></td><td class="r ghc">${tablesLink(y)}</td><td class="gl">${gloss(y)}</td>${linkCells(l)}</tr>`; }).join('')}
      </tbody></table>
      <p class="muted">${L.length} phonetically related character${L.length === 1 ? '' : 's'} with character ≥ 0.20 or meaning ≥ 0.40.</p>
    </section>`;
  }

  loadOpts();
  document.querySelectorAll('input[name=lang], input[name=mode], input[name=sort]').forEach(el => el.onchange = () => { shown = PAGE; saveOpts(); render(); });
  let t = null;
  $('#q').oninput = () => { clearTimeout(t); t = setTimeout(() => { shown = PAGE; render(); }, 200); };
  window.onhashchange = () => { if (/(^#|&)ch=/.test(location.hash)) { render(); $('#gmain').scrollTop = 0; } };
  fetch('data/groups.json?v=1').then(r => r.json()).then(d => { prep(d); render(); })
    .catch(e => { console.error(e); $('#gmain').innerHTML = '<p class="muted">Could not load data/groups.json.</p>'; });
})();
