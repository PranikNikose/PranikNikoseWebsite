"""
Wipes ALL questions from index.html's DATA array back to `[]`.

This is destructive and irreversible except via the backup this script
makes -- so it requires typed confirmation before writing anything. There
is no real multi-user "admin" system in this project (it's a single local
HTML file, not an app with accounts), so "admin approval" here means: you
have to type an exact confirmation phrase, on purpose, to prove this
wasn't a misclick. If you want a second person to actually approve it,
that has to happen outside this script (they tell you to go ahead, then
you run it and type the phrase).

Usage:
    python scripts/clear_data.py

Backs up the current index.html into bkp/ first (timestamped, keeps the
last 5) -- to undo, copy the newest bkp/*.bak file back over index.html,
or use restore_backup.py's numbered picker. Only the last 5 backups
survive across runs of any of these scripts -- move a copy elsewhere if
you need one long-term.
"""

import extract_data as ed

CONFIRM_PHRASE = 'CLEAR ALL DATA'


def main():
    current = ed.read_current_data()
    print('This will permanently clear all ' + str(len(current)) + ' questions')
    print('from index.html, leaving DATA = [].')
    print('index.html will be backed up into bkp/ first (timestamped, keeps')
    print('the last 5) -- move a copy elsewhere first if you might need this')
    print('one long-term.')
    print()
    try:
        typed = input('Type "' + CONFIRM_PHRASE + '" (exactly, case-sensitive) to proceed: ')
    except (EOFError, KeyboardInterrupt):
        print()
        print('Cancelled -- nothing was changed.')
        return

    if typed != CONFIRM_PHRASE:
        print('Confirmation text did not match -- aborted, nothing was changed.')
        return

    backup_path = ed.splice_into_index_html([])
    print()
    print('Cleared. index.html now has 0 questions.')
    print('Previous version (with ' + str(len(current)) + ' questions) backed up to ' + backup_path)


if __name__ == '__main__':
    main()
