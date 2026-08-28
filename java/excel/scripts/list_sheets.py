"""
Read-only status report: which sheets exist in the source Excel workbook,
which of those are already synced into index.html's DATA, how many rows
each synced sheet currently has, and what fraction of those rows have an
answer filled in (Excel-source completeness, not correctness -- same
has-an-answer-or-not test the app's browse-mode Answer filter and
"No answer added in Excel yet." placeholder already use). Never modifies
index.html or the workbook.

Used by manage.bat's "Add Sheet" option (so sheet names can be picked
from a real list instead of typed blind) and its "Data Summary" option.

Usage:
    python scripts/list_sheets.py
"""

import extract_data as ed


def main():
    current = ed.read_current_data()
    counts = {}
    answered = {}
    for q in current:
        sheet = q['sheet']
        counts[sheet] = counts.get(sheet, 0) + 1
        if (q.get('answerPlain') or '').strip():
            answered[sheet] = answered.get(sheet, 0) + 1

    # Read every real tab directly from the workbook. Fully data-driven --
    # no hardcoded sheet-name list to keep in sync; a brand-new tab added
    # in Excel (e.g. "DevOps") shows up here immediately.
    known = list(ed.wb.sheetnames)

    print('Workbook: ' + ed.WORKBOOK)
    print()
    print('%-18s %-14s %-8s %s' % ('Sheet', 'Status', 'Rows', 'Answered'))
    print('-' * 56)
    not_synced = []
    for s in known:
        if s in counts:
            rows = counts[s]
            ans = answered.get(s, 0)
            pct = round(100 * ans / rows) if rows else 0
            print('%-18s %-14s %-8s %s' % (s, 'synced', rows, str(pct) + '% (' + str(ans) + '/' + str(rows) + ')'))
        else:
            print('%-18s %-14s %-8s %s' % (s, 'NOT synced', '-', '-'))
            not_synced.append(s)

    total = sum(counts.values())
    total_answered = sum(answered.values())
    print('-' * 56)
    print('Total synced: ' + str(total) + ' questions across ' + str(len(counts)) + ' sheet(s).')
    if total:
        print('Total answered: ' + str(total_answered) + '/' + str(total) +
              ' (' + str(round(100 * total_answered / total)) + '%)')
    if not_synced:
        print('Not yet synced: ' + ', '.join(not_synced))
    else:
        print('Every sheet in the workbook is already synced.')


if __name__ == '__main__':
    main()
