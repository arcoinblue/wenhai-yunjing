// Rhyme reconstructions: the 105 rhymes by 攝 (lax ~ tense ~ rhotic). Data: data/rhymes.json
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BLOCKS = [['Lax', 'major cycle'], ['Tense', 'minor cycle 1'], ['Rhotic', 'minor cycles 2, 3']];
  const ROWNAME = { 1: 'tone 1', 3: 'tone 1, -w-', 2: 'tone 2', 4: 'tone 2, -w-' };
  let D = null, cur = null;

  // ---- options (shared localStorage key with the other pages) ----------------------------
  const store = () => { try { return JSON.parse(localStorage.getItem('wyj-opts') || '{}'); } catch (e) { return {}; } };
  function save() {
    try {
      const o = store();
      o.rsys = on(); o.rtones = $('#optTones').checked;
      localStorage.setItem('wyj-opts', JSON.stringify(o));
    } catch (e) { /* ignore */ }
  }
  const on = () => [...document.querySelectorAll('input[name=sys]:checked')].map(i => i.value);
  const LANG = () => (store().lang === 'zh' ? 'zh' : 'en');

  fetch('data/rhymes.json?v=1').then(r => r.json()).then(d => {
    D = d;
    const o = store();
    const want = Array.isArray(o.rsys) ? o.rsys : D.systems.filter(s => s.on).map(s => s.k);
    const box = s => `<label title="${esc(s.name)}"><input type="checkbox" name="sys" value="${s.k}" ${want.includes(s.k) ? 'checked' : ''}> ${esc(s.lab)} <span class="nm">${esc(s.name)}</span></label>`;
    $('#sysBox').innerHTML = D.systems.filter(s => !s.group).map(box).join('');
    $('#trBox').innerHTML = D.systems.filter(s => s.group).map(box).join('');
    $('#optTones').checked = o.rtones !== false;
    document.querySelectorAll('input[name=sys], #optTones').forEach(i => i.onchange = () => { save(); render(); });
    document.querySelectorAll('.sysbtns button').forEach(b => b.onclick = () => {
      document.querySelectorAll('input[name=sys]').forEach(i => {
        const s = D.systems.find(x => x.k === i.value);
        i.checked = b.dataset.set === 'all' ? !s.group : s.on;
      });
      save(); render();
    });
    $('#rclose').onclick = () => select(null);
    $('#pmain').addEventListener('click', e => {
      const t = e.target.closest('td.rno'); if (t) select(+t.dataset.r);
    });
    $('#pmain').addEventListener('keydown', e => {
      const t = e.target.closest('td.rno'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(+t.dataset.r); }
    });
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) select(null); });
    render();
    fromHash();
  });

  function fromHash() {
    const r = +new URLSearchParams(location.hash.slice(1)).get('r');
    select(r >= 1 && r <= 105 ? r : null, true);
  }

  // ---- table ---------------------------------------------------------------------------------
  function val(r, k, sub) {
    const R = D.rhymes[r], v = R.v[k];
    const x = Array.isArray(v) ? v[sub] : v;
    if (!x) return '';
    let h = esc(x).replace(/\?+/g, m => `<span class="q">${m}</span>`);
    if (R.alt[k]) h = `<span class="dif" title="Beaudouin's table: ${esc(R.alt[k])}">${h}</span>`;
    return h;
  }
  function render() {
    const sys = D.systems.filter(s => on().includes(s.k));
    const tones = $('#optTones').checked;
    const per = 1 + (tones ? 2 : 0) + sys.length;           // columns in each block
    let h = '<div class="rwrap"><table class="rt"><thead><tr><th class="she">攝</th>';
    BLOCKS.forEach(([b, sub]) => {
      h += `<th class="blk" title="${sub}">${b}</th>` + (tones ? '<th>平</th><th>上</th>' : '') +
        sys.map(s => `<th title="${esc(s.name)}">${esc(s.lab)}</th>`).join('');
    });
    h += '</tr></thead><tbody>';
    D.she.forEach(S => {
      let dashed = false;
      S.rows.forEach((row, i) => {
        const cls = [i === 0 ? 'first' : '', row.shade ? 'shade' : '', row.shade && !dashed ? 'dash' : ''].filter(Boolean).join(' ');
        if (row.shade) dashed = true;
        h += `<tr class="${cls}">`;
        if (i === 0) h += `<td class="she" rowspan="${S.rows.length}">${esc(S.label)}${S.sub ? `<span class="s2">(${esc(S.sub)})</span>` : ''}</td>`;
        row.cells.forEach((c, bi) => {
          const first = 'blk';
          if (!c) { h += `<td class="${first}"></td>` + '<td></td>'.repeat(per - 1); return; }
          const R = D.rhymes[c.r];
          if (c.cont) {               // only values split by row are drawn here
            sys.forEach(s => { if (Array.isArray(R.v[s.k])) h += `<td class="v ${s.k} r${c.r}" data-r="${c.r}">${val(c.r, s.k, c.k)}</td>`; });
            return;
          }
          const rs = c.span > 1 ? ` rowspan="${c.span}"` : '';
          h += `<td class="${first} rno r${c.r}" data-r="${c.r}" tabindex="0"${rs}>${c.r}</td>`;
          if (tones) h += `<td class="tn r${c.r}"${rs}>${esc(R.t1)}</td><td class="tn r${c.r}"${rs}>${esc(R.t2)}</td>`;
          sys.forEach(s => {
            const split = Array.isArray(R.v[s.k]);
            h += `<td class="v ${s.k} ${s.group ? 'tr' : ''} r${c.r}"${split ? '' : rs}>${val(c.r, s.k, 0)}</td>`;
          });
        });
        h += '</tr>';
      });
    });
    h += '</tbody></table></div>';
    $('#pmain').innerHTML = h;
    mark();
  }
  function mark() {
    document.querySelectorAll('.rt td.on').forEach(t => t.classList.remove('on'));
    if (cur) document.querySelectorAll(`.rt td.r${cur}`).forEach(t => t.classList.add('on'));
  }

  // ---- detail panel ----------------------------------------------------------------------------
  function where(r) {
    for (const S of D.she) for (const row of S.rows) {
      const bi = row.cells.findIndex(c => c && c.r === r && !c.cont);
      if (bi >= 0) return { she: S, block: BLOCKS[bi][0], cycle: BLOCKS[bi][1], shade: row.shade };
    }
    return null;
  }
  function select(r, fromhash = false) {
    cur = r || null;
    $('#pairsApp').classList.toggle('has-panel', !!cur);
    $('#rpanel').hidden = !cur;
    if (!fromhash) history.replaceState(null, '', cur ? '#r=' + cur : location.pathname + location.search);
    if (!D) return;
    mark();
    if (!cur) return;
    const R = D.rhymes[cur], W = where(cur);
    const names = R.wenhai.map(w => `${esc(w)}${R.names[w] ? ` <span class="tg">${esc(R.names[w])}</span>` : ''}`).join(' · ');
    const rows = D.systems.map(s => {
      const v = R.v[s.k];
      let x;
      if (Array.isArray(v)) x = v.map((y, i) => y ? `${esc(y)} <span class="sp">(row ${i + 1})</span>` : '').filter(Boolean).join('<br>');
      else x = esc(v);
      if (!x) x = '<span class="sp">—</span>';
      const alt = R.alt[s.k] ? `<span class="alt">Beaudouin's table: ${esc(R.alt[s.k])}</span>` : '';
      return `<tr class="${s.on ? 'def' : ''}"><td class="l" title="${esc(s.name)}">${esc(s.lab)}</td><td class="x">${x}${alt}</td></tr>`;
    }).join('');
    const A = R.mba;
    const ana = `<tr><td class="l">initial</td><td class="x">${esc(A.init) || '—'}</td></tr>
      <tr><td class="l">medial</td><td class="x">${esc(A.med) || '—'}</td></tr>
      <tr><td class="l">phonation</td><td class="x">${esc(A.phont) || '—'}</td></tr>`;
    const grades = Object.entries(R.grades).map(([k, v]) => `${k} ${v}`).join(', ');
    const link = R.chart ? `tables.html#c=${R.chart}${R.row ? '&r=' + R.row : ''}` : 'tables.html';
    const rowDesc = R.row ? ` · ${ROWNAME[R.row[0]]}, ${['', '一', '二', '三'][+R.row.split('-')[1]]}等` : '';
    const verbs = R.verbs.length ? R.verbs.map(v => `<div class="vb"><span class="tg">${esc(v.c)}</span><span class="st">${v.stem}</span>
        <span class="r">${esc(v.ghc)}</span><span class="g">${esc((v[LANG()] || v.en).replace(/\[[ᴀʙ]\]/g, ''))}</span></div>`).join('') +
        '<a class="golink" href="pairs.html">Verb stem pairs ›</a>'
      : '<div class="muted2">No verb stems with this rhyme.</div>';
    $('#rbody').innerHTML = `
      <div class="rh">Rhyme ${cur}</div>
      <div class="rsub">${W ? `攝 ${esc(W.she.label)}${W.she.sub ? ` (${esc(W.she.sub)})` : ''} · ${W.block} (${W.cycle})${W.shade ? ' · second column' : ''}` : ''}<br>Wenhai ${names || '—'}</div>
      <h3>Reconstructions</h3><table class="rv">${rows}</table>
      <h3>Beaudouin's analysis</h3><table class="rv">${ana}</table>
      <h3>In the rhyme tables</h3>
      <div class="muted2">${R.xiao} 小韻 in the Wenhai · ${R.n} characters in Miyake's database${grades ? ` (grades ${esc(grades)})` : ''}</div>
      <a class="golink" href="${link}">Chart ${R.chart} ${esc(R.chartName)}${rowDesc} ›</a>
      <h3>Verb stems</h3>${verbs}`;
    $('#rpanel').scrollTop = 0;
    const t = document.querySelector(`.rt td.rno.r${cur}`);
    if (t && fromhash) t.scrollIntoView({ block: 'center', inline: 'nearest' });
  }
})();
