# SYNC_EXCEL — regenerate index.html from the Excel workbook

**Trigger phrase:** the user says something like "run SYNC_EXCEL.md" / "run
the sync file" / "sync from excel". When that happens, follow this
procedure exactly, in order. Do not skip steps, do not improvise around
them, and do not treat this run as license to change anything in RULES.md
— apply RULES.md as it currently stands, don't edit it, unless the user
separately and explicitly asks you to change a rule.

**As of the current version, `extract_data.py` is fully standalone** —
`python scripts/extract_data.py` alone does the entire sync (extract from Excel,
splice into `index.html`'s `DATA` array, clean up) with no other tool
needed, not even Claude. This procedure still exists because *deciding*
what to sync (which sheets, full vs. sampled row count) and *verifying*
the result are still judgment calls worth walking through explicitly.

## 0. Read RULES.md first, in full

Before touching anything, read `RULES.md` end to end so every constraint
in it (embedded-data architecture, `DATA` object shape incl.
`questionParts`, `sheet` vs `category`, rich-text preservation, HR
exclusion, the Years→Level mapping, "no scroller"/"no click to reveal"
layout rules, Interview Mode behavior, theme system, etc.) is loaded
before you touch anything. This run must not violate any of it.

## 1. Confirm the Excel file is in place

`extract_data.py` auto-detects the workbook — no filename to configure —
via `find_workbook()`: it reads whatever single `.xlsx` file is sitting in
the project root. Check that exactly one is present and it's the file the user
intends to sync from (if there's more than one, the script will refuse to
run and list them rather than guessing). If the user told you the sheet
names/layout changed, update `extract_data.py`'s `SHEETS` list accordingly
— otherwise leave the script's logic untouched.

## 2. Decide what SHEETS should contain

`SHEETS` in `extract_data.py` is the definitive list of "which sheets are
currently synced into `DATA`" — every run **fully re-derives `DATA` from
scratch** out of whatever `SHEETS` lists at that moment (this is not a
merge with whatever was already in `index.html`; it's a plain full
overwrite of the `DATA` array). That means:

- **To add a sheet**: add its name to `SHEETS` alongside whatever's
  already there (don't remove the existing entries) — the next run will
  contain the old sheets AND the new one. Sheet names must match the real
  Excel tab names exactly (see RULES.md §3 for the full list) — don't
  guess a name, check it against the workbook.
- **To remove a sheet** (or replace the whole set with something
  different): narrow/replace `SHEETS` to exactly what should remain —
  the next run will contain only what's listed, dropping anything else
  that used to be in `DATA`.
- **Before changing `SHEETS`, confirm with the user which of the above
  they mean** if it's ambiguous ("just add X" vs. "only sync X now") —
  don't assume.
- HR stays excluded regardless — see RULES.md's note on personal PII.

## 3. Decide the row count

Open `extract_data.py` and check `ROWS_PER_SHEET`:

```python
ROWS_PER_SHEET = None   # full dataset
ROWS_PER_SHEET = 10     # sampled/testing cap
```

**The user invoking this runbook (or asking to sync specific sheets) is
itself their explicit go-ahead to pull the full row count for what's
being synced** — you don't need to ask again unless they specifically
said "just a sample" or similar. Leave every other constant/rule in the
script untouched (column-mapping-by-header logic, rich-text handling, the
"join phrasings with or, keep questionParts" behavior, the Sr.No
positional-fallback rule, the Years→Level mapping — none of that changes
here).

## 4. Run it

```
python scripts/extract_data.py
```

This does everything in one step: extracts from the `.xlsx`, prints a
per-sheet row count, backs up the current `index.html` to
`index.html.bak`, and overwrites `index.html`'s `var DATA = [ ... ];`
array with the fresh result. Nothing else in `index.html` (CSS, other JS
functions, HTML structure) is touched. If `var DATA = [ ... ];` can't be
found at all, it raises an error and writes nothing — don't try to work
around that by hand-patching `index.html`; figure out why the array is
missing/malformed first.

Read the printed per-sheet row counts. Sanity-check them against what
you'd expect (e.g. does a sheet that looked empty/near-empty before now
have real rows, does nothing look suspiciously truncated, does `Adv.
Java` still correctly show `0`). Flag anything that looks wrong to the
user before proceeding rather than silently pushing forward — if
something looks wrong, restore `index.html.bak` over `index.html` before
investigating further.

## 5. Verify before declaring it done

- Extract both `<script>` blocks from `index.html` and run `node --check`
  on each.
- Cross-check every `getElementById('...')` call in the script has a
  matching `id="..."` in the HTML.
- Re-run a quick data sanity pass against the live `DATA` array: total
  question count, per-sheet counts match what step 4 printed, `HR` has 0
  entries (excluded by design) rather than being a silent extraction
  failure elsewhere.
- Spot-check a handful of entries directly (e.g. via a quick Node
  one-liner reading `DATA` out of `index.html`), not just the summary
  counts:
  - At least one entry with rich text in the source (e.g. anything with
    `<strong>`/`<em>` in `answer`) — confirm formatting survived and
    `answerPlain` has no stray HTML.
  - At least one multi-phrasing question — confirm `questionParts` has
    more than one item.
  - At least one entry from the `Coding` sheet, if synced — confirm
    `sheet: "Coding"` and that its `category` is the specific topic
    (e.g. "Java", "SQL"), not "Coding" itself.
- Serve the folder locally (e.g. `python -m http.server`) and confirm
  `index.html` returns 200 and loads without a console-visible parse
  error.

## 6. Clean up and report back

- `extracted_questions.json` should already be gone — the script deletes
  it automatically after a successful splice (it only survives if the
  splice step itself failed, left there for troubleshooting). If it's
  still present, something went wrong; investigate before trusting the
  result.
- `index.html.bak` (the pre-run backup) can be left in place or deleted
  once you've confirmed the new `index.html` is correct — it's not
  tracked as a source file, just a safety net for this one run.
- Leave `extract_data.py`'s `SHEETS`/`ROWS_PER_SHEET` at whatever values
  this run used — don't revert them back to a narrower/sampled state
  unless the user asks to.
- Tell the user: new total question count, new sheet count, and confirm
  RULES.md was not modified as part of this run (unless they separately
  asked for a rule change alongside the sync — call that out explicitly
  if so, since it's a deviation from the default "just sync" behavior).
