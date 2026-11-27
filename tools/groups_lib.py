"""Shared pieces for building data/groups.json: phonetic, graphic and meaning similarity."""
import json, re, math, collections, unicodedata, itertools
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SYL = re.compile(r'[^aeiou\-]+[aeiou]+')

def load():
    T = json.loads((ROOT / 'data/tangut.json').read_text())
    W = json.loads((ROOT / 'data/wenhai.json').read_text())
    R = json.loads((ROOT / 'data/rhymes.json').read_text())
    P = json.loads((ROOT / 'data/pairs.json').read_text())
    return T, W, R, P

# ---- initials (columns of the rhyme tables) --------------------------------------------------
# key -> (九音 class, series, manner).  Series groups 清 / 次清 / 濁 of one place of articulation.
INIT = {
  'p': ('I', 'P', 'vl'), 'ph': ('I', 'P', 'asp'), 'b': ('I', 'P', 'vd'), 'm': ('I', 'M', 'nas'),
  'v': ('II', 'V', 'son'),
  't': ('III', 'T', 'vl'), 'th': ('III', 'T', 'asp'), 'd': ('III', 'T', 'vd'), 'n': ('III', 'N', 'nas'),
  'nr': ('IV', 'NR', 'nas'),
  'k': ('V', 'K', 'vl'), 'kh': ('V', 'K', 'asp'), 'g': ('V', 'K', 'vd'), 'ng': ('V', 'NG', 'nas'),
  'ts': ('VI', 'TS', 'vl'), 'tsh': ('VI', 'TS', 'asp'), 'dz': ('VI', 'TS', 'vd'), 's': ('VI', 'S', 'fric'),
  'ch': ('VII', 'CH', 'vl'), 'chh': ('VII', 'CH', 'asp'), 'j': ('VII', 'CH', 'vd'), 'sh': ('VII', 'SH', 'fric'),
  'O': ('VIII', 'O', 'zero'), 'h': ('VIII', 'H', 'fric'), 'gh': ('VIII', 'H', 'vd'),
  'l': ('IX', 'L', 'son'), 'lh': ('IX', 'L', 'vl'), 'r': ('IX', 'R', 'son'), 'z': ('IX', 'Z', 'vd'), 'zh': ('IX', 'ZH', 'vd'),
}

def init_rel(a, b):
    """(weight, label) for two initials, or None.  Only the two types in Gong (1988, §2):
    A. voiced ~ voiceless aspirated (b ~ pʰ, l ~ lʰ, ɣ ~ x), B. unaspirated ~ aspirated voiceless (p ~ pʰ)."""
    if a == b: return 1.0, ''
    A, B = INIT.get(a), INIT.get(b)
    if not A or not B or A[1] != B[1]: return None
    ma = {A[2], B[2]}
    if ma == {'vd', 'asp'}: return 0.75, 'voiced ~ aspirated'
    if ma == {'son', 'vl'}: return 0.75, 'voiced ~ voiceless'          # l ~ lʰ
    if ma == {'fric', 'vd'}: return 0.75, 'voiced ~ voiceless'         # x ~ ɣ
    if ma == {'vl', 'asp'}: return 0.75, 'aspiration'
    return None

# ---- finals: 攝, cycle (lax / tense / rhotic), row ----------------------------------------
SHE_VOWEL = {0: 'u', 1: 'i', 2: 'ĩ', 3: 'a', 4: 'ã', 5: 'ɨ', 6: 'ij', 7: 'ɨj', 8: 'iw', 9: 'o', 10: 'ow', 11: '·'}
CYCLE = ['lax', 'tense', 'rhotic']

def rhyme_places(R):
    """rhyme no. -> list of (she index, row index, cycle index, long?)"""
    pos = collections.defaultdict(list)
    for si, s in enumerate(R['she']):
        for ri, row in enumerate(s['rows']):
            for ci, c in enumerate(row['cells']):
                if c: pos[c['r']].append((si, ri, ci, bool(row['shade'])))
    return pos

GRADE = {'I': 1, 'II': 2, 'III': 3, 'IV': 4}

def strip_marks(s):
    return unicodedata.normalize('NFC', ''.join(ch for ch in unicodedata.normalize('NFD', s)
                                                 if unicodedata.category(ch) != 'Mn'))

# ---- characters -----------------------------------------------------------------------------
def characters(T, W, R):
    """One record per character placed in the rhyme tables (Wenhai and non-Wenhai)."""
    pos = rhyme_places(R)
    C = {}
    for gid, g in W['groups'].items():
        for m in g['m']:
            c = m['c']
            if c in C: continue
            pl = pos.get(g['mrhyme'])
            if not pl: continue
            if len(pl) > 1:   # rhymes split over two rows (-io/-jo etc.): pick by the GHC medial
                pl = [pl[1]] if ('j' in m['ghc'] and g['deng'] == 3) else [pl[0]]
            si, ri, ci, long_ = pl[0]
            code = T['ch'].get(c, [''])[0]
            C[c] = dict(c=c, col=g['col'], rh=g['mrhyme'], tone=1 if g['sec'] in (1, 3) else 2,
                        w=g['sec'] in (3, 4), deng=g['deng'], she=si, row=ri, cyc=ci, long=long_,
                        ghc=m['ghc'], mb=m['mb'], miy=m['miyake'], en=m['en'], zh=m['zh'], pos=m['pos'],
                        lfw=m['lfw'], code=code, xiao=gid)
    return C

# ---- phonetic relation (Gong Hwang-cherng's alternations) ----------------------------------------
# Cross-攝 vowel alternations: those in Gong (1988, tools/gong1988.json) and in the verb stem pairs
# (data/pairs.json); no others.  ABL: 攝 pair -> sources; ATT: the exact rhyme
# pairs attested in either, which weigh more than the same change between other rhymes of the two 攝.
def she_alternations(P, C, R):
    pos = rhyme_places(R)
    she = {r: pl[0][0] for r, pl in pos.items()}
    ABL, ATT = collections.defaultdict(set), set()
    def add(ra, rb, src):
        if ra == rb or ra not in she or rb not in she: return
        if she[ra] != she[rb]:
            ABL[tuple(sorted((she[ra], she[rb])))].add(src)
            ATT.add(frozenset((ra, rb)))
    G = json.loads((ROOT / 'tools/gong1988.json').read_text())
    for e in G['examples']:
        for ra, rb in itertools.combinations(sorted(set(e['r'])), 2): add(ra, rb, 'Gong 1988')
    for g in P['patterns']:
        for p in g['pairs']:
            a, b = C.get(p['a']), C.get(p['b'])
            if a and b: add(a['rh'], b['rh'], 'stem pairs')
    return ABL, ATT

def final_rel(a, b, ALT):
    """(weight, [labels]) for the finals of two characters, or None."""
    labs, wgt = [], 1.0
    if a['she'] == b['she']:
        if a['rh'] == b['rh']:
            pass
        else:
            if a['cyc'] != b['cyc']:
                labs.append(f"{CYCLE[a['cyc']]} ~ {CYCLE[b['cyc']]}" if a['cyc'] < b['cyc'] else f"{CYCLE[b['cyc']]} ~ {CYCLE[a['cyc']]}")
                wgt *= 0.8
            if a['long'] != b['long']:
                labs.append('short ~ long'); wgt *= 0.85
            if a['deng'] != b['deng'] or (a['cyc'] == b['cyc'] and a['long'] == b['long']):
                labs.append('grade'); wgt *= 0.85
    else:
        ABL, ATT = ALT
        k = tuple(sorted((a['she'], b['she'])))
        if k in ABL:
            if frozenset((a['rh'], b['rh'])) in ATT:
                lo, hi = sorted((a['rh'], b['rh']))
                labs.append(f"-{SHE_VOWEL[k[0]]} ~ -{SHE_VOWEL[k[1]]} (R.{lo} ~ R.{hi})"); wgt *= 0.8
            else:
                labs.append(f"-{SHE_VOWEL[k[0]]} ~ -{SHE_VOWEL[k[1]]}"); wgt *= 0.65
        else:
            return None
        if a['cyc'] != b['cyc']:
            labs.append('cycle'); wgt *= 0.8
    return wgt, labs

def phon_rel(a, b, ALT):
    ir = init_rel(a['col'], b['col'])
    if not ir: return None
    fr = final_rel(a, b, ALT)
    if not fr: return None
    w = ir[0] * fr[0]
    labs = ([ir[1]] if ir[1] else []) + fr[1]
    if a['tone'] != b['tone']: labs.append('tone'); w *= 0.95
    if a['w'] != b['w']: labs.append('-w-'); w *= 0.85
    if not labs: labs = ['homophone']
    return round(w, 3), labs

# ---- graphic relation (Downes's radical codes) -----------------------------------------------------
def code_features(code):
    """Pieces of a code: every run of 2+ radicals inside one block (a block = a hyphen-separated part,
    the whole block included), and each single radical (weighted down in Graphic)."""
    blocks = [p for p in code.split('-') if p] if code else []
    feats = set()
    for b in blocks:
        s = SYL.findall(b)
        for n in range(2, len(s) + 1):
            for i in range(len(s) - n + 1):
                feats.add(('R', ''.join(s[i:i + n])))
        for x in s: feats.add(('1', x))
    return blocks, feats

class Graphic:
    def __init__(self, C):
        self.F = {c: code_features(x['code']) for c, x in C.items()}
        df = collections.Counter()
        for _, f in self.F.values(): df.update(f)
        n = len(C)
        self.idf = {k: math.log(n / v) * (0.3 if k[0] == '1' else 1.0) for k, v in df.items()}
        self.tot = {c: sum(self.idf[k] for k in f) for c, (_, f) in self.F.items()}

    def rel(self, a, b):
        fa, fb = self.F[a][1], self.F[b][1]
        sh = fa & fb
        if not sh: return 0.0, []
        s = sum(self.idf[k] for k in sh)
        m = min(self.tot[a], self.tot[b]) or 1
        # report the maximal shared pieces only (drop runs contained in a reported block/run)
        pieces = sorted({k[1] for k in sh if k[0] == 'R'}, key=lambda x: -len(x))
        keep = []
        for p in pieces:
            if not any(p in q for q in keep): keep.append(p)
        return round(min(1.0, s / m), 3), keep

# ---- meaning relation ------------------------------------------------------------------------------------
# Meaning is judged by levels of evidence, not by one similarity score:
#   strong  the same English sense; a WordNet synonym (with embeddings ≥ 0.35); the same Chinese word; a
#           synonym compound (AB is a dictionary word meaning what A or B means, the other being close).
#           A single shared Chinese character needs English embeddings ≥ 0.3. Compounds that are names, and
#           Chinese glosses of the type 虫名 'name of an insect', are not used.
#   medium  a WordNet broader/narrower term, or English embeddings ≥ 0.7 where WordNet does not know both
#           words, which count only when something else agrees: the Chinese glosses (embeddings ≥ 0.75 or a
#           shared content character), A and B forming a compound, parallel compounds (AX and BX are words with
#           the same meaning), or two or more shared compound partners
#   weak    embeddings alone: never a link, they only add to the score
# Polysemy: a match on a later sense (after ';') counts 0.85, and a gloss of n > 2 senses counts √(2/n).
TRANS = re.compile(r'(also )?(used to )?transcribes? [^;]*|(also )?used (in|for) transcription[^;/]*|\bsurname\b|\bphonetic\b|\bfor transcription\b|\bplace ?name\b', re.I)
BAD = {'?', 'unknown', 'meaning unknown', 'unclear', 'name', ''}

def senses_en(en):
    """[(rank, sense)]: rank = index of the ';'-separated sense; '/' separates near-synonyms of one sense."""
    en = re.sub(r'\[[ᴀʙ]\]', '', en or '')
    en = re.sub(r'[₀-₉]', '', en)
    out, rank = [], 0
    for grp in en.split(';'):
        got = False
        for part in grp.split('/'):
            part = TRANS.sub('', part)
            part = re.sub(r'\([^)]*\)', '', part).strip(' ,.').lower()
            part = re.sub(r'^(a|an|the|to) ', '', part)
            if re.match(r'^((a )?kind of|name of|a sort of|type of) ', part): continue   # species: only the class is known
            if part not in BAD: out.append((rank, part)); got = True
        if got: rank += 1
    return out

ZSTOP = set('的之者所也其而以于与及等名某种类用语词一个人物是为有不')

def senses_zh(zh, seg):
    """(words, content characters, number of senses) of a Chinese gloss; transcriptions 【…】 left out."""
    zh = re.sub(r'【[^】]*】', '', zh or '')
    zh = re.sub(r'（[^）]*）|\([^)]*\)', '', zh)
    zh = re.sub(r'\d+\.', '', zh)
    zh = re.sub(r'[^\u4e00-\u9fff，,、;；/\s]', '', zh)       # keep Chinese characters and separators only
    parts = [p for p in re.split(r'[，,、;；/\s]+', zh) if p and '名' not in p]   # 虫名, 树名…: species, class only
    words = set()
    for p in parts:
        for w in seg(p):
            if len(w) > 1 and w not in seg.known: words.update(w)    # unknown run of single words (船舟): split
            elif len(w) > 1 or len(p) <= 4: words.add(w)            # single characters only from short items,
                                                                     # not from explanations (也可加在之后)
    words = {w for w in words if w not in ZSTOP}
    chars = {ch for p in parts for ch in p if ch not in ZSTOP and '一' <= ch <= '鿿'}
    return words, chars, max(1, len(parts))

STOP = set('a an the of to in on at for with by from and or be as one oneself someone something sth sb its it his her their up out off into'.split())
NB_DIR = Path('/home/claude/dl')   # ConceptNet Numberbatch 17.06 (en + zh rows), see build_groups.py

class Segmenter:
    def __init__(self):
        import jieba, logging
        jieba.setLogLevel(logging.WARNING)
        self.jieba = jieba; jieba.initialize()
        self.known = {w for w, f in jieba.dt.FREQ.items() if f > 0}
        self.cache = {}
    def __call__(self, s):
        if s not in self.cache: self.cache[s] = self.jieba.lcut(s, HMM=False)
        return self.cache[s]

NAME = re.compile(r'\bname\b|transcri|surname|courtesy|reign|title|place|county|prefecture|mountain|river|sutra|dhāraṇī|mantra', re.I)

class Compounds:
    """Evidence from the words (two characters) of the Tangut Character Dictionary v2.2."""
    def __init__(self, T):
        self.word = {}                                   # frozenset(A, B) -> (word, en, zh)
        self.part = collections.defaultdict(dict)        # A -> {(position, X): (word, en, zh)}
        for w, (g, x, en, zh) in T['w'].items():
            if len(w) != 2 or w[0] == w[1]: continue
            if NAME.search(en or '') or re.search(r'[A-Z]', re.sub(r'\([^)]*\)', '', en or '')): continue   # names
            a, b = w
            self.word.setdefault(frozenset((a, b)), (w, en, zh))
            self.part[a][(0, b)] = (w, en, zh); self.part[b][(1, a)] = (w, en, zh)

class Meaning:
    def __init__(self, C, T, nb_dir=NB_DIR):
        import numpy as np
        from nltk.corpus import wordnet as wn
        self.np, self.wn = np, wn
        self.seg = Segmenter()
        self.K = Compounds(T)
        self.S = {c: senses_en(x['en']) for c, x in C.items()}
        self.NS = {c: max([r for r, _ in v], default=-1) + 1 for c, v in self.S.items()}
        self.Z = {c: senses_zh(x['zh'], self.seg) for c, x in C.items()}
        self.gl = {c: (x['en'], x['zh']) for c, x in C.items()}
        en_terms = {s for v in self.S.values() for _, s in v}
        for (w, en, zh) in self.K.word.values():
            en_terms.update(s for _, s in senses_en(en))
        zh_terms = {w for v in self.Z.values() for w in v[0]}
        self.vec = {}
        for lang, terms in (('en', en_terms), ('zh', zh_terms)):
            words = (nb_dir / f'nb_{lang}.txt').read_text().split('\n')
            M = np.load(nb_dir / f'nb_{lang}.npy', mmap_mode='r')
            idx = {w: i for i, w in enumerate(words)}
            def look(t):
                i = idx.get(t)
                return None if i is None else np.asarray(M[i], dtype=np.float32)
            for s in terms:
                v = look(s.replace(' ', '_'))
                if v is None and lang == 'en':
                    ws = [w for w in re.findall(r"[a-z]+", s) if w not in STOP] or re.findall(r"[a-z]+", s)
                    vs = [x for x in (look(w) for w in ws) if x is not None]
                    v = np.mean(vs, axis=0) if vs else None
                if v is not None:
                    n = np.linalg.norm(v)
                    if n: self.vec[(lang, s)] = v / n
        self.syn, self.near = {}, {}
        for s in en_terms:
            t = re.sub(r'^be ', '', s).replace(' ', '_')
            ss = wn.synsets(t)[:3]
            if ss:
                self.syn[s] = set(ss)
                nr = set()
                for x in ss: nr |= set(x.hypernyms()) | set(x.hyponyms()) | set(x.similar_tos()) | set(x.verb_groups())
                self.near[s] = nr
        self.cache = {}

    def cos(self, lang, s, t):
        if s == t: return 1.0
        a, b = self.vec.get((lang, s)), self.vec.get((lang, t))
        return float(a @ b) if a is not None and b is not None else 0.0

    def en_pair(self, s, t):
        """(base, kind) for two English senses."""
        if s == t: return 1.0, 'same sense'
        k = (s, t) if s < t else (t, s)
        if k not in self.cache:
            r = (0.0, '')
            c = self.cos('en', s, t)
            # a WordNet relation through a rare sense (firm ~ house, vary ~ depart) is checked against the embeddings
            if s in self.syn and t in self.syn and c >= 0.35:
                if self.syn[s] & self.syn[t]: r = (0.95, 'WordNet synonym')
                elif (self.near[s] & self.syn[t]) or (self.near[t] & self.syn[s]): r = (0.8, 'WordNet broader/narrower')
            # embeddings stand in only where WordNet cannot judge: if it knows both words and finds them
            # neither synonyms nor broader/narrower (e.g. two ~ five, east ~ west), they are left at that
            known = s in self.syn and t in self.syn
            if not r[1]: r = (c, 'embeddings' if not known else 'embeddings (WordNet: unrelated)')
            self.cache[k] = (r[0], r[1], c)
        return self.cache[k][:2]

    def same_meaning(self, g1, g2):
        """Two compound glosses (en, zh) with the same meaning?"""
        s1, s2 = senses_en(g1[0]), senses_en(g2[0])
        for _, s in s1:
            for _, t in s2:
                if s == t or self.cos('en', s, t) >= 0.8: return True
        z1 = re.sub(r'[^一-鿿]', '', g1[1] or ''); z2 = re.sub(r'[^一-鿿]', '', g2[1] or '')
        return bool(z1) and z1 == z2

    def compound(self, a, b):
        """(kind, evidence, strong?) from the dictionary's words, or None."""
        w = self.K.word.get(frozenset((a, b)))
        if w:
            sa, sb, sw = senses_en(self.gl[a][0]), senses_en(self.gl[b][0]), senses_en(w[1])
            def same(x): return any(s == t or self.en_pair(s, t)[1] == 'WordNet synonym' for _, s in x for _, t in sw)
            def close(x): return any(s == t or self.cos('en', s, t) >= 0.6 for _, s in x for _, t in sw)
            if sw and ((same(sa) and close(sb)) or (same(sb) and close(sa))):
                return 'synonym compound', f'{w[0]} {w[1]}', True
            return 'compound', f'{w[0]} {w[1]}', False
        Pa, Pb = self.K.part.get(a, {}), self.K.part.get(b, {})
        shared = [k for k in Pa.keys() & Pb.keys() if k[1] not in (a, b)]
        for k in shared:
            wa, wb = Pa[k], Pb[k]
            if self.same_meaning(wa[1:], wb[1:]):
                # corroboration only: parallel compounds also join co-hyponyms (fourth ~ seventh child)
                return 'parallel compounds', f'{wa[0]} = {wb[0]} {wa[1]}', False
        if len(shared) >= 2:
            return 'shared compound partners', ' '.join(sorted(Pa[k][0] for k in shared)[:3]), False
        return None

    def rel(self, a, b):
        """dict(m: score 0–1, kind, ev: evidence text, ok: is a meaning link, e: best embedding)"""
        pa = 1.0 if self.NS[a] <= 2 else math.sqrt(2 / self.NS[a])
        pb = 1.0 if self.NS[b] <= 2 else math.sqrt(2 / self.NS[b])
        best = dict(m=0.0, kind='', ev='', ok=False, e=0.0)
        med = None
        for ra, s in self.S[a]:
            for rb, t in self.S[b]:
                base, kind = self.en_pair(s, t)
                f = (1.0 if ra == 0 else 0.85) * (1.0 if rb == 0 else 0.85) * pa * pb
                emb = self.cache.get((s, t) if s < t else (t, s), (0, 0, 1.0 if s == t else 0))[2]
                best['e'] = max(best['e'], emb)
                ev = s if s == t else f'{s} ~ {t}'
                if kind in ('same sense', 'WordNet synonym'):
                    if base * f > best['m'] or not best['ok']:
                        if not best['ok'] or base * f > best['m']: best.update(m=base * f, kind=kind, ev=ev, ok=True)
                elif kind == 'WordNet broader/narrower' or (kind == 'embeddings' and base >= 0.7):
                    if not med or base * f > med[0]: med = (base * f, kind, ev)
        # Chinese
        (wa, ca, na), (wb, cb, nb) = self.Z[a], self.Z[b]
        fz = (1.0 if na <= 2 else math.sqrt(2 / na)) * (1.0 if nb <= 2 else math.sqrt(2 / nb))
        shared = wa & wb
        # one shared character is a weaker match (易 'easy' and 'change'): it needs some English support
        if shared and all(len(w) == 1 for w in shared) and best['e'] < 0.3: shared = set()
        zcos = max((self.cos('zh', x, y) for x in wa for y in wb), default=0.0)
        if shared and 0.95 * fz > (best['m'] if best['ok'] else 0):
            best.update(m=0.95 * fz, kind='same Chinese word', ev='中 ' + '、'.join(sorted(shared)[:3]), ok=True)
        zagree = zcos >= 0.75 or bool(ca & cb)
        # compounds
        cp = self.compound(a, b)
        if cp and cp[2] and 0.9 > (best['m'] if best['ok'] else 0):
            best.update(m=0.9, kind=cp[0], ev=cp[1], ok=True)
        if med and not best['ok']:
            if zagree or cp:
                why = 'Chinese agrees' if zagree else cp[0]
                best.update(m=med[0], kind=f'{med[1]} + {why}', ev=med[2], ok=True)
        if not best['ok']:
            # weak: embeddings only, never a link; keep the best as a score
            best['m'] = round(0.6 * max(best['e'], zcos), 3)
            best['kind'] = 'embeddings only' if best['m'] else ''
            if cp: best['kind'] = (best['kind'] + ' · ' if best['kind'] else '') + cp[0]; best['ev'] = cp[1]
        elif cp and not cp[2] and cp[0] not in best['kind']:
            best['kind'] += ' · ' + cp[0]
        best['m'] = round(min(best['m'], 1.0), 3); best['e'] = round(best['e'], 3)
        return best
