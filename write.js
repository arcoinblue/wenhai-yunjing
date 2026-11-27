// Write Tangut: build sentences from radical codes, readings, meanings or pasted text.
(async () => {
  const { esc, syls, S } = TG;
  const $ = s => document.querySelector(s);
  const KEY = 'wyj-write';
  const ST = Object.assign({ sys: 'ghc', reduced: false, picker: true, mode: 'code', cur: 'd1', drafts: [{ id: 'd1', name: 'Draft 1', units: [] }] }, TG.store(KEY));
  if (!ST.drafts.length) ST.drafts = [{ id: 'd1', name: 'Draft 1', units: [] }];
  const save = () => TG.save(ST, KEY);
  const draft = () => ST.drafts.find(d => d.id === ST.cur) || ST.drafts[0];
  let caret = draft().units.length, results = [], sel = 0, pk = null, dragFrom = null;

  await TG.load();

  // ---- options -----------------------------------------------------------------------------------
  const lang = () => TG.lang();
  document.querySelector(`input[name=sys][value=${ST.sys}]`).checked = true;
  document.querySelector(`input[name=lang][value=${lang()}]`).checked = true;
  $('#optReduced').checked = ST.reduced; $('#optPicker').checked = ST.picker;
  document.querySelectorAll('input[name=sys]').forEach(i => i.onchange = () => { ST.sys = i.value; save(); draw(); search(); });
  document.querySelectorAll('input[name=lang]').forEach(i => i.onchange = () => { TG.save({ lang: i.value }); draw(); search(); });
  $('#optReduced').onchange = e => { ST.reduced = e.target.checked; save(); search(); };
  $('#optPicker').onchange = e => { ST.picker = e.target.checked; save(); $('#pk').hidden = !(ST.picker && ST.mode === 'code'); };

  // ---- drafts --------------------------------------------------------------------------------------
  function drawDrafts() {
    $('#draftSel').innerHTML = ST.drafts.map(d => `<option value="${d.id}" ${d.id === ST.cur ? 'selected' : ''}>${esc(d.name)} (${d.units.length})</option>`).join('');
  }
  $('#draftSel').onchange = e => { ST.cur = e.target.value; caret = draft().units.length; save(); draw(); };
  $('#dNew').onclick = () => {
    const id = 'd' + Date.now().toString(36);
    let n = ST.drafts.length + 1; while (ST.drafts.some(d => d.name === 'Draft ' + n)) n++;
    ST.drafts.push({ id, name: 'Draft ' + n, units: [] }); ST.cur = id; caret = 0; save(); draw(); $('#q').focus();
  };
  $('#dRen').onclick = () => { const n = prompt('Name of this draft', draft().name); if (n && n.trim()) { draft().name = n.trim(); save(); drawDrafts(); } };
  $('#dDel').onclick = () => {
    const d = draft();
    if (d.units.length && !confirm(`Delete “${d.name}”? Its ${d.units.length} words will be lost.`)) return;
    ST.drafts = ST.drafts.filter(x => x !== d);
    if (!ST.drafts.length) ST.drafts.push({ id: 'd1', name: 'Draft 1', units: [] });
    ST.cur = ST.drafts[0].id; caret = draft().units.length; save(); draw();
  };

  // ---- units ----------------------------------------------------------------------------------------
  const nReads = u => (u.k === 'c' && S.byChar.get(u.t) ? S.byChar.get(u.t).reads.length : 1);
  const rdg = u => TG.readingOf(u.t, u.ri || 0, ST.sys) || '–';
  const mean = u => (u.gl != null ? u.gl : TG.meaningOf(u.t, u.ri || 0, lang()));
  const short = s => (s || '').split(/\s*[;；]\s*/)[0].replace(/[【】]/g, '').trim();
  function insert(units) {
    const U = draft().units;
    U.splice(caret, 0, ...units.map(u => ({ t: u.t, k: u.k, ri: u.ri || 0 })));
    caret += units.length; save(); draw();
  }

  // ---- board ------------------------------------------------------------------------------------------
  function draw() {
    const U = draft().units;
    caret = Math.max(0, Math.min(caret, U.length));
    const cell = (u, i) => {
      const n = nReads(u), own = u.gl != null;
      return `<div class="u" data-i="${i}" draggable="true">
        <button type="button" class="x" data-a="del" title="Remove" aria-label="Remove">×</button>
        ${n > 1 ? `<button type="button" class="alt show" data-a="alt" title="Reading ${(u.ri || 0) + 1} of ${n}: click for the other">${'①②③④'[u.ri || 0]}</button>` : ''}
        <div class="t">${esc(u.t)}</div><div class="r">${esc(rdg(u))}</div>
        <div class="g ${own ? 'own' : ''}" title="${esc(mean(u))}${own ? ' (your gloss)' : ''} · double-click to edit">${esc(short(mean(u))) || '–'}</div></div>`;
    };
    let h = '';
    U.forEach((u, i) => { if (i === caret) h += '<span class="caret"></span>'; h += cell(u, i); });
    if (caret === U.length) h += '<span class="caret"></span>';
    $('#board').innerHTML = U.length ? h : '<span class="caret"></span><span class="empty">Search below and press Enter, or click a result, to add words here.</span>';
    $('#lT').textContent = U.map(u => u.t).join('');
    $('#lR').textContent = U.map(rdg).join(' ');
    $('#lG').textContent = U.map(u => short(mean(u)) || '–').join(' · ');
    $('#lRlab').textContent = { ghc: 'GHC', gx: 'GX', miy: 'Miyake', mb: 'MB' }[ST.sys];
    drawDrafts();
  }
  const board = $('#board');
  board.addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'), u = e.target.closest('.u');
    const U = draft().units;
    if (b && u) {
      const i = +u.dataset.i;
      if (b.dataset.a === 'del') { U.splice(i, 1); if (caret > i) caret--; }
      else { U[i].ri = ((U[i].ri || 0) + 1) % nReads(U[i]); delete U[i].gl; }
      save(); draw(); return;
    }
    if (u) { const r = u.getBoundingClientRect(); caret = +u.dataset.i + (e.clientX > r.left + r.width / 2 ? 1 : 0); }
    else caret = U.length;
    draw(); board.focus();
  });
  board.addEventListener('dblclick', e => {
    const g = e.target.closest('.g'); if (!g) return;
    const i = +g.closest('.u').dataset.i, u = draft().units[i];
    const v = prompt('Your gloss for ' + u.t + ' (empty: back to the dictionary meaning)', mean(u));
    if (v === null) return;
    if (v.trim()) u.gl = v.trim(); else delete u.gl;
    save(); draw();
  });
  board.addEventListener('dragstart', e => { const u = e.target.closest('.u'); if (!u) return; dragFrom = +u.dataset.i; u.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', u.dataset.i); });
  board.addEventListener('dragend', () => { dragFrom = null; draw(); });
  board.addEventListener('dragover', e => { if (dragFrom != null) e.preventDefault(); });
  board.addEventListener('drop', e => {
    e.preventDefault(); if (dragFrom == null) return;
    const U = draft().units, u = e.target.closest('.u');
    let to = U.length;
    if (u) { const r = u.getBoundingClientRect(); to = +u.dataset.i + (e.clientX > r.left + r.width / 2 ? 1 : 0); }
    const [m] = U.splice(dragFrom, 1); if (to > dragFrom) to--;
    U.splice(to, 0, m); caret = to + 1; dragFrom = null; save(); draw();
  });
  function boardKey(e) {           // shared by the board and the empty search box
    const U = draft().units;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const d = e.key === 'ArrowLeft' ? -1 : 1;
      if (e.shiftKey) {             // move the word before the caret
        const i = caret - 1, j = i + d;
        if (i < 0 || j < 0 || j >= U.length) return true;
        [U[i], U[j]] = [U[j], U[i]]; caret += d; save();
      } else caret = Math.max(0, Math.min(U.length, caret + d));
      draw(); return true;
    }
    if (e.key === 'Home') { caret = 0; draw(); return true; }
    if (e.key === 'End') { caret = U.length; draw(); return true; }
    if (e.key === 'Backspace' && caret > 0) { U.splice(--caret, 1); save(); draw(); return true; }
    if (e.key === 'Delete' && caret < U.length) { U.splice(caret, 1); save(); draw(); return true; }
    return false;
  }
  board.addEventListener('keydown', e => {
    if (boardKey(e)) { e.preventDefault(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { $('#q').focus(); }   // typing goes to the search box
  });

  // ---- copying ------------------------------------------------------------------------------------------
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const t = { T: $('#lT').textContent, R: $('#lR').textContent, G: $('#lG').textContent }, k = b.dataset.copy;
    const text = k === 'all' ? [t.T, t.R, t.G].join('\n') : t[k];
    try { await navigator.clipboard.writeText(text); $('#copied').textContent = 'Copied.'; }
    catch (e) { $('#copied').textContent = 'Could not copy; select the text instead.'; }
    setTimeout(() => { $('#copied').textContent = ''; }, 1600);
  });

  // ---- search ---------------------------------------------------------------------------------------------
  const PH = { code: 'radical code, e.g. maca-nali or macanali', read: 'GHC reading, e.g. dzjwo2, dzjwo, or mji1 ljwu2', mean: 'meaning in English or Chinese, e.g. snake, 蛇', text: 'paste Tangut text' };
  function setMode(m) {
    ST.mode = m; save();
    document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    $('#q').placeholder = PH[m];
    $('#q').classList.toggle('mono', m === 'code');
    $('#pk').hidden = !(ST.picker && m === 'code');
    $('#prev').hidden = m !== 'code';
    search(); $('#q').focus();
  }
  $('#modes').onclick = e => { const b = e.target.closest('button[data-m]'); if (b) setMode(b.dataset.m); };
  const tile = (r, i) => {
    const t = r.t, ch = S.byChar.get(t), u = { t, k: t.length > 1 || !ch ? 'w' : 'c', ri: r.ri || 0 };
    return `<button type="button" class="res ${i === sel ? 'sel' : ''}" data-i="${i}" title="${esc(TG.meaningOf(t, u.ri, lang()))}">
      <span class="t">${esc(t)}</span><span class="r">${esc(TG.readingOf(t, u.ri, ST.sys) || '–')}</span>
      <span class="g">${esc(short(TG.meaningOf(t, u.ri, lang())))}</span>${ch && ST.mode === 'code' ? `<span class="k">${esc(ch.code)}</span>` : ''}</button>`;
  };
  function search() {
    const q = $('#q').value, m = /[\u{17000}-\u{18D8F}]/u.test(q) ? 'text' : ST.mode;
    let note = '', count = '';
    results = []; sel = 0;
    if (m === 'code') {
      const r = TG.codeSearch(q, { reduced: ST.reduced, limit: 150 });
      results = r.list.map(c => ({ t: c.c, ri: 0 }));
      if (pk) pk.dim(q.trim() && !r.P?.frag ? r.next : null, r.reduced);
      preview(q);
      if (q.trim() && !r.P) note = 'A code is made of radical names: a consonant and its vowels (ma, caa, fea…).';
      else if (q.trim()) count = `${r.total} character${r.total === 1 ? '' : 's'}${r.total > results.length ? ` (first ${results.length})` : ''}${r.reduced ? ' · reduced' : ''}`;
    } else if (m === 'read') { results = TG.readingSearch(q); if (q.trim()) count = `${results.length}${results.length >= 120 ? '+' : ''} found`; }
    else if (m === 'mean') { results = TG.meaningSearch(q, { l: /[㐀-鿿]/.test(q) ? 'zh' : 'en' }); if (q.trim()) count = `${results.length}${results.length >= 120 ? '+' : ''} found`; }
    else if (m === 'text') {
      const units = TG.splitText(q);
      results = units.length ? [{ all: units }] : [];
      if (units.length) note = '';
    }
    $('#count').textContent = count;
    if (results.length === 1 && results[0].all) {
      const units = results[0].all;
      $('#res').innerHTML = `<button type="button" class="res sel" data-i="0" style="max-width:none;flex-direction:row;gap:10px;align-items:center">
        <span class="t">${esc(units.map(u => u.t).join(''))}</span><span class="g">add ${units.length} word${units.length > 1 ? 's' : ''} <span class="kbd">Enter</span></span></button>`;
      return;
    }
    $('#res').innerHTML = (note ? `<div class="note">${note}</div>` : '') + results.map(tile).join('') +
      (!results.length && q.trim() && !note ? '<div class="note">Nothing found.</div>' : '');
  }
  function preview(q) {
    const v = q.toLowerCase().replace(/[^a-z\-]/g, '');
    if (!v) { $('#prev').innerHTML = ''; return; }
    $('#prev').innerHTML = v.split('-').map(s => {
      const sy = syls(s), rest = s.slice(sy.join('').length);
      return `<span class="rpart">${sy.map(x => TG.radImg(x)).join('')}${rest ? `<span class="rbad" title="unfinished">${esc(rest)}…</span>` : ''}${!s ? '&nbsp;' : ''}</span>`;
    }).join('<span class="rdash">-</span>');
  }
  function choose(i) {
    const r = results[i]; if (!r) return;
    if (r.all) insert(r.all);
    else { const ch = S.byChar.get(r.t); insert([{ t: r.t, k: r.t.length > 1 || !ch ? 'w' : 'c', ri: r.ri || 0 }]); }
    $('#q').value = ''; search(); $('#q').focus();
  }
  $('#res').addEventListener('mousedown', e => { if (e.target.closest('.res')) e.preventDefault(); });
  $('#res').addEventListener('click', e => { const b = e.target.closest('.res'); if (b) choose(+b.dataset.i); });
  const q = $('#q');
  q.addEventListener('input', search);
  q.addEventListener('keydown', e => {
    if (e.altKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); setMode(['code', 'read', 'mean', 'text'][+e.key - 1]); return; }
    if (e.key === 'Enter') { e.preventDefault(); choose(sel); return; }
    if (e.key === 'Escape') { q.value = ''; search(); return; }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length > 1) {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      document.querySelectorAll('#res .res').forEach((b, i) => b.classList.toggle('sel', i === sel));
      document.querySelector('#res .res.sel')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (!q.value && boardKey(e)) e.preventDefault();
  });
  document.addEventListener('keydown', e => {
    if (e.altKey && /^[1-4]$/.test(e.key) && document.activeElement !== q) { e.preventDefault(); setMode(['code', 'read', 'mean', 'text'][+e.key - 1]); }
  });

  pk = TG.picker($('#pk'), {
    onPick: n => { q.value += n; search(); q.focus(); },
    onDash: () => { if (q.value && !q.value.endsWith('-')) q.value += '-'; search(); q.focus(); },
    onUndo: () => { q.value = TG.undoSyl(q.value); search(); q.focus(); },
    onClear: () => { q.value = ''; search(); q.focus(); },
  });
  draw(); setMode(ST.mode || 'code');
})();
