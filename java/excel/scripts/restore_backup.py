"""
Interactive numbered picker for restoring index.html from one of the
backups in bkp/ -- the counterpart to extract_data.py's
splice_into_index_html(), which writes a new timestamped backup there
(and prunes to the newest BACKUPS_TO_KEEP) on every sync/remove/clear run.

Lists up to the newest BACKUPS_TO_KEEP backups, newest first, with their
timestamp and question count, and lets the user pick by number instead of
always restoring "the last one" blindly -- useful when the most recent
run wasn't the bad one (e.g. a bad Remove Sheet followed by an unrelated
Smart Sync would make the newest backup the wrong pick).

Usage:
    python scripts/restore_backup.py

Restoring is a full raw-file copy of the chosen backup over index.html,
not a DATA-only splice -- a backup can predate a code edit to index.html
itself, not just a data sync, so this undoes everything about that run,
not just its data. The CURRENT index.html is itself backed up into bkp/
first (same timestamped, keep-last-5 scheme) before being overwritten --
restoring is itself an undoable action, not a one-way door.
"""

import os
import json
import datetime
import extract_data as ed


def describe(backup_path):
    try:
        with open(backup_path, encoding='utf-8') as f:
            html = f.read()
        m = ed.DATA_ARRAY_RE.search(html)
        count = len(json.loads(m.group(1).replace('<\\/', '</'))) if m else '?'
    except Exception:
        count = '?'
    return count


def main():
    basename = os.path.basename(ed.INDEX_HTML)
    pattern_prefix = basename + '.'
    if not os.path.isdir(ed.BACKUP_DIR):
        print('No bkp/ folder found -- nothing to restore.')
        return

    candidates = sorted(
        f for f in os.listdir(ed.BACKUP_DIR)
        if f.startswith(pattern_prefix) and f.endswith('.bak')
    )
    candidates.reverse()  # newest first

    if not candidates:
        print('No backups found in bkp/ -- nothing to restore.')
        return

    print('Available backups (newest first) -- pick by number:')
    for i, fname in enumerate(candidates, 1):
        timestamp = fname[len(pattern_prefix):-len('.bak')]
        count = describe(os.path.join(ed.BACKUP_DIR, fname))
        print('  %d. %s (%s questions)' % (i, timestamp, count))

    print()
    try:
        raw = input('Enter a number to restore: ').strip()
    except EOFError:
        print()
        print('No input available -- cancelled.')
        return
    except KeyboardInterrupt:
        print()
        print('Cancelled -- nothing changed.')
        return

    if not raw.isdigit() or not (1 <= int(raw) <= len(candidates)):
        print('Invalid selection -- cancelled.')
        return

    target = candidates[int(raw) - 1]
    target_path = os.path.join(ed.BACKUP_DIR, target)

    print()
    print('This will overwrite the current index.html with ' + target + '.')
    print('The current index.html is backed up into bkp/ first, so this is undoable too.')
    try:
        typed = input('Proceed? (Y/N): ').strip().lower()
    except (EOFError, KeyboardInterrupt):
        print()
        print('Cancelled -- nothing was changed.')
        return

    if typed != 'y':
        print('Aborted -- nothing was changed.')
        return

    # Full raw-file copy, NOT a DATA-only splice -- a backup can predate a
    # code edit to index.html itself (not just a data sync), and restoring
    # only the DATA array would silently keep today's shell/JS instead of
    # the backup's. Restoring is meant to undo everything about that run.
    with open(ed.INDEX_HTML, encoding='utf-8') as f:
        current_html = f.read()
    with open(target_path, encoding='utf-8') as f:
        target_html = f.read()

    os.makedirs(ed.BACKUP_DIR, exist_ok=True)
    basename = os.path.basename(ed.INDEX_HTML)
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    backup_path = os.path.join(ed.BACKUP_DIR, basename + '.' + ts + '.bak')
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(current_html)
    ed.prune_old_backups(basename)

    with open(ed.INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(target_html)

    print()
    print('Restored index.html from ' + target + '.')
    print('Previous index.html backed up to ' + backup_path)


if __name__ == '__main__':
    main()
