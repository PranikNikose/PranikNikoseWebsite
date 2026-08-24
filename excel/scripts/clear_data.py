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

Backs up the current index.html to index.html.bak first -- to undo,
copy that file back over index.html before running anything else (a
later script run will overwrite index.html.bak with ITS OWN backup, so
don't wait).
"""

import extract_data as ed

CONFIRM_PHRASE = 'CLEAR ALL DATA'


def main():
    current = ed.read_current_data()
    print('This will permanently clear all ' + str(len(current)) + ' questions')
    print('from index.html, leaving DATA = [].')
    print('index.html will be backed up to index.html.bak first, but that')
    print('backup gets overwritten the next time ANY of these scripts run --')
    print('move a copy elsewhere first if you might need it long-term.')
    print()
    typed = input('Type "' + CONFIRM_PHRASE + '" (exactly, case-sensitive) to proceed: ')

    if typed != CONFIRM_PHRASE:
        print('Confirmation text did not match -- aborted, nothing was changed.')
        return

    backup_path = ed.splice_into_index_html([])
    print()
    print('Cleared. index.html now has 0 questions.')
    print('Previous version (with ' + str(len(current)) + ' questions) backed up to ' + backup_path)


if __name__ == '__main__':
    main()
