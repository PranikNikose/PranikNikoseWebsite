"""
Interactive numbered picker for adding sheets -- avoids requiring the user
to type exact Excel tab names, several of which carry easy-to-mistype
punctuation ("Adv. Java", "Spring Frmwrk", "Spring Sec."). Lists every
real, non-HR sheet with its sync status, numbers the ones that AREN'T yet
synced, and lets the user pick by number(s) instead of by typed name --
so a typo just picks nothing / gets rejected outright, instead of
silently trying to extract a sheet name that doesn't exist.

Shares the same underlying add logic as add_sheets.py (full row count,
skips anything already present, splices into index.html) -- this is the
interactive/menu-driven entry point; add_sheets.py's CLI form (exact
names or --all) is still there for scripting/direct use.

Usage:
    python scripts/add_sheets_menu.py
"""

import extract_data as ed


def main():
    current = ed.read_current_data()
    counts = {}
    for q in current:
        counts[q['sheet']] = counts.get(q['sheet'], 0) + 1

    real_sheet_names = [s for s in ed.wb.sheetnames if s != 'HR']
    not_synced = [s for s in real_sheet_names if s not in counts]

    print('%-18s %-14s %s' % ('Sheet', 'Status', 'Rows'))
    print('-' * 44)
    for s in real_sheet_names:
        if s in counts:
            print('%-18s %-14s %s' % (s, 'synced', counts[s]))

    if not not_synced:
        print()
        print('Every non-HR sheet in the workbook is already synced -- nothing to add.')
        return

    print()
    print('Not yet synced -- pick by number:')
    for i, s in enumerate(not_synced, 1):
        print('  %d. %s' % (i, s))

    print()
    try:
        raw = input('Enter number(s) separated by space (or "all"): ').strip()
    except EOFError:
        print()
        print('No input available -- cancelled.')
        return
    except KeyboardInterrupt:
        print()
        print('Cancelled -- nothing changed.')
        return

    if not raw:
        print('Nothing entered -- cancelled.')
        return

    if raw.lower() == 'all':
        targets = not_synced
    else:
        targets = []
        bad = []
        for tok in raw.split():
            if tok.isdigit() and 1 <= int(tok) <= len(not_synced):
                targets.append(not_synced[int(tok) - 1])
            else:
                bad.append(tok)
        if bad:
            print('Ignoring invalid selection(s): ' + ', '.join(bad))
        if not targets:
            print('No valid selections -- cancelled.')
            return

    print()
    print('Adding: ' + ', '.join(targets))
    new_questions, extracted_counts = ed.extract(sheets=targets, rows_per_sheet=None)
    print('rows extracted per sheet:')
    for sheet, n in extracted_counts.items():
        print('  ' + sheet + ': ' + str(n))

    if not new_questions:
        print()
        print('Extraction returned 0 rows -- nothing added. Check that the sheet(s)')
        print('actually have data rows below their header.')
        return

    combined = current + new_questions
    backup_path = ed.splice_into_index_html(combined)

    print()
    print('Added ' + str(len(new_questions)) + ' questions across ' + str(len(targets)) + ' sheet(s).')
    print('index.html now has ' + str(len(combined)) + ' total questions (was ' + str(len(current)) + ').')
    print('Previous version backed up to ' + backup_path)


if __name__ == '__main__':
    main()
