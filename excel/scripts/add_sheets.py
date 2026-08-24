"""
Adds sheet(s) to index.html's DATA array -- but ONLY sheets that aren't
already there. If a requested sheet (or the whole workbook, via --all) is
already synced in, it's left completely untouched -- this script never
re-extracts or overwrites a sheet that's already present, only adds ones
that are missing.

Usage:
    python scripts/add_sheets.py React "Design Pattern"
    python scripts/add_sheets.py --all

Always pulls the FULL row count for whatever it adds (not the sampled/
testing cap) -- adding a sheet on purpose is itself the go-ahead to pull
everything for it. Backs up index.html to index.html.bak first.
"""

import sys
import extract_data as ed


def main():
    args = sys.argv[1:]
    if not args:
        print('Usage: python add_sheets.py <SheetName> [<SheetName> ...]')
        print('       python scripts/add_sheets.py --all')
        return

    current = ed.read_current_data()
    existing_sheets = set(q['sheet'] for q in current)

    if args == ['--all']:
        targets = ed.ALL_KNOWN_SHEETS
    else:
        targets = args
        unknown = [s for s in targets if s not in ed.ALL_KNOWN_SHEETS]
        if unknown:
            print('Warning: not in the known sheet list (will still try, but')
            print('double-check these match the real Excel tab names exactly):')
            for s in unknown:
                print('  - ' + s)
            print()

    already_present = [s for s in targets if s in existing_sheets]
    to_add = [s for s in targets if s not in existing_sheets]

    for s in already_present:
        print('Skipping "' + s + '" -- already present in index.html, add will not touch it.')

    if not to_add:
        print()
        print('Nothing to add -- every requested sheet is already synced in.')
        return

    print()
    print('Extracting (full row count): ' + ', '.join(to_add))
    new_questions, counts = ed.extract(sheets=to_add, rows_per_sheet=None)
    print('rows extracted per sheet:')
    for sheet, n in counts.items():
        print('  ' + sheet + ': ' + str(n))

    if not new_questions:
        print()
        print('Extraction returned 0 rows for all requested sheets -- nothing to')
        print('add. Check the sheet name(s) match the workbook exactly, and that')
        print('the sheet actually has data rows below its header.')
        return

    combined = current + new_questions
    backup_path = ed.splice_into_index_html(combined)

    print()
    print('Added ' + str(len(new_questions)) + ' questions across ' + str(len(to_add)) + ' sheet(s).')
    print('index.html now has ' + str(len(combined)) + ' total questions (was ' + str(len(current)) + ').')
    print('Previous version backed up to ' + backup_path)


if __name__ == '__main__':
    main()
