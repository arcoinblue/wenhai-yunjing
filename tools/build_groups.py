"""Build data/groups.json: character groups by (1) phonetic, (2) graphic and (3) meaning similarity.

  python3 tools/build_groups.py [NUMBERBATCH_DIR]

Inputs: data/tangut.json, data/wenhai.json, data/rhymes.json, data/pairs.json, and ConceptNet Numberbatch 17.06
(the en and zh rows, saved as nb_en.npy / nb_en.txt and nb_zh.npy / nb_zh.txt; extract them from
conceptnet-numberbatch-17-06-300.gz, released through gensim-data on GitHub).
Python packages: numpy, nltk (with the WordNet corpus) and jieba.

1. Phonetic (a gate: a pair is only considered when it holds): the initials are the same, or alternate as in
   Gong (1988, §2): voiced ~ voiceless aspirated, or unaspirated ~ aspirated voiceless; the finals are the same
   rhyme, or alternate within one 攝 (grade / medial, short ~ long, or across the three cycles lax ~ tense ~
   rhotic), or alternate between two 攝 as in Gong (1988, tools/gong1988.json) or the verb stem pairs (the exact
   rhyme pair attested weighs more); tone and -w- may differ. Each change lowers the weight.
2. Graphic: Downes's radical codes; shared runs of two or more radicals inside a block (hyphen-separated part),
   single radicals counting 0.3, each weighted by rarity (idf), as a share of the smaller character.
3. Meaning: levels of evidence (see groups_lib.Meaning): the same English sense, a WordNet synonym, the same Chinese
   word (glosses segmented with jieba), a synonym compound or parallel compounds among the dictionary's words; a
   WordNet broader/narrower term or close embeddings (ConceptNet Numberbatch 17.06) only when the Chinese glosses
   or the compounds agree; embeddings alone never make a link. Later senses and long glosses count less.
   Transcription notes and surnames are not senses.

Order (decided): sound is the gate, meaning is required, character raises the score ('smc'). Two other modes
are kept for comparison: all three required ('all'), and sound + character ('sc', which mostly finds
phonetic-component series). Groups are made for each mode by complete linkage on the phonetic gate (every two members of a group must be
phonetically related) over the links that satisfy the mode.
"""
import sys, re, json, collections, itertools
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from groups_lib import *

TG = 0.30                    # threshold: graphic (meaning: the levels of evidence in groups_lib.Meaning)
KEEP_G, KEEP_E = 0.20, 0.50  # links kept for the character view (besides meaning links)
MAXG = 40                    # largest group
DENSITY = 0.5                # share of a merge's new pairs that must be links

# ---- alternation categories (in the order of Gong 1988: initials, medials, finals, tones) -------------------
CATS = [  # key, section, label
    ['voiced ~ aspirated', 'Initials', 'voiced ~ aspirated (b ~ pʰ)'],
    ['voiced ~ voiceless', 'Initials', 'voiced ~ voiceless (l ~ lʰ)'],
    ['aspiration', 'Initials', 'aspiration (p ~ pʰ)'],
    ['grade', 'Medials', 'grade (-i- / -j-)'],
    ['-w-', 'Medials', 'medial -w-'],
    ['short ~ long', 'Finals within one 攝', 'short ~ long'],
    ['lax ~ tense', 'Finals within one 攝', 'lax ~ tense'],
    ['lax ~ rhotic', 'Finals within one 攝', 'lax ~ rhotic'],
    ['tense ~ rhotic', 'Finals within one 攝', 'tense ~ rhotic'],
    ['X', 'Finals between 攝', ''],          # one category per change, e.g. '-i ~ -o'
    ['tone', 'Tones', 'tone only'],
    ['homophone', 'Homophones only', 'homophones'],
]
PRIO = ['X', 'lax ~ tense', 'lax ~ rhotic', 'tense ~ rhotic', 'short ~ long', 'grade',
        'voiced ~ aspirated', 'voiced ~ voiceless', 'aspiration', '-w-', 'tone', 'homophone']

def category(pl):
    """The main change of one link: a change between 攝 first, then within the final, medial, initial, tone."""
    keys = []
    for x in pl:
        if x.startswith('-') and '~' in x: keys.append(('X', re.sub(r' \(R\..*', '', x)))
        elif x in PRIO: keys.append((x, x))
    if not keys: return 'homophone'
    keys.sort(key=lambda k: PRIO.index(k[0]))
    return keys[0][1]

def group_category(inner):
    n = collections.Counter(l['cat'] for l in inner if l['cat'] != 'homophone')
    if not n: return 'homophone'
    pr = lambda c: PRIO.index(c) if c in PRIO else 0
    return sorted(n.items(), key=lambda kv: (-kv[1], pr(kv[0])))[0][0]

def cell(W, x):
    g = W['groups'][x['xiao']]
    return f"{g['chart']}|{g['sec']}-{g['deng']}-{g['col']}"

def main():
    nb = Path(sys.argv[1]) if len(sys.argv) > 1 else NB_DIR
    T, W, R, P = load()
    C = characters(T, W, R)
    ALT = she_alternations(P, C, R)
    ABL = ALT[0]
    by = collections.defaultdict(list)
    for c, x in C.items(): by[INIT[x['col']][1]].append(c)
    cand = {}
    for L in by.values():
        for a, b in itertools.combinations(L, 2):
            r = phon_rel(C[a], C[b], ALT)
            if r: cand[frozenset((a, b))] = (a, b, r)
    G, M = Graphic(C), Meaning(C, T, nb)
    links = []
    for k, (a, b, (pw, pl)) in cand.items():
        g, gp = G.rel(a, b)
        mr = M.rel(a, b)
        if g >= KEEP_G or mr['ok'] or mr['e'] >= KEEP_E or 'compound' in mr['kind']:
            links.append(dict(a=a, b=b, p=pw, pl=pl, g=g, gp=gp, m=mr['m'], mk=mr['kind'], mev=mr['ev'], ok=mr['ok'], cat=category(pl)))
    print('phonetic pairs', len(cand), 'links kept', len(links), 'meaning links', sum(l['ok'] for l in links))
    print(collections.Counter(l['mk'].split(' + ')[0].split(' · ')[0] for l in links if l['ok']))

    def related(x, y): return frozenset((x, y)) in cand
    MODES = {   # sound is the gate for all; the default is sound -> meaning -> character
        'smc': ('sound → meaning → character', lambda l: l['ok'], lambda l: l['p'] * (l['m'] + 0.5 * l['g']) / 1.5),
        'all': ('sound + meaning + character (all required)', lambda l: l['g'] >= TG and l['ok'], lambda l: l['p'] * (l['g'] + l['m']) / 2),
        'sc':  ('sound + character (component series)', lambda l: l['g'] >= TG, lambda l: l['p'] * (l['g'] + 0.25 * l['m'])),
    }
    chars = sorted({x for l in links for x in (l['a'], l['b'])}, key=lambda c: (C[c]['she'], C[c]['rh'], C[c]['col'], c))
    ix = {c: i for i, c in enumerate(chars)}
    links.sort(key=lambda l: (ix[l['a']], ix[l['b']]))
    for i, l in enumerate(links): l['i'] = i
    modes = {}
    for key, (label, ok, score) in MODES.items():
        E = sorted((l for l in links if ok(l)), key=score, reverse=True)
        okp = {frozenset((l['a'], l['b'])) for l in E}
        grp = {}; mem = {}; nid = itertools.count()
        for l in E:
            a, b = l['a'], l['b']
            A, B = grp.get(a), grp.get(b)
            if A is not None and A == B: continue
            ma = mem[A] if A is not None else [a]
            mb = mem[B] if B is not None else [b]
            if len(ma) + len(mb) > MAXG: continue
            if not all(related(x, y) for x in ma for y in mb): continue
            # and at least half of the new pairs must themselves be links of this mode
            if sum(frozenset((x, y)) in okp for x in ma for y in mb) < DENSITY * len(ma) * len(mb): continue
            new = A if A is not None else (B if B is not None else next(nid))
            members = ma + mb
            for x in (A, B):
                if x is not None and x != new: mem.pop(x)
            mem[new] = members
            for x in members: grp[x] = new
        out = []
        for members in mem.values():
            S = set(members)
            inner = [l for l in E if l['a'] in S and l['b'] in S]
            sc = sum(score(l) for l in inner) / len(inner)
            # weakest link: the member least well attached (its best link inside the group)
            wk = min(max(score(l) for l in inner if c in (l['a'], l['b'])) for c in members)
            out.append(dict(m=sorted((ix[c] for c in members)), e=sorted(l['i'] for l in inner), s=round(sc, 3),
                            w=round(wk, 3), cat=group_category(inner), att=any('(R.' in x for l in inner for x in l['pl'])))
        out.sort(key=lambda g: (-len(g['m']), -g['w']))
        modes[key] = dict(label=label, groups=out)
        print(key, len(out), 'groups,', sum(len(g['m']) for g in out), 'characters; largest', [len(g['m']) for g in out[:5]])

    data = dict(
        note='Built by tools/build_groups.py. Phonetic relation after Gong Hwang-cherng; graphic from Downes radical codes; meaning from ConceptNet Numberbatch 17.06.',
        th=dict(g=TG),
        cats=CATS,
        alt=[[f"-{SHE_VOWEL[a]} ~ -{SHE_VOWEL[b]}", sorted(ABL[(a, b)])] for a, b in sorted(ABL)],
        she=[s['label'] for s in R['she']],
        chars=[[c, C[c]['ghc'], C[c]['mb'], C[c]['miy'], C[c]['en'], C[c]['zh'], C[c]['pos'], C[c]['lfw'], C[c]['code'], C[c]['she'], C[c]['rh'], cell(W, C[c])] for c in chars],
        links=[[ix[l['a']], ix[l['b']], l['p'], ' · '.join(l['pl']), l['g'], '|'.join(l['gp']), l['m'], l['mk'], l['mev'], int(l['ok'])] for l in links],
        modes=modes,
    )
    (ROOT / 'data/groups.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print('wrote', (ROOT / 'data/groups.json').stat().st_size, 'bytes')

if __name__ == '__main__':
    main()
