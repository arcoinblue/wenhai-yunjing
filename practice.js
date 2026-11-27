// Radical code practice: a character is shown, the reader types its radical code.
(async () => {
  const { esc, syls, S } = TG;
  const $ = s => document.querySelector(s);
  const KEY = 'wyj-practice';
  const P = Object.assign({ pool: 'all', len: 'any', reduced: false, info: true, picker: true, best: 0, missed: [] }, TG.store(KEY));
  const save = () => TG.save(P, KEY);
  let cur = null, done = false, hinted = 0, recent = [], ok = 0, tried = 0, streak = 0, pk = null;

  await TG.load();
  const coded = S.chars.filter(c => c.k);

  // ---- options ----------------------------------------------------------------------------------
  const setRadio = (n, v) => { const i = document.querySelector(`input[name=${n}][value="${v}"]`); if (i) i.checked = true; };
  setRadio('pool', P.pool); setRadio('len', P.len);
  $('#optReduced').checked = P.reduced; $('#optInfo').checked = P.info; $('#optPicker').checked = P.picker;
  document.querySelectorAll('input[name=pool], input[name=len]').forEach(i => i.onchange = () => { P[i.name] = i.value; save(); next(); });
  $('#optReduced').onchange = e => { P.reduced = e.target.checked; save(); if (done) check(true); };
  $('#optInfo').onchange = e => { P.info = e.target.checked; save(); $('#info').hidden = !P.info && !done; };
  $('#optPicker').onchange = e => { P.picker = e.target.checked; save(); $('#pk').hidden = !P.picker; };
  $('#clearMissed').onclick = () => { P.missed = []; save(); drawMissed(); };

  function pool() {
    let a = P.pool === 'missed' ? P.missed.map(c => S.byChar.get(c)).filter(Boolean) : coded;
    if (P.pool === 'wh') a = a.filter(c => c.wh);
    const n = c => c.sy.length;
    if (P.len === 's') a = a.filter(c => n(c) <= 4);
    else if (P.len === 'm') a = a.filter(c => n(c) >= 5 && n(c) <= 6);
    else if (P.len === 'l') a = a.filter(c => n(c) >= 7);
    return a;
  }

  // ---- card ---------------------------------------------------------------------------------------
  function next(ch) {
    const a = pool();
    if (!ch) {
      if (!a.length) {
        $('#card').innerHTML = `<p class="muted">${P.pool === 'missed' ? 'No missed characters with these settings. Well done.' : 'No characters with these settings.'}</p>`;
        cur = null; return;
      }
      const fresh = a.filter(c => !recent.includes(c.c));
      const from = fresh.length ? fresh : a;
      ch = from[Math.floor(Math.random() * from.length)];
    }
    cur = ch; done = false; hinted = 0;
    recent.push(ch.c); if (recent.length > 30) recent.shift();
    const reads = ch.reads.map(r => r[0]).filter((x, i, A) => A.indexOf(x) === i).join(' · ') || '–';
    const mean = ch.reads.map((r, i) => TG.meaningOf(ch.c, i)).filter((x, i, A) => x && A.indexOf(x) === i).join('; ');
    const parts = ch.parts.length;
    $('#card').innerHTML = `
      <div class="pc-top">
        <div class="pc-char" title="${ch.c}">${ch.c}</div>
        <div class="pc-info">
          <div id="info" ${P.info ? '' : 'hidden'}><div class="ghc">${esc(reads)}</div><div>${esc(mean) || '<span class="meta">no meaning recorded</span>'}</div></div>
          <div class="meta">${ch.sy.length} radical${ch.sy.length > 1 ? 's' : ''}${parts > 1 ? ` in ${parts} parts` : ''}${ch.wh ? ` · Wenhai ${esc(ch.wh)}` : ''}</div>
        </div>
      </div>
      <div class="pc-code"><input id="code" class="codebox" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type the code, e.g. maca-nali"></div>
      <div class="preview" id="prev"><span class="ph">Radicals you type appear here.</span></div>
      <div class="pc-row">
        <button class="btn pri" id="bCheck">Check <span class="kbd">Enter</span></button>
        <button class="btn" id="bHint">Hint <span class="kbd">Tab</span></button>
        <button class="btn" id="bShow">Show answer <span class="kbd">Esc</span></button>
        <button class="btn" id="bSkip">Skip</button>
      </div>
      <div id="result"></div>
      <div class="picker" id="pk" ${P.picker ? '' : 'hidden'}></div>`;
    const box = $('#code');
    box.oninput = preview;
    box.onkeydown = e => {
      if (e.key === 'Enter') { e.preventDefault(); done ? next() : check(); }
      else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); if (!done) hint(); }
      else if (e.key === 'Escape') { e.preventDefault(); if (!done) reveal(); }
    };
    $('#bCheck').onclick = () => (done ? next() : check());
    $('#bHint').onclick = () => { hint(); box.focus(); };
    $('#bShow').onclick = () => reveal();
    $('#bSkip').onclick = () => next();
    pk = TG.picker($('#pk'), {
      onPick: n => edit(v => v + n),
      onDash: () => edit(v => (v && !v.endsWith('-') ? v + '-' : v)),
      onUndo: () => edit(TG.undoSyl),
      onClear: () => edit(() => ''),
    });
    box.focus();
  }
  function edit(f) { const b = $('#code'); if (!b || done) return; b.value = f(b.value); preview(); b.focus(); }
  function preview() {
    const v = $('#code').value.toLowerCase();
    const P2 = TG.parseCode(v);
    if (!v.trim()) { $('#prev').innerHTML = '<span class="ph">Radicals you type appear here.</span>'; return; }
    const segs = v.replace(/[^a-z\-]/g, '').split('-');
    $('#prev').innerHTML = segs.map(s => {
      const sy = syls(s), rest = s.slice(sy.join('').length);
      return `<span class="rpart">${sy.map(x => TG.radImg(x)).join('')}${rest ? `<span class="rbad" title="unfinished">${esc(rest)}…</span>` : ''}${!s ? '&nbsp;' : ''}</span>`;
    }).join('<span class="rdash">-</span>') + (P2 ? '' : ' <span class="ph">(a code is consonant + vowel syllables)</span>');
  }

  // ---- checking --------------------------------------------------------------------------------------
  const same = (a, b, red) => a === b ? 2 : red && S.eq.get(a) && S.eq.get(a).has(b) ? 1 : 0;
  function align(T, C, red) {                    // edit-distance alignment of typed vs correct syllables
    const n = T.length, m = C.length, d = [];
    for (let i = 0; i <= n; i++) { d.push([]); for (let j = 0; j <= m; j++) d[i][j] = i === 0 ? j : j === 0 ? i : 0; }
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      const s = same(T[i - 1], C[j - 1], red), cost = s === 2 ? 0 : s === 1 ? 0.3 : 1;
      d[i][j] = Math.min(d[i - 1][j - 1] + cost, d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
    const out = [];
    for (let i = n, j = m; i > 0 || j > 0;) {
      if (i > 0 && j > 0) {
        const s = same(T[i - 1], C[j - 1], red), cost = s === 2 ? 0 : s === 1 ? 0.3 : 1;
        if (Math.abs(d[i][j] - (d[i - 1][j - 1] + cost)) < 1e-9) { out.unshift({ t: T[i - 1], c: C[j - 1], s: s === 2 ? 'ok' : s === 1 ? 'close' : 'no' }); i--; j--; continue; }
      }
      if (i > 0 && Math.abs(d[i][j] - (d[i - 1][j] + 1)) < 1e-9) { out.unshift({ t: T[i - 1], s: 'extra' }); i--; continue; }
      out.unshift({ c: C[j - 1], s: 'miss' }); j--;
    }
    return out;
  }
  function verdictOf(typed) {
    const T = syls(typed.toLowerCase().replace(/[^a-z\-]/g, '')), C = cur.sy;
    const red = P.reduced && C.length >= 2;
    const al = align(T, C, red);
    const exact = T.join('') === C.join('') && typed.toLowerCase().replace(/[^a-z]/g, '') === cur.k;
    const close = !exact && red && T.length === C.length && T.every((t, i) => same(t, C[i], true));
    return { al, v: exact ? 'ok' : close ? 'close' : 'no' };
  }
  function check(redraw = false) {
    if (!cur) return;
    const typed = $('#code').value;
    if (!redraw && !typed.trim()) { $('#code').focus(); return; }
    const { al, v } = verdictOf(typed);
    if (!redraw) {
      tried++;
      const right = (v === 'ok' || v === 'close') && !hinted;
      if (right) { ok++; streak++; P.missed = P.missed.filter(c => c !== cur.c); }
      else { streak = 0; if (!P.missed.includes(cur.c)) P.missed.push(cur.c); }
      if (streak > P.best) P.best = streak;
      save(); drawStats(); drawMissed();
    }
    showResult(al, v, typed);
  }
  function reveal() {
    if (!cur || done) return;
    tried++; streak = 0;
    if (!P.missed.includes(cur.c)) P.missed.push(cur.c);
    save(); drawStats(); drawMissed();
    showResult(null, 'shown', $('#code').value);
  }
  function hint() {
    if (!cur || done) return;
    const box = $('#code');
    const T = syls(box.value.toLowerCase().replace(/[^a-z\-]/g, ''));
    let k = 0; while (k < T.length && k < cur.sy.length && T[k] === cur.sy[k]) k++;
    if (k >= cur.sy.length) return;
    hinted++;
    // rebuild the box from the correct code up to k+1 radicals, with its hyphens
    let n = 0, s = '';
    for (const [pi, ps] of cur.psy.entries()) {
      if (pi) s += '-';
      for (const x of ps) { if (n === k + 1) break; s += x; n++; }
      if (n === k + 1) break;
    }
    box.value = s; preview(); box.focus();
  }
  function showResult(al, v, typed) {
    done = true;
    $('#info').hidden = false;
    const head = { ok: ['ok', hinted ? 'Right, with hints' : 'Right'], close: ['close', hinted ? 'Right with reduced radicals, with hints' : 'Right with reduced radicals'],
      no: ['no', 'Not quite'], shown: ['no', 'The answer'] }[v];
    const pill = p => {
      const n = p.t || p.c;
      return `<span class="sy ${p.s}" title="${p.s === 'miss' ? 'missing: ' + p.c : p.s === 'extra' ? 'not in the code' : p.s === 'close' ? 'same group as ' + p.c : p.s === 'no' ? 'should be ' + p.c : ''}">${TG.radImg(n)}<span>${esc(n)}</span></span>`;
    };
    const yours = al && typed.trim() ? `<div>You typed</div><div class="syls">${al.map(pill).join('')}</div>` : '';
    $('#result').innerHTML = `
      <div class="verdict ${head[0]}">${head[1]}</div>
      <div class="cmp">${yours}
        <div>Code</div><div class="syls"><span class="mono code-ans">${esc(cur.code)}</span></div>
        <div></div><div class="syls">${TG.codePics(cur.code)}</div>
      </div>
      <div class="pc-row"><button class="btn pri" id="bNext">Next <span class="kbd">Enter</span></button></div>`;
    $('#bNext').onclick = () => next();
    ['bCheck', 'bHint', 'bShow'].forEach(id => { const b = $('#' + id); if (b) b.disabled = true; });
    $('#code').readOnly = true; $('#code').focus();
  }

  // ---- side panel ------------------------------------------------------------------------------------
  function drawStats() {
    $('#stOk').textContent = ok; $('#stTry').textContent = tried; $('#stStreak').textContent = streak;
    $('#stBest').textContent = P.best ? `Best streak in this browser: ${P.best}` : '';
  }
  function drawMissed() {
    $('#missed').innerHTML = P.missed.length
      ? P.missed.slice(-60).map(c => `<button type="button" title="practise ${c}">${c}</button>`).join('')
      : '<span class="side-note">None yet.</span>';
  }
  $('#missed').onclick = e => { const b = e.target.closest('button'); if (b) next(S.byChar.get(b.textContent)); };
  document.addEventListener('keydown', e => {
    if (done && e.key === 'Enter' && document.activeElement && document.activeElement.id !== 'code' && !/BUTTON|INPUT/.test(document.activeElement.tagName)) next();
  });
  drawStats(); drawMissed(); next();
})();
