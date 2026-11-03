#!/usr/bin/env python3
"""Build data/words.json from Hiberna Caroli Raetici's Diederich 'Lodge' edition (CC BY-SA 3.0)
and Diederich frequency totals (DWF.csv, same site). No entries are invented."""
import csv, json, re, sys, unicodedata
US_SPELLING = [('behaviour', 'behavior'), ('coloured', 'colored'), ('colour', 'color'), ('favourite', 'favorite'), ('fulfil', 'fulfill'), ('honourable', 'honorable'), ('neighbour', 'neighbor'), ('pretence', 'pretense')]  # glosses use US English
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/src'
CIRC = str.maketrans('âêîôûÂÊÎÔÛ', 'āēīōūĀĒĪŌŪ')
def mac(s): return s.translate(CIRC).replace('ŷ','ȳ')
def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s.replace('j', 'i').replace('v', 'u')
rows = [r for r in csv.reader(open(f'{SRC}/lodge.txt', encoding='utf-8'), delimiter='\t') if r and r[0] in ('x', 'xx')]
# frequency
freq = {}
with open(f'{SRC}/DWF.csv', encoding='latin-1') as f:
    for line in f:
        p = line.rstrip('\n').split(';')
        if len(p) < 5 or not p[4] or p[0] == 'LATEIN': continue
        try: tot = float(p[4].replace('.', '').replace(',', '.'))
        except ValueError: continue
        for w in re.split(r',\s*', p[0]):
            w = norm(w.strip().lstrip('-'))
            if w and w not in freq: freq[w] = tot
# corrections to obvious source errors, each checked against Lewis & Short
SOURCE_FIX = {'pāscō, -āre, pāvī, pāstum': 'pāscō, -ere, pāvī, pāstum'}   # L&S: pasco, pāvi, pastum, 3
SECT = {'1':'noun','2':'pronoun','3':'verb','4':'adjective','5':'adverb','6':'interjection','7':'conjunction','8':'preposition'}
VERB_INF = re.compile(r'^-?\S*(āre|ēre|ere|īre|ārī|āri|ērī|ēri|ī|īrī|īri|esse|sse|ferre|re|rī)$')
GEN_RE = re.compile(r',\s*(m|f|n|mf|c|m\.\s*f|m\./f)\.?(\s*\(pl\.\))?(\s|$|,|\()')
out = []
for k, r in enumerate(rows):
    struct, d, sect, sub, la, en = r
    la = mac(la.strip()); en = en.strip()
    la = SOURCE_FIX.get(la, la)
    head = re.split(r'[ ,]', la)[0].replace('(','').replace(')','').strip('-')
    parts = [p.strip() for p in re.split(r',\s*', re.sub(r'\(.*?\)', '', la))]
    pos = None
    if len(parts) >= 2 and parts[1].endswith('isse'): pos = 'verb'
    elif re.search(r',\s*(m|f|n|mf|c)\.(\s|$|,)', la): pos = 'noun'
    elif len(parts) >= 2 and re.search(r'(ō|or|um|it|eō|t)$', parts[0]) and VERB_INF.match(parts[1]) and sect in ('1','3','4','5'): pos = 'verb'
    elif len(parts) >= 3 and parts[1] in ('-a','-ra','-era','-tra','-bra','-cra') and parts[2] in ('-um','-rum','-erum','-trum','-brum','-crum'): pos = 'adjective'
    elif len(parts) >= 2 and parts[-1] == '-e' : pos = 'adjective'
    elif len(parts) >= 3 and parts[1] in ('-is','-ris') and parts[2] in ('-e','-re'): pos = 'adjective'
    elif len(parts) == 2 and not re.search(r'\b(m|f|n|mf|c)\.', la) and re.search(r'(is|ius|us)$', parts[1]) and not re.search(r'(isse)$', parts[1]) and sect in ('1','3','4'): pos = 'adjective'
    elif len(parts) == 1 and ' ' not in parts[0] and sect in ('1','3','4'): pos = 'indeclinable'
    elif not sect: pos = 'noun' if 'pūblica' in la else 'conjunction'
    else: pos = SECT.get(sect, 'other')
    fq = freq.get(norm(head))
    if fq is None:
        for alt in re.split(r'\s+or\s+|/', la.split(',')[0]):
            fq = freq.get(norm(alt.strip()))
            if fq: break
    for gb, us in US_SPELLING: en = re.sub(r'\b' + gb + r'\b', us, en)
    out.append(dict(id=k, la=la, en=en, pos=pos, s=int(sect) if sect else None, ss=int(sub) if sub else None,
                    sub=struct=='xx', d=bool(d), f=fq))
ranked = sorted([o for o in out if o['f'] is not None], key=lambda o: (-o['f'], o['id']))
for i, o in enumerate(ranked): o['r'] = i + 1
for o in out: o.setdefault('r', None)
json.dump(out, open('data/words.json', 'w'), ensure_ascii=False, separators=(',', ':'))
import collections
print(len(out), 'entries;', len(ranked), 'with frequency;', collections.Counter(o['pos'] for o in out))
print('unranked sample:', [o['la'][:25] for o in out if o['r'] is None][:40])
