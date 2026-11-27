"""Shared pieces for building data/groups.json: phonetic, graphic and meaning similarity."""
import json, re, math, collections, unicodedata
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
    """(weight, label) for two initials, or None."""
    if a == b: return 1.0, ''
    A, B = INIT.get(a), INIT.get(b)
    if not A or not B or A[1] != B[1]: return None
    ma = {A[2], B[2]}
    if ma == {'vl', 'asp'}: return 0.75, 'aspiration'
    if ma == {'vl', 'vd'}: return 0.7, 'voicing'
    if ma == {'asp', 'vd'}: return 0.6, 'aspiration + voicing'
    if ma == {'son', 'vl'}: return 0.7, 'voicing'          # l ~ lh
    if ma == {'fric', 'vd'}: return 0.7, 'voicing'         # h ~ gh
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
# Cross-攝 vowel alternations: the ones attested in the verb stem pairs (pairs.json), plus
# oral ~ nasalised vowel (攝 II ~ III, IV ~ V).
def she_alternations(P, C):
    alt = collections.Counter()
    for g in P['patterns']:
        for p in g['pairs']:
            a, b = C.get(p['a']), C.get(p['b'])
            if a and b and a['she'] != b['she']:
                alt[tuple(sorted((a['she'], b['she'])))] += 1
    return alt

NASAL = {(1, 2), (3, 4)}
# Further cross-攝 alternations (e.g. from Gong 1988), as pairs of 攝 indices (0 = 攝 I -u … 11 = 攝 XII):
EXTRA_ALT = set()

def final_rel(a, b, ABL):
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
        k = tuple(sorted((a['she'], b['she'])))
        if k in ABL or k in EXTRA_ALT:
            labs.append(f"-{SHE_VOWEL[k[0]]} ~ -{SHE_VOWEL[k[1]]}"); wgt *= 0.7
        elif k in NASAL:
            labs.append('oral ~ nasal'); wgt *= 0.6
        else:
            return None
        if a['cyc'] != b['cyc']:
            labs.append('cycle'); wgt *= 0.8
    return wgt, labs

def phon_rel(a, b, ABL):
    ir = init_rel(a['col'], b['col'])
    if not ir: return None
    fr = final_rel(a, b, ABL)
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
TRANS = re.compile(r'(also )?(used to )?transcribes? [^;]*|\bsurname\b|\bphonetic\b|\bfor transcription\b|\bplace ?name\b', re.I)

def senses_en(en):
    en = re.sub(r'\[[ᴀʙ]\]', '', en or '')
    en = re.sub(r'[₀-₉]', '', en)
    out = []
    for part in re.split(r'[;/]', en):
        part = TRANS.sub('', part)
        part = re.sub(r'\([^)]*\)', '', part).strip(' ,.').lower()
        part = re.sub(r'^(a|an|the|to) ', '', part)
        part = re.sub(r'^(a )?kind of ', '', part)
        part = re.sub(r'^name of (a |an )?', '', part)
        if part and part not in ('?', 'unknown', 'meaning unknown', 'unclear'): out.append(part)
    return out

def senses_zh(zh):
    zh = re.sub(r'【[^】]*】', '', zh or '')
    zh = re.sub(r'[₀-₉\[\]ᴀʙ]|\d+\.', '', zh)
    return [s.strip() for s in re.split(r'[，,、;；/\s]+', zh) if s.strip() and s.strip() not in ('？', '?')]

STOP = set('a an the of to in on at for with by from and or be as one oneself someone something sth sb its it his her their up out off into'.split())
NB_DIR = Path('/home/claude/dl')   # ConceptNet Numberbatch 17.06 (en + zh rows), see build_groups.py

class Meaning:
    """Meaning similarity from ConceptNet Numberbatch 17.06 word embeddings (Speer et al.), for the
    English glosses and, separately, the Chinese glosses; an identical sense counts 1.0.
    Score = the best cosine over all sense pairs, English or Chinese."""
    def __init__(self, C, nb_dir=NB_DIR):
        import numpy as np
        self.np = np
        self.S = {c: senses_en(x['en']) for c, x in C.items()}
        self.Z = {c: senses_zh(x['zh']) for c, x in C.items()}
        self.vec = {}
        for lang, senses in (('en', {s for v in self.S.values() for s in v}), ('zh', {s for v in self.Z.values() for s in v})):
            words = (nb_dir / f'nb_{lang}.txt').read_text().split('\n')
            M = np.load(nb_dir / f'nb_{lang}.npy', mmap_mode='r')
            idx = {w: i for i, w in enumerate(words)}
            def look(t):
                i = idx.get(t)
                return None if i is None else np.asarray(M[i], dtype=np.float32)
            for s in senses:
                if lang == 'en':
                    v = look(s.replace(' ', '_'))
                    if v is None:
                        ws = [w for w in re.findall(r"[a-z]+", s) if w not in STOP] or re.findall(r"[a-z]+", s)
                        vs = [x for x in (look(w) for w in ws) if x is not None]
                        v = np.mean(vs, axis=0) if vs else None
                else:
                    v = look(s)          # whole Chinese terms only: character averages are too noisy
                if v is not None:
                    n = np.linalg.norm(v)
                    if n: self.vec[(lang, s)] = v / n
        self.cache = {}

    def pair(self, lang, s, t):
        if s == t: return 1.0
        k = (lang, s, t) if s < t else (lang, t, s)
        if k not in self.cache:
            a, b = self.vec.get((lang, s)), self.vec.get((lang, t))
            self.cache[k] = float(a @ b) if a is not None and b is not None else 0.0
        return self.cache[k]

    def rel(self, a, b):
        """(score, how, (sense a, sense b))"""
        best = (0.0, '', ('', ''))
        for lang, X in (('en', self.S), ('zh', self.Z)):
            for s in X[a]:
                for t in X[b]:
                    v = self.pair(lang, s, t)
                    if v > best[0] + 1e-9:
                        best = (round(min(v, 1.0), 3), ('same gloss' if s == t else 'Numberbatch') + (' (中)' if lang == 'zh' else ''), (s, t))
        return best

    def has(self, c):
        return bool(self.S[c] or self.Z[c])
