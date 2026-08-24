# Interview Prep Hub

A single self-contained `index.html` — browse, filter, and practice
interview questions from an Excel workbook, on desktop and mobile, hosted
on GitHub Pages. No build step, no server, no external files at runtime.

## How it works

- All question data lives directly inside `index.html` (a `DATA` array in
  the page's own `<script>` tag). Opening the file — even by double-click,
  no server needed — shows everything immediately.
- The Excel workbook (`*.xlsx` in the project root) is the **source of
  truth**. `index.html`'s data is a generated build artifact — never
  hand-edit it; edit the Excel and re-sync instead.
- Two modes: **Normal** (browse everything, filter by Sheet/Topic/Level/
  Priority, search) and **Interview** (timed practice, pick a subset,
  reveal-answer-on-click).

## Keeping it in sync with the Excel

Put exactly one `.xlsx` file in the project root (no filename to
configure — it's auto-detected), then run whichever of these fits what
you need, from anywhere (they resolve their own paths, no need to `cd`
into `scripts/` first). Each is standalone — no other tool required — and
backs up `index.html` to `index.html.bak` before writing anything.

| Script | What it does |
|---|---|
| `python scripts/extract_data.py` | Full resync of whatever sheets are listed in its `SHEETS` constant. |
| `python scripts/add_sheets.py <Sheet>` (or `--all`) | Adds a sheet that isn't already synced in. Already-present sheets are left untouched. |
| `python scripts/smart_sync.py [--yes]` | Re-checks every already-synced sheet against Excel, field by field (including formatting). Only changes/additions apply automatically — removals need confirmation. |
| `python scripts/clear_data.py` | Wipes all questions. Requires typing a confirmation phrase first. |

## Project layout

```
index.html          the whole app (must stay at repo root for GitHub Pages)
README.md           this file
CLAUDE.md           points Claude at docs/RULES.md automatically
*.xlsx              the source workbook (gitignored — see .gitignore)
scripts/
  extract_data.py   the extraction engine the other scripts build on
  add_sheets.py
  smart_sync.py
  clear_data.py
docs/
  RULES.md          the full, detailed record of every design decision
                     made in this project and why — read before making
                     non-trivial changes
  SYNC_EXCEL.md      step-by-step runbook for a full guided resync
```
