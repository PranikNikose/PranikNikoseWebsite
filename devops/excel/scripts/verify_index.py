"""
Runs the standard post-change verification checks documented in
docs/RULES.md section 11 / docs/SYNC_EXCEL.md section 5, without needing
Claude to do it by hand each time:

  1. Both <script> blocks in index.html parse as valid JS (via `node --check`).
  2. Every getElementById('...') call has a matching id="..." in the HTML.
  3. A data sanity pass on the live DATA array: total count, per-sheet
     counts, confirms at least one rich-text sample and one multi-phrasing
     (questionParts) sample exist. (HR is a normal sheet now -- the user
     explicitly asked for it to be included, see docs/RULES.md section 3 --
     so no special HR=0 check is enforced here.)

Read-only -- never modifies index.html. Requires `node` on PATH (only for
the syntax check; the rest is pure Python).

Usage:
    python scripts/verify_index.py            (full detail, always)
    python scripts/verify_index.py --quiet     (one-line summary if
                                                 everything passes; full
                                                 detail is still printed
                                                 if anything fails)
"""

import os
import re
import json
import subprocess
import sys
import tempfile

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(PROJECT_ROOT, 'index.html')

QUIET = '--quiet' in sys.argv or '-q' in sys.argv
_buffer = []


def log(msg=''):
    if QUIET:
        _buffer.append(msg)
    else:
        print(msg)


def fail(msg):
    log('FAIL: ' + msg)
    return False


def flush_buffer():
    for line in _buffer:
        print(line)


def main():
    if not os.path.exists(INDEX_HTML):
        print('FAIL: index.html not found at ' + INDEX_HTML)
        sys.exit(1)

    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html = f.read()

    ok = True
    summary = {}

    # 1. JS syntax check on both <script> blocks
    log('--- 1. JS syntax check ---')
    script_blocks = re.findall(r'<script>([\s\S]*?)</script>', html)
    if len(script_blocks) < 2:
        ok = fail('expected at least 2 inline <script> blocks, found ' + str(len(script_blocks)))
    for i, block in enumerate(script_blocks):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
            tf.write(block)
            tmp_path = tf.name
        try:
            result = subprocess.run(['node', '--check', tmp_path], capture_output=True, text=True)
            if result.returncode == 0:
                log('  script block ' + str(i) + ': OK (' + str(len(block)) + ' chars)')
            else:
                ok = fail('script block ' + str(i) + ' failed to parse:\n' + result.stderr)
        except FileNotFoundError:
            ok = fail("'node' not found on PATH -- install Node.js to run the syntax check")
            break
        finally:
            os.unlink(tmp_path)
    summary['syntax'] = 'OK' if ok else 'FAIL'

    # 2. getElementById <-> id= cross-check
    log()
    log('--- 2. getElementById / id= cross-check ---')
    used_ids = re.findall(r"getElementById\('([^']+)'\)", html)
    defined_ids = set(re.findall(r'id="([^"]+)"', html))
    missing = sorted(set(used_ids) - defined_ids)
    log('  used ids: ' + str(len(used_ids)) + ', unique defined ids: ' + str(len(defined_ids)))
    ids_ok = not missing
    if missing:
        ok = fail('getElementById references with no matching id=: ' + ', '.join(missing))
    else:
        log('  OK -- every getElementById has a matching id=')
    summary['ids'] = str(len(used_ids)) + '/' + str(len(defined_ids))

    # 3. Data sanity pass
    log()
    log('--- 3. Data sanity check ---')
    m = re.search(r'var DATA = (\[[\s\S]*?\]);\s*\n\s*var allQuestions', html)
    if not m:
        ok = fail("couldn't locate 'var DATA = [ ... ];' in index.html")
    else:
        # Use node to eval the array literal (it may contain JS-specific
        # syntax like unescaped unicode) rather than trying to parse it as
        # strict JSON in Python.
        node_script = (
            'var DATA = ' + m.group(1) + ';\n'
            'process.stdout.write(JSON.stringify(DATA));\n'
        )
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
            tf.write(node_script)
            tmp_path = tf.name
        try:
            result = subprocess.run(['node', tmp_path], capture_output=True, text=True)
            if result.returncode != 0:
                ok = fail('failed to evaluate DATA array via node:\n' + result.stderr)
            else:
                data = json.loads(result.stdout)
                log('  total questions: ' + str(len(data)))
                by_sheet = {}
                for q in data:
                    by_sheet[q.get('sheet', '?')] = by_sheet.get(q.get('sheet', '?'), 0) + 1
                for sheet, count in sorted(by_sheet.items()):
                    log('    ' + sheet + ': ' + str(count))
                summary['total'] = len(data)
                summary['sheets'] = len(by_sheet)

                rich = next((q for q in data if '<strong>' in (q.get('answer') or '') or '<em>' in (q.get('answer') or '')), None)
                if rich:
                    log('  OK -- found a rich-text sample (bold/italic in answer)')
                else:
                    log('  NOTE: no rich-text sample found (not necessarily an error)')

                multi = next((q for q in data if len(q.get('questionParts') or []) > 1), None)
                if multi:
                    log('  OK -- found a multi-phrasing sample (questionParts > 1)')
                else:
                    log('  NOTE: no multi-phrasing sample found (not necessarily an error)')
        finally:
            os.unlink(tmp_path)

    log()
    if ok:
        log('ALL CHECKS PASSED.')
    else:
        log('ONE OR MORE CHECKS FAILED -- see FAIL lines above.')

    if QUIET:
        if ok:
            print('Verify: OK -- syntax OK, ids ' + summary.get('ids', '?') + ', ' +
                  str(summary.get('total', '?')) + ' questions across ' +
                  str(summary.get('sheets', '?')) + ' sheet(s).')
        else:
            flush_buffer()

    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
