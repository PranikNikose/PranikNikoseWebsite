"""
Interactive numbered picker for removing one currently-synced sheet from
index.html's DATA -- the counterpart to add_sheets_menu.py. Use this to
temporarily drop a sheet (e.g. "remove HR") without touching the Excel
workbook itself; add_sheets_menu.py brings it back later exactly as it
was, re-extracted fresh from Excel.

Lists every sheet currently IN DATA with its row count, numbered, and
lets the user pick by number -- so a typo just picks nothing instead of
silently matching the wrong sheet name. Confirms with a plain y/N prompt
before writing (the numbered pick already rules out fat-finger sheet
selection, so a typed phrase isn't needed on top of it). Only removes
whole sheets; use smart_sync.py if you want row-level removal (rows
deleted from Excel itself).

Usage:
    python scripts/remove_sheet.py

Backs up the current index.html to index.html.bak first (via
splice_into_index_html) -- to undo, copy that file back over index.html
before running anything else (a later script run will overwrite
index.html.bak with ITS OWN backup, so don't wait).
"""

import extract_data as ed


def main():
    current = ed.read_current_data()
    if not current:
        print('index.html has 0 questions -- nothing to remove.')
        return

    counts = {}
    for q in current:
        counts[q['sheet']] = counts.get(q['sheet'], 0) + 1
    sheets_present = sorted(counts)

    print('Currently synced -- pick by number:')
    for i, s in enumerate(sheets_present, 1):
        print('  %d. %s (%d rows)' % (i, s, counts[s]))

    print()
    try:
        raw = input('Enter a number to remove: ').strip()
    except EOFError:
        print()
        print('No input available -- cancelled.')
        return
    except KeyboardInterrupt:
        print()
        print('Cancelled -- nothing changed.')
        return

    if not raw.isdigit() or not (1 <= int(raw) <= len(sheets_present)):
        print('Invalid selection -- cancelled.')
        return

    target = sheets_present[int(raw) - 1]
    target_count = counts[target]

    print()
    print('This will remove ' + target + ' (' + str(target_count) + ' rows) from index.html.')
    print('It stays untouched in the Excel workbook -- use Add Sheet to bring it back later.')
    try:
        typed = input('Proceed? (Y/N): ').strip().lower()
    except (EOFError, KeyboardInterrupt):
        print()
        print('Cancelled -- nothing was changed.')
        return

    if typed != 'y':
        print('Aborted -- nothing was changed.')
        return

    remaining = [q for q in current if q['sheet'] != target]
    backup_path = ed.splice_into_index_html(remaining)

    print()
    print('Removed ' + target + ' -- index.html now has ' + str(len(remaining)) +
          ' questions (was ' + str(len(current)) + ').')
    print('Previous version backed up to ' + backup_path)


if __name__ == '__main__':
    main()
