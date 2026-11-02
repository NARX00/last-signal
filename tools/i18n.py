#!/usr/bin/env python3
"""Translation files: extract what needs translating, and report what's missing.

    python tools/i18n.py extract ru     add every new English string to i18n/ru/ (existing translations are kept)
    python tools/i18n.py check ru       list strings that still have no translation

i18n/<lang>/data/<file>.json   the same shape as data/<file>.json, holding only the texts
i18n/<lang>/ui.json            "html": whole paragraphs from src/body.html (inline tags kept)
                               "text": exact strings (screen labels, messages)
                               "patterns": messages with values in them; {0}, {1} mark the values.
                                 Russian plurals: {0|строка|строки|строк} picks the form for the number in {0}.
                               "fragments": pieces of sentences the code glues together; replaced inside
                                 longer texts when nothing above matched
An empty string means "not translated yet": the game shows the English text.
null means "not on-screen text" (key names, CSS classes): never translated, never reported.
"""
import glob
import html
import html.parser
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DATA = {'telemetry', 'sprites', 'enemies'}
ID_LIKE = re.compile(r'^(?:[a-z0-9_\-]+|#[0-9a-fA-F]{3,8}|[0-9A-F]{16})$')
INLINE = {'b', 'i', 'em', 'strong', 'code', 'kbd', 'br', 'a', 'small', 'span'}


def translatable(s):
    return isinstance(s, str) and re.search(r'[A-Za-z]{2}', s) and not ID_LIKE.match(s)


def data_skeleton(v, old):
    """Same shape as v with only translatable strings; keep any translation already in old."""
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            r = data_skeleton(x, (old or {}).get(k) if isinstance(old, dict) else None)
            if r is not None:
                out[k] = r
        return out or None
    if isinstance(v, list):
        out = [data_skeleton(x, old[i] if isinstance(old, list) and i < len(old) else None) for i, x in enumerate(v)]
        return out if any(x is not None for x in out) else None
    if translatable(v):
        return {'en': v, 'ru': old['ru'] if isinstance(old, dict) and old.get('en') == v else ''}
    return None


# ---------- body.html: paragraphs with inline tags become "html" units, plain text becomes "text" ----------
class Tree(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = {'tag': 'root', 'kids': [], 'attrs': {}}
        self.stack = [self.root]
        self.attr_texts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k in ('title', 'aria-label', 'placeholder'):
            if a.get(k) and re.search(r'[A-Za-z]{2}', a[k]):
                self.attr_texts.append(html.unescape(a[k]))
        node = {'tag': tag, 'kids': [], 'attrs': a, 'raw': self.get_starttag_text()}
        self.stack[-1]['kids'].append(node)
        if tag not in ('br', 'img', 'input', 'meta', 'link'):
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]['tag'] == tag:
                del self.stack[i:]
                break

    def handle_data(self, d):
        self.stack[-1]['kids'].append(d)

    def handle_entityref(self, name):
        self.stack[-1]['kids'].append(f'&{name};')

    def handle_charref(self, name):
        self.stack[-1]['kids'].append(f'&#{name};')


def inner(node):
    out = []
    for k in node['kids']:
        if isinstance(k, str):
            out.append(k)
        else:
            out.append(k['raw'] + (inner(k) + f'</{k["tag"]}>' if k['tag'] != 'br' else ''))
    return ''.join(out)


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def html_units(node, html_out, text_out):
    if isinstance(node, str):
        return
    if node['tag'] in ('script', 'style'):
        return
    kids = []
    for k in node['kids']:            # join text split by entities (&amp; etc.)
        if isinstance(k, str) and kids and isinstance(kids[-1], str):
            kids[-1] += k
        else:
            kids.append(k)
    has_text = any(isinstance(k, str) and k.strip() for k in kids)
    elems = [k for k in kids if not isinstance(k, str)]
    if has_text and elems and all(e['tag'] in INLINE and not e['attrs'].get('id') for e in elems):
        h = norm(inner(node))
        if re.search(r'[A-Za-z]{2}', h):
            html_out.append(h)
        return
    for k in kids:
        if isinstance(k, str):
            t = norm(html.unescape(k))
            if re.search(r'[A-Za-z]{2}', t):
                text_out.append(t)
        else:
            html_units(k, html_out, text_out)


# ---------- JS: string literals and template literals ----------
CODEY = re.compile(r'^(?:[#.\[]|data:|https?:|rgba?\(|[0-9.]+(px|s|ms|%)$|\$\{)|(?:px|em|deg)\b.*;|=>|function\b|^[a-z\-]+\s*:\s*[\w#]|^(?:[a-z]+[A-Z]\w*|[a-z]+(?:-[a-z]+)+)$')


def js_strings(src):
    exact, patterns = [], []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i + 1] in '/*':   # comments
            if src[i + 1] == '/':
                j = src.find('\n', i); i = n if j < 0 else j
            else:
                j = src.find('*/', i + 2); i = n if j < 0 else j + 2
            continue
        if c in '\'"':
            j = i + 1
            while j < n and src[j] != c and src[j] != '\n':
                j += 2 if src[j] == '\\' else 1
            s = src[i + 1:j]
            i = j + 1
            s = bytes(s, 'utf-8').decode('unicode_escape', errors='ignore') if '\\' in s else s
            if ui_like(s):
                exact.append(s)
            continue
        if c == '`':
            j, depth, parts, buf = i + 1, 0, [], ''
            vals = 0
            while j < n:
                ch = src[j]
                if ch == '\\':
                    buf += src[j:j + 2]; j += 2; continue
                if ch == '`':
                    break
                if src.startswith('${', j):
                    k, d = j + 2, 1
                    while k < n and d:
                        if src[k] == '{': d += 1
                        elif src[k] == '}': d -= 1
                        k += 1
                    buf += '{%d}' % vals; vals += 1; j = k; continue
                buf += ch; j += 1
            i = j + 1
            if re.search(r'[A-Za-z]{3}', re.sub(r'\{\d+\}', '', buf)) and ui_like(re.sub(r'\{\d+\}', 'X', buf)):
                (patterns if vals else exact).append(buf)
            continue
        i += 1
    return exact, patterns


def ui_like(s):
    t = s.strip()
    if len(t) < 2 or not re.search(r'[A-Za-z]{2}', t):
        return False
    if CODEY.search(t) or ID_LIKE.match(t) or '<' in t and '>' in t:
        return False
    if re.match(r'^[A-Z][A-Za-z]+$', t):          # a single capitalised word: a label
        return True
    return ' ' in t and re.search(r'[A-Za-z]{2,}[,.;:!?]?\s+[A-Za-z(]', t) is not None


def extract(lang):
    base = ROOT / 'i18n' / lang
    (base / 'data').mkdir(parents=True, exist_ok=True)
    for p in sorted((ROOT / 'data').glob('*.json')):
        if p.stem in SKIP_DATA:
            continue
        tp = base / 'data' / p.name
        old = json.loads(tp.read_text(encoding='utf-8')) if tp.exists() else None
        sk = data_skeleton(json.loads(p.read_text(encoding='utf-8')), old)
        if sk:
            tp.write_text(json.dumps(sk, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    t = Tree()
    t.feed((ROOT / 'src' / 'body.html').read_text(encoding='utf-8'))
    hu, tx = [], []
    html_units(t.root, hu, tx)
    tx += t.attr_texts
    ex, pa = [], []
    for f in sorted(glob.glob(str(ROOT / 'src' / 'js' / '*.js'))):
        e, p = js_strings(pathlib.Path(f).read_text(encoding='utf-8'))
        ex += e; pa += p
    up = base / 'ui.json'
    old = json.loads(up.read_text(encoding='utf-8')) if up.exists() else {}
    ui = {'html': {}, 'text': {}, 'patterns': {}, 'fragments': dict(old.get('fragments', {}))}
    for sec, items in (('html', hu), ('text', tx + ex), ('patterns', pa)):
        for s in items:
            s = norm(s) if sec != 'patterns' else s
            if s and s not in ui[sec]:
                ui[sec][s] = old.get(sec, {}).get(s, '')
        for s, v in old.get(sec, {}).items():   # keep hand-added entries
            ui[sec].setdefault(s, v)
    up.write_text(json.dumps(ui, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    counts = {k: len(v) for k, v in ui.items()}
    print(f'i18n/{lang}: ui {counts}')


def missing(lang):
    base = ROOT / 'i18n' / lang
    out = []
    def walk(v, path):
        if isinstance(v, dict) and set(v) == {'en', 'ru'}:
            if v['ru'] == '':
                out.append(f'{path}: {v["en"]}')
        elif isinstance(v, dict):
            for k, x in v.items(): walk(x, f'{path}.{k}')
        elif isinstance(v, list):
            for i, x in enumerate(v): walk(x, f'{path}[{i}]')
    for p in sorted((base / 'data').glob('*.json')):
        walk(json.loads(p.read_text(encoding='utf-8')), p.stem)
    ui = json.loads((base / 'ui.json').read_text(encoding='utf-8'))
    for sec, d in ui.items():
        for k, v in d.items():
            if v == '':
                out.append(f'ui.{sec}: {k}')
    return out


if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('extract', 'check'):
        print(__doc__); sys.exit(2)
    if sys.argv[1] == 'extract':
        extract(sys.argv[2])
    else:
        m = missing(sys.argv[2])
        for x in m[:200]:
            print('missing', x)
        print(f'{len(m)} untranslated')
        sys.exit(1 if m else 0)
