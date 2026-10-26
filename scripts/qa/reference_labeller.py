"""Reference labeller for real notification formats (Claude QA).
label(sourceApp, title, body) -> expect dict, or None if the format is unknown.
Used to (1) write anonymised real fixtures and (2) cross-check the TS engine over the private corpus.
"""
import re, json, sys, os

CUR = [('JP¥', 'JPY'), ('NZ$', 'NZD'), ('US$', 'USD'), ('S$', 'SGD'), ('A$', 'AUD'), ('RM', 'MYR'), ('MYR', 'MYR'),
       ('IDR', 'IDR'), ('NZD', 'NZD'), ('AUD', 'AUD'), ('SGD', 'SGD'), ('USD', 'USD'), ('JPY', 'JPY'), ('THB', 'THB'), ('EUR', 'EUR'), ('GBP', 'GBP'),
       ('¥', 'JPY'), ('£', 'GBP'), ('€', 'EUR'), ('$', 'USD')]
CUR_RE = '|'.join(re.escape(c) for c, _ in CUR)
AMT = rf'(?P<cur>{CUR_RE})\s?(?P<amt>[\d,]+(?:\.\d{{1,2}})?)'

def money(m):
    cur = dict(CUR)[m.group('cur')]
    v = m.group('amt').replace(',', '')
    whole, _, frac = v.partition('.')
    return int(whole) * 100 + int((frac + '00')[:2]), cur

def out(direction, m=None, cp=None, conf='high'):
    e = {'direction': direction, 'confidence': conf}
    if m is None:
        e['amountMinor'] = None
    else:
        e['amountMinor'], cur = money(m)
        if cur != 'MYR': e['currency'] = cur
    if cp: e['counterparty'] = cp.strip().rstrip('.').strip()
    return e

INFO = {'direction': 'info', 'amountMinor': None, 'confidence': 'none'}

def label(app, t, b):
    import unicodedata
    t = unicodedata.normalize('NFKC', t).strip(); b = unicodedata.normalize('NFKC', b).strip()
    if app == 'com.maybank2u.life':
        if t == 'Maybank2u: Card Transaction':
            m = re.search(rf"You've just spent {AMT} at (?P<cp>.+?) with your", b)
            return out('out', m, m.group('cp')) if m else None
        if t == 'Maybank2u: Transfer':
            m = (re.search(rf"You've transferred {AMT} to (?P<cp>.+?)(?:\s?'s|\.)?\s.*account ending", b)
                 or re.search(rf"Your transfer of {AMT} to (?P<cp>.+?)(?:\s?'s|\.)?\s.*account ending", b)
                 or re.search(rf"You've paid {AMT} to (?:the )?(?P<cp>.+?) account ending", b))
            return out('out', m, m.group('cp')) if m else None
        if t == 'Maybank2u: Scan & Pay':
            m = re.search(rf"(?:Successful payment of|You've transferred) {AMT} to (?P<cp>.+?)(?:\s?\.\s*REF|:)", b)
            if m: return out('out', m, m.group('cp'))
            m = re.search(rf"You have successfully paid {AMT} to (?P<cp>.+?) on \d", b)
            if m: return out('out', m, m.group('cp'))
            m = re.search(rf"You've received {AMT} from (?P<cp>.+?):", b)
            return out('in', m, m.group('cp')) if m else None
        if t == 'Maybank2u: Funds Received':
            m = re.search(rf"You.ve just received {AMT} in your account", b)
            return out('in', m) if m else None
        return INFO  # marketing, approvals, surveys
    if app == 'my.com.tngdigital.ewallet':
        if t == 'Successful Toll Payment':
            m = re.search(rf"{AMT} was deducted .*for toll payment", b)
            return out('out', m, 'Toll') if m else None
        if t.startswith('Transfer Successful'):
            m = re.search(rf"{AMT} has been successfully transferred to (?P<cp>.+)", b)
            return out('out', m, m.group('cp')) if m else None
        if t == 'DuitNow Transfer is successful!':
            m = re.search(rf"You have successfully transferred {AMT} to (?P<cp>.+)", b)
            return out('out', m, m.group('cp')) if m else None
        if t.startswith('You') and 'received money' in t:
            m = re.search(rf"(?P<cp>.+?) has transferred {AMT} to you", b)
            return out('in', m, m.group('cp')) if m else None
        if t.startswith('Parking Payment Successful'):
            m = re.search(rf"{AMT} paid for (?P<cp>Parking.*)", b)
            return out('out', m, m.group('cp')) if m else None
        if t.startswith('DuitNow Payment to '):
            m = re.search(rf"{AMT} has been deducted from your TNG e-?wallet", b, re.I)
            return out('out', m, t[len('DuitNow Payment to '):]) if m else None
        if t.startswith('Payment To:'):
            m = re.search(rf"{AMT} has been deducted from your TNG e-?wallet", b, re.I)
            return out('out', m, t.split(':', 1)[1]) if m else None
        m = re.search(rf"You have paid {AMT} (?:to|at|for) (?P<cp>.+)", b)
        if m: return out('out', m, m.group('cp'))
        return INFO  # points, promos
    if app == 'com.google.android.apps.walletnfcrel':
        if b.startswith('DECLINED'): return INFO
        m = re.search(rf"^-{AMT} was refunded", b)
        if m: return out('in', m, t)
        m = re.search(rf"^{AMT} with ", b)
        if m: return out('out', m, t)
        return INFO  # "Preparing your receipt"
    if app == 'my.com.hsbc.hsbcmalaysia':
        m = re.search(rf"{AMT} was charged to your (?:supp )?credit card ending \d+ at (?P<cp>.+?) on \d", b)
        if m: return out('out', m, m.group('cp'))
        m = re.search(rf"You've received {AMT} in your A/C", b)
        if m: return out('in', m)
        return INFO
    return None

if __name__ == '__main__':
    D = os.path.dirname(os.path.abspath(__file__))
    samples = json.load(open(f'{D}/samples.json'))
    by = {}
    unl = 0
    for i, s in enumerate(samples):
        e = label(s['sourceApp'], s['title'], s['body'])
        if e is None: unl += 1; print('UNLABELLED', s, file=sys.stderr); continue
        name = f"real {s['sourceApp'].split('.')[-1]} #{i}: {s['title'][:40] or s['body'][:40]}"
        by.setdefault(s['sourceApp'], []).append({'name': name, 'platform': 'android', 'sourceApp': s['sourceApp'],
            'title': s['title'], 'body': s['body'], 'real': True, 'expect': e})
    os.makedirs(f'{D}/fixtures-real', exist_ok=True)
    short = {'com.maybank2u.life': 'maybank2u', 'my.com.tngdigital.ewallet': 'touchngo',
             'com.google.android.apps.walletnfcrel': 'google-wallet', 'my.com.hsbc.hsbcmalaysia': 'hsbc'}
    for app, fx in by.items():
        json.dump(fx, open(f"{D}/fixtures-real/{short.get(app, app)}.json", 'w'), indent=2, ensure_ascii=False)
        print(short.get(app, app), len(fx), 'fixtures', sum(1 for f in fx if f['expect']['direction'] != 'info'), 'money')
    # private corpus coverage of the labeller itself
    corpus = [json.loads(l) for l in open(f'{D}/corpus.jsonl')]
    miss = [c for c in corpus if label(c['sourceApp'], c['title'], c['body']) is None]
    print('corpus', len(corpus), 'labelled', len(corpus) - len(miss), 'unlabelled', len(miss), 'samples unlabelled', unl)
    for c in miss[:15]: print('  MISS', c['sourceApp'], '|', c['title'][:40], '|', c['body'][:90])
