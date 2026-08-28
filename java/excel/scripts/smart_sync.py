"""
Re-syncs every sheet that's ALREADY in index.html against the current
Excel workbook, field by field -- not a blind full overwrite. For each
question already synced in, it re-extracts that row fresh and compares:
srNo, category, level, question (incl. rich-text HTML -- so a bold/
italic/color change is caught automatically, no separate formatting
check needed), questionParts, answer (incl. rich-text HTML), priority.

- Row unchanged -> left alone.
- Row changed (any field, including formatting, including Sr.No itself)
  -> replaced with the fresh version.
- Row exists in Excel now but wasn't in index.html before -> added.
- Row was in index.html but no longer exists in Excel (its question text
  was actually deleted) -> flagged and reported, but NOT auto-removed
  unless you confirm (see below).

Matching old vs. new rows is by (sheet, questionPlain, occurrence) --
NOT Sr.No. Sr.No is a bad identity to match on: it's often a positional
fallback (assigned by row order when the Excel Sr.No cell is blank), so
deleting or inserting just ONE row elsewhere in the sheet shifts every
row after it, which would otherwise make the entire rest of the sheet
misreport as "removed + added" instead of "unchanged". A question's own
text is a far more stable identity -- it only stops matching when the
question itself is reworded, a much rarer, more deliberate edit than
"some unrelated row moved". Sr.No changing on its own (without the
question text changing) is now correctly detected as a normal field
change instead. Duplicate question text within a sheet (rare, but the
source Excel can have it) is disambiguated by occurrence order (1st,
2nd, ... row seen with that exact question text), assuming duplicates
keep their relative order between runs.

Usage:
    python scripts/smart_sync.py            # interactive: asks before removing anything
    python scripts/smart_sync.py --yes      # non-interactive: auto-confirms removals too
    python scripts/smart_sync.py --quiet    # condensed output (add to either form above)

--quiet drops the per-sheet Excel row-count listing and the itemized
"changed rows" listing (both decorative/after-the-fact detail), replacing
the whole run with one summary line when nothing meaningful needs review.
It never hides anything decision-critical: the removed-rows listing (the
thing you're actually being asked to confirm or decline) always prints in
full regardless of --quiet.

Only touches sheets that are ALREADY in index.html (use add_sheets.py to
bring in a sheet for the first time). Always pulls the full row count for
whatever sheets it re-checks. Backs up index.html to index.html.bak first.
"""

import sys
import extract_data as ed

QUIET = '--quiet' in sys.argv or '-q' in sys.argv

FIELDS_TO_COMPARE = ['srNo', 'category', 'level', 'question',
                      'questionParts', 'answer', 'answerPlain', 'priority']
CONFIRM_PHRASE = 'REMOVE THESE ROWS'


def diff_entry(old, new):
    return [f for f in FIELDS_TO_COMPARE if old.get(f) != new.get(f)]


def keyed_by_identity(questions):
    """Match rows by (sheet, question text) instead of Sr.No -- see the
    module docstring for why Sr.No is unreliable here. Occurrence-order
    disambiguates the rare case of duplicate question text within a
    sheet, so no rows silently collide/disappear from the diff."""
    seen_counts = {}
    keyed = {}
    for q in questions:
        base = (q['sheet'], q['questionPlain'])
        occurrence = seen_counts.get(base, 0)
        seen_counts[base] = occurrence + 1
        keyed[(base, occurrence)] = q
    return keyed


def main():
    auto_confirm = '--yes' in sys.argv[1:]

    current = ed.read_current_data()
    if not current:
        print('index.html has 0 questions -- nothing to sync against.')
        print('Use add_sheets.py to bring in a sheet for the first time.')
        return

    sheets_present = sorted(set(q['sheet'] for q in current))
    if not QUIET:
        print('Re-checking against Excel: ' + ', '.join(sheets_present))
    fresh, counts = ed.extract(sheets=sheets_present, rows_per_sheet=None)
    if not QUIET:
        print('rows currently in Excel per sheet:')
        for sheet, n in counts.items():
            print('  ' + sheet + ': ' + str(n))
        print()

    old_by_key = keyed_by_identity(current)
    new_by_key = keyed_by_identity(fresh)

    unchanged, changed, added = [], [], []
    for key, new_q in new_by_key.items():
        old_q = old_by_key.get(key)
        if old_q is None:
            added.append(new_q)
        elif diff_entry(old_q, new_q):
            changed.append((old_q, new_q))
        else:
            unchanged.append(old_q)

    removed = [old_by_key[key] for key in old_by_key if key not in new_by_key]

    if not QUIET:
        print('Unchanged: ' + str(len(unchanged)))
        print('Changed:   ' + str(len(changed)))
        print('Added:     ' + str(len(added)))
        print('Removed:   ' + str(len(removed)) + ' (in index.html, no longer found in Excel)')

    if changed and not QUIET:
        print()
        print('Changed rows (field(s) that differed):')
        for old_q, new_q in changed[:25]:
            fields = ', '.join(diff_entry(old_q, new_q))
            snippet = new_q['questionPlain'][:60]
            print('  ' + new_q['sheet'] + ' #' + str(new_q['srNo']) + ' [' + fields + ']: ' + snippet)
        if len(changed) > 25:
            print('  ... and ' + str(len(changed) - 25) + ' more')

    do_remove = False
    if removed:
        print()
        print('Rows no longer found in Excel (will be KEPT as-is unless confirmed removed):')
        for old_q in removed[:25]:
            snippet = old_q['questionPlain'][:60]
            print('  ' + old_q['sheet'] + ' #' + str(old_q['srNo']) + ': ' + snippet)
        if len(removed) > 25:
            print('  ... and ' + str(len(removed) - 25) + ' more')
        print()
        if auto_confirm:
            do_remove = True
            print('--yes passed: removing these ' + str(len(removed)) + ' rows.')
        else:
            try:
                typed = input('Type "' + CONFIRM_PHRASE + '" to actually remove these ' +
                               str(len(removed)) + ' rows (anything else keeps them): ')
            except (EOFError, KeyboardInterrupt):
                print()
                typed = None
            do_remove = (typed == CONFIRM_PHRASE)
            print('Removing.' if do_remove else 'Keeping them as-is.')

    if not changed and not added and not (do_remove and removed):
        if QUIET:
            print('Smart Sync: OK -- ' + str(len(unchanged)) + ' questions, already in sync.')
        else:
            print()
            print('Nothing to write -- index.html already matches Excel.')
        return

    final = list(unchanged)
    final += [new_q for _, new_q in changed]
    final += added
    if not do_remove:
        final += removed

    backup_path = ed.splice_into_index_html(final)

    if QUIET:
        print('Smart Sync: ' + str(len(changed)) + ' changed, ' + str(len(added)) + ' added, ' +
              str(len(removed) if do_remove else 0) + ' removed -> ' + str(len(final)) +
              ' questions (was ' + str(len(current)) + ').')
    else:
        print()
        print('index.html now has ' + str(len(final)) + ' questions (was ' + str(len(current)) + ').')
        print('Previous version backed up to ' + backup_path)


if __name__ == '__main__':
    main()
