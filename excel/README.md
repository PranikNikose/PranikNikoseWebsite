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

## Project tools menu (no terminal needed)

Double-click **`manage.bat`** at the repo root for a menu over everything
below — the 4 sync scripts, `list_sheets.py`, `verify_index.py`, serving
the app locally with a browser auto-opened, opening `index.html` or the
`.xlsx` workbook directly, and restoring the last backup. No VS Code or
terminal required. Smart Sync / Add Sheet / Full Resync automatically
run the verification check right after; Add Sheet shows the real,
current sheet names (and sync status) before asking which to add.

## Keeping it in sync with the Excel

Put exactly one `.xlsx` file in the project root (no filename to
configure — it's auto-detected), then run whichever of these fits what
you need, from anywhere (they resolve their own paths, no need to `cd`
into `scripts/` first). Each is standalone — no other tool required — and
backs up `index.html` to `index.html.bak` before writing anything.

| Script | What it does |
|---|---|
| `python scripts/extract_data.py` (or `--quiet`) | Full resync — with no args, mirrors whatever sheets are *currently* in `index.html` (data-driven, no list to maintain); pass sheet names as args to target a different set for that run. |
| `python scripts/add_sheets.py <Sheet>` (or `--all`) | Adds a sheet that isn't already synced in. `--all` reads every real tab straight from the workbook. Already-present sheets are left untouched. |
| `python scripts/add_sheets_menu.py` | Interactive version — pick sheets to add by number instead of typing exact tab names (avoids typos on names like "Spring Frmwrk"). Used by `manage.bat`'s Add Sheet option. |
| `python scripts/smart_sync.py [--yes] [--quiet]` | Re-checks every already-synced sheet against Excel, field by field (including formatting). Only changes/additions apply automatically — removals need confirmation. |
| `python scripts/clear_data.py` | Wipes all questions. Requires typing a confirmation phrase first. |
| `python scripts/verify_index.py` (or `--quiet`) | Read-only sanity check: JS syntax, `getElementById`/`id=` cross-check, data counts. `--quiet` collapses a passing run to one summary line; a failure always shows full detail. |
| `python scripts/list_sheets.py` | Read-only status report: every real Excel tab (read live from the workbook), synced or not, with row counts. |
| `python scripts/serve.py` | Serves the app locally on the port configured in `config.json` and opens it in your browser. |
| `python scripts/edit_config.py` | Interactive prompt to view/change `config.json`'s settings (server port, row cap) without hand-editing JSON. |

Row cap and local server port are configured in **`config.json`** (repo
root) instead of hardcoded in any script — see `scripts/config.py`.

## Project layout

```
index.html          the whole app (must stay at repo root for GitHub Pages)
manage.bat           double-click menu over all the scripts below + local dev tools
config.json          settings (server port, row cap) -- see scripts/config.py
README.md           this file
CLAUDE.md           points Claude at docs/RULES.md automatically
*.xlsx              the source workbook (gitignored — see .gitignore)
scripts/
  extract_data.py   the extraction engine the other scripts build on
  add_sheets.py
  add_sheets_menu.py  numbered-pick version of add_sheets.py (no typing tab names)
  smart_sync.py
  clear_data.py
  verify_index.py   read-only post-change sanity check (syntax, ids, data counts)
  list_sheets.py    read-only sync-status report (which sheets are in DATA)
  serve.py          local server + auto-opened browser, port from config.json
  edit_config.py    interactive config.json editor (view/change settings)
  config.py         shared config.json loader
docs/
  RULES.md          the full, detailed record of every design decision
                     made in this project and why — read before making
                     non-trivial changes
  SYNC_EXCEL.md      step-by-step runbook for a full guided resync
```
