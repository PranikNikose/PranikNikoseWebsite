"""
One-shot heads-up: compares the source .xlsx workbook's mtime against
index.html's mtime and, if the workbook was modified more recently,
prints a one-line warning. Nothing more -- read-only, never touches
index.html or the workbook, and never blocks/prompts.

Exists so editing the workbook and then forgetting to re-sync (running
Smart Sync/Full Resync days later, or never) doesn't silently leave the
deployed app showing stale data -- manage.bat calls this once at launch,
before the menu is shown, not on every return-to-menu loop.

Usage:
    python scripts/check_stale.py

Prints nothing at all if the workbook is missing (find_workbook()'s
zero-or-many-xlsx error is handled elsewhere, not this script's job) or
if index.html is at least as new as the workbook -- silence is the
common case, this is only for the one case worth flagging.
"""

import os
import extract_data as ed


def main():
    try:
        workbook_path = ed.find_workbook()
    except Exception:
        return  # missing/ambiguous workbook -- not this script's job to report

    if not os.path.exists(ed.INDEX_HTML):
        return

    workbook_mtime = os.path.getmtime(workbook_path)
    index_mtime = os.path.getmtime(ed.INDEX_HTML)

    if workbook_mtime > index_mtime:
        print('*** Heads up: ' + os.path.basename(workbook_path) +
              ' was changed more recently than index.html -- ' +
              'consider running Smart Sync (option 2) before relying on the data. ***')
        print()


if __name__ == '__main__':
    main()
