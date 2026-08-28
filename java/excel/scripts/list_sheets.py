"""
Read-only status report: which sheets exist in the source Excel workbook,
which of those are already synced into index.html's DATA, and how many
rows each synced sheet currently has. Never modifies index.html or the
workbook.

Used by manage.bat's "Add Sheet" option (so sheet names can be picked
from a real list instead of typed blind) and its "Data Summary" option.

Usage:
    python scripts/list_sheets.py
"""

import extract_data as ed


def main():
    current = ed.read_current_data()
    counts = {}
    for q in current:
        counts[q['sheet']] = counts.get(q['sheet'], 0) + 1

    # Read every real tab directly from the workbook. Fully data-driven --
    # no hardcoded sheet-name list to keep in sync; a brand-new tab added
    # in Excel (e.g. "DevOps") shows up here immediately.
    known = list(ed.wb.sheetnames)

    print('Workbook: ' + ed.WORKBOOK)
    print()
    print('%-18s %-14s %s' % ('Sheet', 'Status', 'Rows'))
    print('-' * 44)
    not_synced = []
    for s in known:
        if s in counts:
            print('%-18s %-14s %s' % (s, 'synced', counts[s]))
        else:
            print('%-18s %-14s %s' % (s, 'NOT synced', '-'))
            not_synced.append(s)

    total = sum(counts.values())
    print('-' * 44)
    print('Total synced: ' + str(total) + ' questions across ' + str(len(counts)) + ' sheet(s).')
    if not_synced:
        print('Not yet synced: ' + ', '.join(not_synced))
    else:
        print('Every non-HR sheet in the workbook is already synced.')


if __name__ == '__main__':
    main()
