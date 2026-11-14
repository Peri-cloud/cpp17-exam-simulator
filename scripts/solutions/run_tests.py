#!/usr/bin/env python3
"""Compile every QB solution (g++ -std=c++17) and run it against every listed test case.
Prints PASS/FAIL per test and writes a results JSON for the audit report."""
import json, os, subprocess, sys

S = '/home/z/my-project/scripts/solutions'
B = '/tmp/qbtest'
os.makedirs(B, exist_ok=True)

UNITS = ['u1', 'u2', 'u3', 'u4', 'u5']
results = {}
total_tests = 0
total_pass = 0
total_fail = 0
fails = []

for u in UNITS:
    with open(f'{S}/tests_{u}.json') as f:
        tests = json.load(f)
    for pid, cases in tests.items():
        src = f'{S}/{pid}.cpp'
        exe = f'{B}/{pid}'
        r = subprocess.run(['g++', '-std=c++17', '-O2', '-o', exe, src],
                           capture_output=True, text=True)
        entry = {'unit': u.upper(), 'compile': 'OK' if r.returncode == 0 else 'FAIL',
                 'tests': [], 'n_pass': 0, 'n_fail': 0}
        if r.returncode != 0:
            entry['compile_err'] = r.stderr[:500]
            results[pid] = entry
            fails.append((pid, 'COMPILE', '', '', r.stderr[:200]))
            total_fail += len(cases)
            continue
        for idx, (inp, exp, tag) in enumerate(cases, 1):
            total_tests += 1
            try:
                rr = subprocess.run([exe], input=inp, capture_output=True, text=True, timeout=10)
                act = rr.stdout
            except subprocess.TimeoutExpired:
                act = '<TIMEOUT>'
            exp_n = exp.replace('\r\n', '\n').strip('\n')
            act_n = act.replace('\r\n', '\n').strip('\n')
            exact = (act_n == exp_n)
            # normalized: also strip trailing spaces at end of each line
            norm = lambda s: '\n'.join(line.rstrip() for line in s.strip('\n').split('\n'))
            norm_ok = (norm(act_n) == norm(exp_n))
            ok = exact or norm_ok
            status = 'PASS' if ok else 'FAIL'
            if ok:
                entry['n_pass'] += 1
                total_pass += 1
            else:
                entry['n_fail'] += 1
                total_fail += 1
                fails.append((pid, f'test{idx}[{tag}]', exp_n[:120], act_n[:120], ''))
            entry['tests'].append({'idx': idx, 'tag': tag, 'status': status,
                                   'exact': exact, 'normalized': norm_ok,
                                   'input': inp, 'expected': exp_n, 'actual': act_n})
        results[pid] = entry

with open(f'{S}/test_results.json', 'w') as f:
    json.dump(results, f, indent=1)

print(f'TOTAL: {total_tests} tests | PASS {total_pass} | FAIL {total_fail}')
for pid, e in results.items():
    flag = 'OK ' if e['compile'] == 'OK' and e['n_fail'] == 0 else '!!! '
    print(f"{flag}{pid} [{e['unit']}]: compile={e['compile']} pass={e['n_pass']} fail={e['n_fail']}")
if fails:
    print('\n--- FAILURES ---')
    for pid, t, exp, act, err in fails:
        print(f'{pid} {t}\n  expected: {exp!r}\n  actual  : {act!r}\n  err: {err}')
