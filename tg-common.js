// Shared by practice.html and write.html: the Tangut character data (from the Tangut Character
// Dictionary v2.2), radical-code search (Downes's recursive radical method) and the radical picker.
window.TG = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SYL = /[^aeiou\-]+[aeiou]+/g;
  const syls = s => (s.replace(/-/g, '').match(SYL) || []);
  const CAT = { h: 'horizontal', v: 'vertical', l: 'straight legs', c: 'curled tail', s: 'supported tail', d: 'head', u: 'unclassified' };
  let D = null;
  const S = { chars: [], byChar: new Map(), words: [], byWord: new Map(), rad: [], radNames: new Set(), eq: new Map(), units: [] };

  // ---- options shared with the other pages ------------------------------------------------
  const store = (key = 'wyj-opts') => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } };
  const save = (o, key = 'wyj-opts') => { try { localStorage.setItem(key, JSON.stringify(Object.assign(store(key), o))); } catch (e) { /* ignore */ } };
  const lang = () => (store().lang === 'zh' ? 'zh' : 'en');

  // ---- loading -------------------------------------------------------------------------------
  async function load() {
    if (D) return S;
    D = await (await fetch('data/tangut.json?v=1')).json();
    S.rad = D.rad.map(([n, no, cat, cnt]) => ({ n, no, cat, cnt }));
    S.rad.forEach(r => S.radNames.add(r.n));
    S.rad.forEach(r => S.eq.set(r.n, new Set([r.n])));
    D.grp.forEach(g => g.forEach(a => g.forEach(b => S.eq.get(a).add(b))));
    for (const [c, [code, wh, mb, reads]] of Object.entries(D.ch)) {
      const parts = code ? code.split('-') : [];
      const o = { c, code, wh, mb, reads, k: code.replace(/-/g, ''), sy: syls(code), parts, psy: parts.map(syls) };
      S.chars.push(o); S.byChar.set(c, o);
    }
    S.chars.sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : 0);
    for (const [t, [g, x, en, zh]] of Object.entries(D.w)) { const o = { t, g, x, en, zh }; S.words.push(o); S.byWord.set(t, o); }
    return S;
  }

  // ---- readings and meanings -------------------------------------------------------------------
  // systems: ghc, gx, miy, mb.  Words have GHC and GX; other systems are put together from the characters.
  function readingOf(t, ri = 0, sys = 'ghc') {
    const ch = S.byChar.get(t);
    if (ch) {
      const r = ch.reads[ri] || ch.reads[0];
      if (sys === 'mb') return ch.mb || '';
      if (!r) return '';
      return { ghc: r[0], gx: r[1], miy: r[2] }[sys] || '';
    }
    const w = S.byWord.get(t);
    if (w && (sys === 'ghc' || sys === 'gx')) return sys === 'ghc' ? w.g : w.x;
    return [...t].map(c => readingOf(c, 0, sys) || '–').join('.');
  }
  function meaningOf(t, ri = 0, l = lang()) {
    const ch = S.byChar.get(t);
    if (ch) { const r = ch.reads[ri] || ch.reads[0]; return r ? (l === 'zh' ? r[4] || r[3] : r[3] || r[4]) : ''; }
    const w = S.byWord.get(t);
    if (w) return l === 'zh' ? w.zh || w.en : w.en || w.zh;
    return '';
  }

  // ---- radical-code search -----------------------------------------------------------------------
  // A code is matched from its start, or from the start of one of its parts (between hyphens).
  // Reduced (as on the dictionary site): with two or more whole syllables typed, each typed syllable
  // also stands for the other radicals of its group(s); a bare last consonant is matched as a prefix.
  function parseCode(q) {
    const k = q.toLowerCase().replace(/[^a-z]/g, '');
    const m = k.match(/^((?:[^aeiou]+[aeiou]+)*)([^aeiou]*)$/);
    if (!m) return null;
    return { k, sy: m[1].match(SYL) || [], frag: m[2] };
  }
  function seqMatch(E, P, reduced) {        // E: entry syllables; P: parsed query
    const n = P.sy.length;
    if (E.length < n + (P.frag ? 1 : 0)) return false;
    for (let i = 0; i < n; i++) {
      if (E[i] === P.sy[i]) continue;
      if (!reduced || !S.eq.get(P.sy[i]) || !S.eq.get(P.sy[i]).has(E[i])) return false;
    }
    return !P.frag || E[n].startsWith(P.frag);
  }
  function codeSearch(q, { reduced = false, limit = 200 } = {}) {
    const P = parseCode(q);
    if (!P || !P.k) return { list: [], next: null, reduced: false, P };
    const red = reduced && P.sy.length >= 2;
    const run = r => {
      const full = [], part = [], next = new Set();
      for (const ch of S.chars) {
        if (!ch.k) continue;
        let hit = false;
        if (r ? seqMatch(ch.sy, P, true) : ch.k.startsWith(P.k)) {
          full.push(ch); hit = true;
          if (!P.frag && ch.sy[P.sy.length]) next.add(ch.sy[P.sy.length]);
        }
        ch.psy.forEach((ps, i) => {
          if (i === 0 && ch.psy.length === 1) return;
          if (r ? seqMatch(ps, P, true) : ch.parts[i].startsWith(P.k)) {
            if (!hit) { part.push(ch); hit = true; }
            if (!P.frag && ps[P.sy.length]) next.add(ps[P.sy.length]);
          }
        });
      }
      const ord = (a, b) => (a.k === P.k ? 0 : 1) - (b.k === P.k ? 0 : 1) || a.sy.length - b.sy.length || (a.k < b.k ? -1 : 1);
      full.sort(ord);
      return { list: full.concat(part).slice(0, limit), total: full.length + part.length, next };
    };
    let res = run(red), used = red;
    if (red && !res.total) { res = run(false); used = false; }
    return { ...res, reduced: used, P };
  }
  // is radical r a possible next radical, given the "next" syllables of the current matches
  function live(r, next, reduced) {
    if (!next) return true;
    if (next.has(r)) return true;
    if (reduced) for (const x of S.eq.get(r)) if (next.has(x)) return true;
    return false;
  }

  // ---- reading / meaning search ---------------------------------------------------------------------
  const plain = (s, y = false) => {
    let t = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/ŋ/g, 'ng').replace(/ɣ/g, 'gh').replace(/ꞏ/g, '').replace(/¹/g, '1').replace(/²/g, '2');
    t = y ? t.replace(/[ɨə]/g, 'y') : t.replace(/ɨ/g, 'i').replace(/ə/g, 'e');
    return t.replace(/[^a-z0-9.]/g, '');
  };
  function readingSearch(q, { limit = 120 } = {}) {
    const n = q.toLowerCase().trim().replace(/[\s\-]+/g, '.');
    const qq = plain(n), qy = plain(n, true);
    if (!qq) return [];
    const toneless = !/[12]/.test(qq);
    const score = g => {
      let best = 9;
      for (const p of [plain(g), plain(g, true)]) {
        const p0 = p.replace(/[12]/g, '');
        if (p === qq || p === qy) best = Math.min(best, 0);
        else if (toneless && (p0 === qq || p0 === qy)) best = Math.min(best, 1);
        else if (p.startsWith(qq) || p.startsWith(qy) || (toneless && (p0.startsWith(qq) || p0.startsWith(qy)))) best = Math.min(best, 3);
      }
      return best;
    };
    const out = [];
    for (const ch of S.chars) ch.reads.forEach((r, ri) => { const s = score(r[0]); if (s < 9) out.push({ t: ch.c, ri, s, len: 1 }); });
    for (const w of S.words) { const s = score(w.g); if (s < 9) out.push({ t: w.t, ri: 0, s: s + 0.5, len: w.t.length }); }
    out.sort((a, b) => a.s - b.s || a.len - b.len);
    return out.slice(0, limit);
  }
  function meaningSearch(q, { limit = 120, l = lang() } = {}) {
    q = q.trim(); if (!q) return [];
    const cjk = /[㐀-鿿]/.test(q);
    const lq = q.toLowerCase();
    const re = new RegExp('(^|[^a-z])' + lq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])', 'i');
    const score = (en, zh) => {
      if (cjk) { const z = (zh || '').replace(/[【】]/g, ''); return z === q ? 0 : z.split(/[，,;；、\s]/).includes(q) ? 1 : z.includes(q) ? 3 : 9; }
      const e = (en || '').toLowerCase();
      if (e === lq) return 0;
      if (e.split(/[;,/]\s*/).includes(lq)) return 1;
      if (re.test(e)) return 2;
      return 9;
    };
    const out = [];
    for (const ch of S.chars) ch.reads.forEach((r, ri) => { const s = score(r[3], r[4]); if (s < 9) out.push({ t: ch.c, ri, s, len: 1 }); });
    for (const w of S.words) { const s = score(w.en, w.zh); if (s < 9) out.push({ t: w.t, ri: 0, s: s + 0.5, len: w.t.length }); }
    out.sort((a, b) => a.s - b.s || a.len - b.len);
    return out.slice(0, limit);
  }
  // Tangut text -> units, longest dictionary word first
  function splitText(text) {
    const cs = [...text].filter(c => S.byChar.has(c) || /[\u{17000}-\u{18D8F}]/u.test(c));
    const out = [];
    for (let i = 0; i < cs.length;) {
      let n = Math.min(6, cs.length - i), done = false;
      for (; n >= 2; n--) { const w = cs.slice(i, i + n).join(''); if (S.byWord.has(w)) { out.push({ t: w, k: 'w', ri: 0 }); i += n; done = true; break; } }
      if (!done) { out.push({ t: cs[i], k: 'c', ri: 0 }); i++; }
    }
    return out;
  }

  // ---- radical pictures ---------------------------------------------------------------------------
  const radImg = (n, cls = 'rimg') => S.radNames.has(n)
    ? `<img class="${cls}" src="img/rad/${n}.png" alt="${n}" title="${n}" loading="lazy">`
    : `<span class="rbad" title="not a radical">${esc(n)}</span>`;
  // code -> pictures, parts separated
  const codePics = code => code ? code.split('-').map(p => `<span class="rpart">${syls(p).map(s => radImg(s)).join('')}</span>`).join('<span class="rdash">-</span>') : '';

  // ---- radical picker ---------------------------------------------------------------------------------
  // el: container; onPick(name) / onDash() / onUndo() / onClear()
  function picker(el, { onPick, onDash, onUndo, onClear }) {
    const byCons = {};
    S.rad.forEach(r => { const c = r.n.replace(/[aeiou]+$/, ''); (byCons[c] = byCons[c] || []).push(r); });
    const vorder = n => n.replace(/^[^aeiou]+/, '');
    const VO = ['a', 'e', 'i', 'o', 'u'];
    const vk = v => (v.length > 1 ? 10 : 0) + VO.indexOf(v[0]) + (v.length > 1 ? VO.indexOf(v[1]) / 10 : 0);
    let h = `<div class="pk-bar"><button type="button" data-a="dash" title="Next part (-)">– next part</button><button type="button" data-a="undo" title="Remove the last radical">⌫ undo</button><button type="button" data-a="clear">clear</button></div><div class="pk-grid">`;
    Object.keys(byCons).sort().forEach(c => {
      h += `<div class="pk-row"><span class="pk-c">${c}</span>` + byCons[c].sort((a, b) => vk(vorder(a.n)) - vk(vorder(b.n)))
        .map(r => `<button type="button" class="pk" data-r="${r.n}" title="${r.n} · no. ${r.no} · ${CAT[r.cat]} · in ${r.cnt} characters"><img src="img/rad/${r.n}.png" alt="" loading="lazy"><span>${r.n}</span></button>`).join('') + '</div>';
    });
    el.innerHTML = h + '</div>';
    el.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });   // keep focus in the box
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.classList.contains('off')) return;
      if (b.dataset.r) onPick(b.dataset.r);
      else ({ dash: onDash, undo: onUndo, clear: onClear })[b.dataset.a]?.();
    });
    return {
      dim(next, reduced) {
        el.querySelectorAll('button.pk').forEach(b => b.classList.toggle('off', !live(b.dataset.r, next, reduced)));
      },
    };
  }
  // typed text helpers for the code box
  const undoSyl = q => q.endsWith('-') ? q.slice(0, -1) : q.replace(/[^aeiou\-]*[aeiou]*$/, '');

  return { esc, syls, load, S, store, save, lang, readingOf, meaningOf, parseCode, codeSearch, live, readingSearch, meaningSearch,
    splitText, radImg, codePics, picker, undoSyl, CAT };
})();
