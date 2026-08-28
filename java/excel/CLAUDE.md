# Project instructions

Before making ANY change to `index.html` — or to anything in `scripts/`
(`extract_data.py`, `clear_data.py`, `add_sheets.py`, `smart_sync.py`),
the Excel-sync tooling those changes ultimately feed — read
**[docs/RULES.md](docs/RULES.md)** and follow it strictly. It captures
every established decision (embedded-data file structure, Excel
extraction fidelity, desktop/mobile layout, filtering behavior, Interview
Mode, theme system, visual style, deployment target, project hierarchy,
and the standalone sync scripts in section 12).

Do not violate a rule in RULES.md unless the user's current prompt
explicitly asks for that specific change. If a request conflicts with a
rule, say so before proceeding, don't silently override it.

When a change alters something RULES.md documents (layout, field order,
filter behavior, style direction, etc.), update RULES.md in the same turn
so it stays accurate.

If the user asks to "run SYNC_EXCEL.md" (or similarly asks to sync/
regenerate from the Excel workbook), follow
**[docs/SYNC_EXCEL.md](docs/SYNC_EXCEL.md)** exactly — it's the full
Excel → `index.html` data-refresh procedure. That run is itself the
user's explicit go-ahead to pull the full dataset (not the testing-phase
sample); it is not license to change any other rule in RULES.md.
