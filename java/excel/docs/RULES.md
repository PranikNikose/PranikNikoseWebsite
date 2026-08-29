# Rules for index.html (Interview Prep Hub)

The app's on-page title/name is **"Interview Prep Hub"** (`<title>` and the
header `<h1>`) — it was previously "Question Bank"; don't revert it without
being asked. There is no footer element — a prior "data is embedded..."
footer note was explicitly removed by the user; don't re-add page-chrome
text like that without being asked.

These rules capture every decision made for this project so far. Any future
change to `index.html` MUST follow them unless the user explicitly overrides
a specific rule in a new prompt. If a request conflicts with a rule below,
point out the conflict before making the change.

## 0. Why this exists

The user cannot carry/open the source Excel workbook everywhere, but can
always reach a URL. This app exists so the **real Excel content** is
browsable, filterable, and practice-able **entirely from GitHub Pages**, on
both desktop and mobile, for revision and interview prep. That's the design
compass for every decision below: real data, no dead ends when opened on a
phone, nothing that requires a click to become readable during revision.

## 1. File structure — everything embedded, no external fetch

- Everything lives in a **single `index.html`** file: HTML, CSS, JavaScript,
  **and the question data itself** are all inline. Do not split into
  separate `.css`/`.js`/data files, and do not reintroduce `fetch()` of an
  external data file (e.g. a `.txt`/`.json` sidecar).
- The question data lives in a top-of-script `var DATA = [ {...}, ... ];`
  array literal. `allQuestions = DATA;` wires it in directly — no async load
  step, no loading state to wait for, no `file://`/CORS/cache failure mode.
- **History**: this app previously loaded data at runtime via
  `fetch('que.txt')`, a plain-text extract of the workbook. That caused
  repeated real problems — `file://` fetch failures, GitHub Pages cache
  staleness, and the data file going missing entirely outside the app's
  control. Embedding the data removed that whole class of bug. Do not go
  back to an external data file unless the user explicitly asks.
- Because there's no fetch, `index.html` works correctly even opened
  directly via double-click (`file://`) — no local server required just to
  see data. A local server (`python -m http.server`, `npx serve`) is still
  useful when testing anything path-sensitive for the GitHub Pages deploy.

## 2. Question data: `DATA` object shape

Each entry in `DATA` has exactly these fields (all strings):

| field           | meaning                                                          |
|-----------------|-------------------------------------------------------------------|
| `srNo`          | Sr. No. from Excel, or a positional fallback (see §3)             |
| `sheet`         | the literal Excel **tab name** (e.g. `SpringBoot`, `React`)       |
| `category`      | the `Topic` column value — finer-grained than `sheet` (see §3)    |
| `level`         | experience level, plus years in parens if present, else `General` |
| `question`      | the question phrasings joined with "or", as **HTML** (§4)         |
| `questionPlain` | the same, as **plain text**, for search                           |
| `questionParts` | **array** of each individual phrasing's HTML — one row's Question cell can hold several alternate phrasings of the same question (§3); browse mode shows the joined `question`, Interview Mode renders each part as its own "Q." line (§7) |
| `answer`        | the answer as **HTML** (rich-text formatting preserved, §4)       |
| `answerPlain`   | the same answer as **plain text**, for search                     |
| `priority`      | priority tag from Excel (e.g. `LinkedIn-1`, `1`), often blank     |

`question`/`answer`/each item of `questionParts` render via `.innerHTML`
(they carry real markup). Everything else renders via
`.textContent`/`escapeHtml()`. Search (`applyFilters`) must match against
`questionPlain`/`answerPlain`, never by stripping tags out of the HTML
fields at render/search time.

## 3. Extraction from the source Excel workbook

The **source of real data** is
`All_Study_and_Interview_Questions_Answers_List_0-10YoE.xlsx` in this
folder — an 18-sheet Excel workbook. Read it with `openpyxl`
(`load_workbook(path, rich_text=True)` — see §4) — it cannot be read as
plain text. Real sheets: HR, Coding, CoreJava, Adv. Java, Junit, Maven,
JDBC, Spring Frmwrk, Hibernate, Spring Sec., SpringBoot, Microservices,
DSA, API, RDBMS, Design Pattern, AI, React.

Currently embedded: **1029 questions across 5 sheets** — CoreJava (320),
SpringBoot (292), Microservices (316), Coding (70), HR (31) — at full row
count, per the user's explicit selective-sync requests (SYNC_EXCEL.md
§2b, `add_sheets.py` for Coding/HR). The remaining sheets (including two
tabs not yet in the catalog above, `DevOps`/`Caching`) are not yet in
`DATA`; add them the same way (either individually via §2b, or all at
once via §2) when asked. `HR` used to be hard-excluded everywhere
(personal PII) — see the note below on why that's no longer a code-level
block. `Adv. Java` is genuinely empty in the source (1 header row only,
no data) — that's real workbook state, not a bug, and applies whenever
it's synced in.

**Column layout is NOT uniform across sheets** — read each sheet's header
row and map columns by name (`sr`, `level`, `years`, `topic`, `question`,
`answer`, `priority`/`proority`), never assume a fixed column position.
Most sheets are `Sr.No / level / Years / Topic / Questions / Answers /
Priority Count`, but e.g. `Coding` is `Sr.No / Topic / Questions / Answers
/ Priority Count / Company` — no level/years columns at all. Missing level
defaults to `'General'`.

**`sheet` vs `category` are different fields — do not conflate them.**
`sheet` is the literal Excel tab name; the app's Sheet selector and
Interview Mode's Sheets checklist are keyed on `sheet`. `category` is the
`Topic` column value, finer-grained (one sheet can span several Topics —
e.g. `Coding` holds `Core Java Basics`, `Java`, `SQL`, etc.) and stays a
separate display field/tag. Using `category` to populate the Sheet
selector was a real bug that shipped once (produced 22 "sheets" instead
of the real ~16-18) — don't reintroduce it.

**One Excel row = one `DATA` entry — do not split multi-line Question
cells into separate entries.** A `Questions` cell can contain several
lines; these are **alternate phrasings of the same question** (confirmed
by the user), not separate questions. Join them into a single question
string with `" or "` (plain) / `" <em>or</em> "` (HTML) between phrasings
for `question`/`questionPlain` — AND keep the un-joined list of individual
phrasings as `questionParts` (array of HTML strings, one per phrasing) so
Interview Mode can render each as its own "Q." line (§2, §7) instead of
one "or"-joined sentence. This was also a real bug that shipped once —
earlier extraction split each line into its own `DATA` entry (all sharing
one answer), multiplying 148 real rows into 166 fragmented entries. If a
genuinely-multi-line Questions cell needs re-extracting, join into
`question`/`questionPlain` AND populate `questionParts` — never split into
separate top-level entries.

**Sr. No. fidelity**: many rows have a blank Sr.No cell in the source
(the workbook itself is inconsistent). When blank, assign the row's
1-based position among the rows pulled from that sheet instead of leaving
it blank — every question must display a usable Sr.No. This fills in an
ordinal position, not question/answer content, so it doesn't violate the
"never invent Q&A" rule below.

Do not invent question/answer content. Only add data that actually exists
in the source `.xlsx`. When asked to "add more questions/sheets from
Excel," extract real rows via `openpyxl`, map columns by header name per
sheet, join multi-line Question cells with "or" (not split), and append
objects to the `DATA` array — never make up new Q&A content.

**Note on the HR sheet:** it contains personal, identifying content (the
user's real name, employer, and career details) written as first-person
interview answers. Since this app deploys to public GitHub Pages, adding
its rows to `DATA` makes that personal content public once pushed/
deployed — this was originally a hard, code-level exclusion (`add_sheets.py`/
`add_sheets_menu.py`/`list_sheets.py` all filtered `HR` out by name, so it
never appeared as a pickable option anywhere). **The user explicitly asked
for HR to be included** ("add it now" / "i want hr in it", after being
told exactly what it contains and that this project deploys publicly) —
the code-level exclusion was removed from all three scripts at that
request; HR now behaves like any other sheet in every listing/picker.
HR was subsequently synced into `DATA` by the user running the extraction
themselves (`add_sheets.py HR`) — it now has **31 rows**, same as any
other synced sheet. `scripts/verify_index.py`'s data-sanity check no
longer hard-fails on a non-zero HR count (it originally did, a leftover
from before this decision — that check was removed once it was noticed
contradicting this rule). If HR ever needs re-excluding (the user changes
their mind), reinstate the `!= 'HR'` filter in those three scripts, remove
its 31 rows from `DATA`, and re-add an HR=0 check to `verify_index.py` —
don't silently re-add any of that without being asked, symmetric with how
it was removed.

## 4. Rich text formatting must be preserved, not flattened

Load the workbook with `openpyxl.load_workbook(path, rich_text=True)` —
cells with mixed formatting come back as `CellRichText` (a sequence of
plain strings and `TextBlock` runs, each carrying an `InlineFont` with
`.b`/`.i`/`.u`/`.color`). This is real, confirmed formatting in the user's
workbook (bold emphasis throughout many answers) — plain `.value` reads
silently discard it.

Convert each run to escaped HTML wrapped in `<strong>`/`<em>`/`<u>`/a
`color:` `<span>` as appropriate — only for an explicit non-default RGB
color (`font.color.rgb` present and not a `00`-alpha placeholder); a
theme-only color with no real `.rgb` is not an actual override, skip it.

Because a cell's rich-text runs can contain embedded `\n` at arbitrary
points (not only between runs), splitting/joining by line must operate on
the **run list** first (group runs into lines, THEN convert each line's
runs to HTML) — never flatten to a plain-text string first and then try to
recover formatting.

Always also produce the plain-text mirror (`questionPlain`/`answerPlain`) —
see §2.

## 5. Layout: desktop vs. mobile (pure CSS breakpoint, no JS device sniffing)

- Breakpoint: `768px` (`min-width:768px` = desktop, `max-width:767.98px` =
  mobile). Controlled via CSS `#tableView`/`#singleView` display toggling —
  do not switch layouts with JavaScript/user-agent sniffing.
- **Desktop (≥768px):** an Excel-style **table** showing every question
  that matches the current filters **at once** (no pagination). **Three
  columns**: a merged **"Details"** column (Sheet/Category/Level, see
  below), **Question**, **Answer**.
- **Desktop's Details column merges Sheet, Category, and Level into one
  cell** — three stacked `.meta-row`s of `.tag` badges (`tag-sheet` alone
  on the first row, `tag-category` alone on the second, `tag-level` alone
  on the third). Sheet was added after CoreJava/SpringBoot/Microservices
  were all synced in at once — with multiple sheets mixed in one filtered
  view, the user needed to see which sheet a row came from without
  opening the Sheet filter. Uses a new `--tag-sheet-bg`/`--tag-sheet-fg`
  color pair (blue) distinct from the other tag colors, defined in both
  the dark and light `:root` blocks. This was a deliberate space trade:
  collapsing several fields into 1 column (160px fixed, widened slightly from the
  original 150px — see below) lets Question and Answer each get far more
  width (`col-question` 34%, `col-answer` the remainder) so there's much
  less wrapping/scrolling to read them. Don't re-split Details back into
  separate `<td>`s without the user asking — this was the explicit point
  of the change.
  - **`.app`'s `max-width` is 1140px (widened from 1080px, then dialed back from an
    overshoot at 1240px) and `td.col-meta`/`th.col-meta` is 160px
    (widened from 150px, then dialed back from an overshoot at 180px)** — asked
    for by the user alongside the tag-overflow fix below, for more
    overall breathing room, not because either was strictly required to
    fix the overflow bug itself (the wrap fix alone did that). Not a hard
    ceiling — just the current values; don't treat 1140/160 as sacred if
    a future request wants them changed again.
  - **`.meta-row .tag` must wrap (`white-space:normal`), not use `.tag`'s
    default `white-space:nowrap`.** The base `.tag` rule is `nowrap` by
    design (works fine for short values in mobile's `.field-inline`,
    which isn't width-constrained), but Details is a fixed-width column (160px) —
    a long value like `Junior to Mid (1–3 Years)` or a long Sheet/Category
    name would refuse to wrap and visually overflow past the column
    boundary into the Question column next to it (`table-layout:fixed`
    constrains layout width but doesn't clip overflowing inline content).
    The user saw this as tags "overlapping" the question text. Originally
    only `.meta-row .tag-category` had the wrap override; the actual bug
    was any tag in that column, so the rule now targets `.meta-row .tag`
    (all of them — sheet/category/level), not one specific field. Don't
    narrow this back to a single tag class.
- **Sr.No is NOT displayed anywhere in browse mode** (desktop or mobile)
  — the user found a per-question serial number didn't look good on
  screen, and it's not useful revision info anyway. `tag-srno`, the
  `--tag-sr-bg`/`--tag-sr-fg` color tokens, `#mSrNo`, and the `srNo` field
  in `els`/rendering were all removed. **`q.srNo` still exists in `DATA`**
  (from `extract_data.py`, still used as the ordinal fallback when the
  Excel Sr.No cell is blank — see §3) — it's just not rendered anywhere
  now. This matches Interview Mode, which already excluded Sr.No from the
  start for the same "not useful mid-revision/mid-quiz" reason (see §7).
  Don't re-add a Sr.No display without being asked.
- **Priority is NOT in the Details column** — it renders as its own line
  directly AFTER (below) the question text instead (`.q-priority` div,
  inside `col-question`, below `.q-text` which wraps `q.question`). The
  user asked for Priority to "highlight better" — it was getting lost
  among four other small tags in the narrow Details column, so it moved
  next to the thing it's actually about (the question) instead. It was
  briefly placed ABOVE the question first, then the user explicitly asked
  for it to come after — read the question first, priority second, not
  the other way around. Same relocation/ordering applies to mobile
  (Priority field-row sits between the Question and Answer field-rows,
  not before Question) and Interview Mode (`.q-priority` sits between the
  Question `.field-row` and the Answer `.field-row`/Reveal button, not
  between the Sheet/Category/Level `.field-inline` row and Question).
  **The priority tag always renders**, using `q.priority || '—'` — same
  fallback everywhere. An earlier version omitted the tag entirely for
  blank priority (~83% of the dataset), which meant the desktop table
  showed literally no priority indicator on most rows while mobile/
  Interview Mode always did — a real inconsistency the user read as
  "priority isn't highlighting". Keep all three views rendering priority
  the same way (always shown, always positioned right after the
  question, never before it) — don't reintroduce a conditional hide,
  don't move it back before the question, and don't move Priority back
  into the Details column / Sheet-Category-Level tag row without being
  asked.
- **Mobile (<768px):** **one question at a time**, with Previous/Next
  pagination buttons. Top-to-bottom order: Sheet/Category/Level as a
  `.field-inline` row of plain colored `.tag` badges (`tag-sheet`/
  `tag-category`/`tag-level`, no text label in front — same "no label,
  tag color is the identifier" style as desktop's Details column), then
  Question as a labeled `.field-row`, then Priority alone in its own
  `.q-priority` line (AFTER Question, not before — see the Details column
  note above), then Answer as a labeled `.field-row`. Sr.No is not shown
  at all (see the Sr.No note above — `#mSrNo` was removed). **Question
  and Answer keep their text labels** — they're prose, not a short tag
  value, so the label still earns its place; only the short metadata
  fields + Priority lost their labels. The user explicitly asked why
  mobile showed "Field : value" labels for the metadata fields when
  desktop's Details column doesn't — this was the original mobile spec
  early in the project, but the user changed their mind once desktop's
  compact label-free tag style existed to compare against. Don't
  reintroduce text labels for Sheet/Category/Level/Priority without being
  asked.
- **No click-to-reveal anywhere in browse mode, on either layout.** The
  full Question and Answer render immediately — no clamp, no "Show
  full"/"Show Answer" toggle. This was tried twice and explicitly removed
  both times: the app is for revision, so nothing should require a click
  to become readable. (Interview Mode, §7, is the one deliberate exception
  — its Reveal-Answer step is the intended point of practice mode.)
- **No scrollers on the main table.** It uses `table-layout:fixed` with
  percentage column widths (`col-meta` 160px fixed, `col-question` 34%,
  `col-answer` auto) so long content wraps within its column instead of
  forcing a horizontal scrollbar. Don't reintroduce `overflow-x:auto`/a
  fixed `min-width` on the table — wrapping is the intended no-scroller
  behavior. (Small, self-contained popovers/checklists — the filter
  dropdowns, the Interview Mode modal's Sheets/Priority lists — are
  allowed to scroll internally; "no scroller" applies to the main content
  area, not those.)
- **Missing answers get a placeholder, not blank space.** ~60% of the
  current dataset has no answer written yet in Excel (real state of the
  source, not a bug). Render `answerHtmlOrPlaceholder(q)` — an italic
  muted "No answer added in Excel yet." — instead of an empty `.innerHTML`,
  everywhere an answer is shown (table, mobile card, Interview Mode).
- **`Coding`-sheet answers render as syntax-highlighted Java code**, not
  prose. `answerHtmlOrPlaceholder(q)` checks `q.sheet === 'Coding'` and, if
  so, wraps `javaHighlight(q.answerPlain)` in `<pre class="code-block">`
  instead of returning the rich-text `q.answer` HTML — the highlighter
  tokenizes plain text directly (keywords/strings/comments/numbers/
  annotations/type-names via one regex with named capture groups, each
  escaped and span-wrapped), so any rich-text bold on a Coding-sheet answer
  is intentionally not shown there (real code snippets in this workbook
  don't carry manual bold anyway). `.code-block`/`.tok-*` colors are theme
  CSS variables (`--code-bg`, `--code-kw`, etc.) — keep both a dark and a
  light palette in sync with the rest of §8's rule, don't hardcode. This
  only applies to the **Answer** field of the **Coding** sheet specifically
  — don't extend it to Question text or to other sheets without being
  asked; other sheets' answers are prose that happens to mention code
  tokens (`@Autowired`, `spring-boot-starter-web`), not code blocks.
- **Normal (browse) mode and Interview Mode are always both reachable.**
  The header (with the "🎯 Interview Mode" button and theme toggle) is
  never hidden — only `.toolbar`/`.status-row`/`#tableView`/`#singleView`
  toggle with an active Interview session. This means a user can jump into
  Interview Mode from browse mode at any time via the header button, and
  back out via "End Interview" (mid-session) or "Exit to Browse"
  (post-completion) at any time. Don't hide the header or make either mode
  a dead end the user can't back out of.
- **Known bug, fixed**: `applyFilters()` must explicitly set
  `els.tableView.style.display`/`els.singleView.style.display` to `'none'`
  in the zero-results branch and back to `''` in the normal branch (right
  before `renderTable()`/`renderSingle()`). Without this, a search/filter
  combination that matches nothing left the *previous* render's content
  showing behind the "no matches" empty-state card (stale mobile question,
  or an empty header-only desktop table) — the same class of inline-style-
  vs-media-query bug documented for Interview Mode below. If
  `applyFilters()` is touched, keep this reset.

## 6. Filtering

- **Sheet is a multi-select filter pill, NOT a single-select `<select>`.**
  `FILTER_COLUMNS` = **Sheet** (`sheet` field), **Topic** (`category`),
  **Level**, **Priority**, **Answer** (see below), in that order — all
  five use the exact same Excel-style popover pattern (checkboxes,
  "Select All", Apply/Clear).
  There used to be a standalone `<select id="sheetSelect">` dropdown that
  could only pick one sheet (or "All Sheets") at a time — the user
  explicitly asked why multi-select wasn't available for Sheet like the
  other filters, and there was no good reason for the inconsistency. It
  was removed (along with `selectedSheet`, `populateSheetSelect()`, and
  the special-cased `matchesSheet` branch in `applyFilters()`) in favor of
  folding `sheet` into the generic `FILTER_COLUMNS`/`columnFilters` system
  that Topic/Level/Priority already used. Don't reintroduce a separate
  single-select Sheet dropdown — if Sheet ever needs its own UI treatment
  again, it must still support selecting more than one at once.
  - **Topic ≠ Sheet, and both filters are needed together**: a single
    Sheet can span several Topics (e.g. `Coding` held `Core Java Basics`,
    `Java`, `SQL`, `Real-World Debugging` as 4 different topics, back when
    it was one of the synced sheets — currently CoreJava/SpringBoot/
    Microservices alone span 150 distinct Topic values, see §6's Topic
    search box note below). An earlier version of this app dropped the
    Topic filter on the theory that Sheet already covered it ("no separate
    Category filter pill — redundant") — that was wrong, the two operate
    at different granularity, and the user asked for Topic back. Don't
    remove it again on that same reasoning.
- **Search box**: free-text search across `questionPlain` + `answerPlain`.
  Not a fixed-value popover (search isn't a value list).
  - **Multi-keyword AND matching, not one literal substring.** The typed
    input is split on whitespace into separate terms; a row matches only
    if **every** term appears somewhere in that row's combined
    `questionPlain` + `answerPlain` text (order-independent, terms can
    appear anywhere/either field). This replaced an earlier single-
    substring match (`indexOf(searchTerm)`) that required the whole typed
    string to appear verbatim and in order — so `HashMap Hashtable`
    matched nothing even though "Difference between HashMap and
    Hashtable?" exists, since the literal phrase "hashmap hashtable"
    never occurs. The user explicitly asked for this. Don't revert to
    single-substring matching without being asked.
  - **Matched search terms are visually highlighted** in the rendered
    Question/Answer text (desktop table, mobile card) via
    `highlightSearchTerms(rootEl, terms)` — wraps each match in `<mark
    class="search-hl">`, theme-aware via `--search-hl-bg`/`--search-hl-fg`
    (not the browser's default yellow-on-black `<mark>` look). Operates
    directly on the DOM by walking text nodes with a `TreeWalker`, NOT by
    re-building the innerHTML string — this is what lets it highlight
    safely INSIDE already-rendered rich HTML (bold/italic spans,
    Coding-sheet syntax-highlighted `<span>`s) without needing to parse
    or regenerate that markup. Called from `renderTable()`/
    `renderSingle()` right after they set Question/Answer innerHTML,
    using the same `currentSearchTerms` `applyFilters()` already computed
    for the actual filtering — purely cosmetic on top of matching that
    already happened, never changes which rows are included. Cell/field
    labels and tags (Sheet/Category/Level/Priority) are NOT highlighted
    — search only ever matches `questionPlain`/`answerPlain`, so
    highlighting stays scoped to Question/Answer content, same fields the
    matching itself covers.
- "Clear Filters" resets: all five column filters (Sheet/Topic/Level/
  Priority/Answer) → null, search → empty.
- **All five browse-mode filter popovers (Sheet/Topic/Level/Priority/
  Answer) use the same chip multi-select pattern as Interview Mode's
  config modal** (`buildChipGroup()`/`chipGroupSelected()`, §7) — NOT a
  checkbox list. Sheet gets its own dedicated trigger row/button above
  Search (`#sheetFilterBtn`/`#sheetFilterPopover`); Topic/Level/Priority/
  Answer render as pill buttons in `#filterButtons` below Search. Both
  trigger styles share one popover open/close/render implementation via
  the `popoverRefs` lookup and `renderFilterPopoverChips()` (built once in
  `buildFilterButtons()`). There is no `.fp-item` checkbox pattern
  anywhere in this app anymore, and no standalone `<select>` for Sheet —
  don't reintroduce either; a past version of this doc described that
  older checkbox-based architecture, which was fully replaced.
- **Topic's popover gets a search box (`.fp-search`), the others don't.**
  Topic (`category`) can run to 100+ distinct values (mixing several
  synced sheets), which is too many to scan/scroll through even as
  wrapped chips — a text input above the chip-group filters which chips
  are visible as you type (`chip.style.display`, matched against
  `chip.dataset.value` case-insensitively), while the wildcard "All" chip
  always stays visible so the filter can always be cleared. Filtering
  which chips are VISIBLE never touches which are SELECTED — a chip
  picked before typing a search term stays selected even while hidden
  from view, and `chipGroupSelected()` still reports it on Apply. Sheet/
  Level/Priority/Answer don't get this search box — their value counts (a
  handful each, and Answer is fixed at exactly two) don't need it; only
  add it elsewhere if that value count grows enough to need it too, don't
  add it everywhere by default.
- **Answer is a filter on presence, not on a real per-row value** —
  `FILTER_COLUMNS`' `answer` entry doesn't correspond to raw distinct
  values like the other four (an answer is long free-form rich text, not
  a categorical field), so it bypasses `uniqueValues()` entirely and
  always shows exactly two fixed synthetic chips: `ANSWER_FILTER_VALUES =
  ['Blank', 'Non Blank']`. Matched in `applyFilters()`'s `matchesCols` by
  a special case on `col.key === 'answer'`: `Non Blank` if
  `answerPlain.trim()` is non-empty, `Blank` otherwise — the same
  has-an-answer-or-not test `answerHtmlOrPlaceholder()` already used for
  rendering the "No answer added in Excel yet." placeholder (§5), just
  reused for filtering. Added at explicit user request, the same
  "blank/non-blank" naming convention as Priority's `Non Blank` chip
  (above) — don't rename the two bucket labels without being asked.

## 7. Interview Mode

A separate practice mode, distinct from browse mode, added on explicit
request. Does NOT replace or alter browse mode — both coexist and are
always mutually reachable via an explicit **segmented mode toggle in the
header**: "📖 Normal Mode" / "🎯 Interview Mode" buttons inside
`.mode-toggle`, always visible regardless of which mode is active. This
exists because "where's the option for normal mode?" was a real question
from the user once the config modal made Interview Mode feel like the only
first-class destination — don't go back to Interview Mode being reachable
only via a button with no equally-visible way back except an in-context
"End Interview" link.
- `setModeUI(isInterview)` toggles `.active` on whichever button matches
  the *actual current mode* (a running Interview session — not just the
  config modal being open) and updates `aria-selected`. Called from
  `launchInterview()` (→ true) and `endInterview()` (→ false). The default
  HTML already marks Normal Mode `active` on load, matching real initial
  state, so `init()` doesn't need to call it.
- Clicking "📖 Normal Mode" (`goNormalMode()`) closes the config modal if
  it's open and ends any active session — a no-op if already in Normal
  Mode.
- **Responsive labels, not just responsive font-size**: below 640px, each
  `.mode-btn` swaps its `.label-full` text ("Normal Mode"/"Interview Mode")
  for a `.label-short` one ("Normal"/"Interview") via CSS display toggling
  — both spans exist in the DOM at all times, only visibility changes. This
  is a real fix, not cosmetic: shrinking font-size/padding alone (the
  original approach) still let the two-button toggle + theme button
  overflow/wrap awkwardly on narrow phones. Don't go back to
  padding/font-only shrinking without re-verifying it actually fits at
  ~320–375px wide.
- `#themeToggle` and `.mode-toggle` are both a fixed **44px tall**
  (`.mode-btn{height:100%}` fills its parent) so the mode toggle and the
  theme button line up as one visually consistent control cluster in the
  header. `#themeToggle` is intentionally its **own standalone bordered
  pill** (not a child inside `.mode-toggle`'s shared container like the two
  mode buttons are) with **14px of gap** (`.header-actions{gap:14px}`)
  before it — the user asked for it to visually read as "another button",
  distinct from the Normal/Interview pair, not crowded against them.
  `#themeToggle` also carries a text label now, not just an icon —
  `applyThemeIcon()` sets `#themeIcon` (emoji), `#themeLabelFull` ("Dark
  Mode"/"Light Mode"), and `#themeLabelShort` ("Dark"/"Light"), using the
  same `.label-full`/`.label-short` responsive-swap pattern as the mode
  buttons (kept in sync in the same `@media` rules) — don't let the theme
  button diverge back to icon-only or fall out of step with the mode
  buttons' breakpoints. `.header-actions` has `flex-wrap:wrap` and
  `justify-content:flex-end` as a safety net if content ever doesn't fit,
  plus an icon-only fallback below 360px width — but the short-label swap
  is what actually prevents overflow/cramping at normal screen sizes.
- Clicking "🎯 Interview Mode" always opens the config modal
  (`openInterviewModal()`), including while a session is already running
  (lets the user reconfigure and start a new session over the old one; the
  modal's `z-index:100` covers the active session while open).

**Config modal** (opened via the header's "🎯 Interview Mode" button):
- **Presets** (`#interviewPresetSelect` + Save Current/Delete buttons, its
  own `.modal-section` at the very top, above Sheets) — saves the WHOLE
  modal state (Sheets/Level/Priority picks, count, Random order, Balanced
  Mix, Prioritize Weak Sheets, scratch box) under a name to `localStorage`
  (`interviewPresets` key), so a full reconfiguration is one dropdown pick
  instead of rebuilding every chip/toggle each session. Added at explicit
  user request. `currentInterviewModalState()` reads the live modal state
  the same way `startInterviewFromModal()` does; `applyInterviewPreset()`
  re-runs `buildChipGroup()` for Sheets/Level/Priority with the saved
  picks as `initialSelected` and sets the plain inputs/checkboxes
  directly. **Saving over an existing name overwrites that preset**
  (matched by exact name string) rather than creating a silent duplicate
  in the dropdown — don't change this to always-append without asking.
  `localStorage` reads/writes wrapped in `try/catch`, same defensive
  pattern as history (below) — a private-mode/quota failure degrades to
  "no presets available," never blocks starting a session.
- **No scrolling anywhere in this form — a hard requirement, not a nice-
  to-have.** It was previously a tall vertical checkbox list per filter
  group, each internally scrollable (`max-height` + `overflow-y:auto`)
  *inside* an outer modal that was *also* `max-height`/`overflow-y:auto` —
  a nested-scroll trap, and it didn't fit most viewports without scrolling
  either way. Rebuilt as **chip multi-select** (`.chip-group`/`.chip`,
  `buildChipGroup()`/`chipGroupSelected()` in the script): each value is a
  small wrapping pill button toggled by click/tap, plus a dashed-border
  "All" chip that selects/deselects the whole group and stays in sync with
  individual chip state. Chips wrap naturally and take far less vertical
  space than one-row-per-value, which is what actually makes "no scroll"
  achievable — don't revert to a vertical checkbox/label list for any
  filter group here.
- **Modal width was widened from 600px to 720px, then further to 820px**
  (`.modal{max-width}`),
  and vertical rhythm tightened (`.modal{gap}` 16px→13px,
  `.modal-toggle-row{padding}` 9px→6px, `.modal-overlay{padding}`
  16px→12px, `.modal-overlay .card{padding}` 18px→16px 18px) — after
  Presets/Prioritize Weak Sheets/the scratch toggle were added, the modal
  grew tall enough that a modest desktop browser window (short viewport,
  not maximized) needed page-level scroll to see the whole thing, cutting
  off the header and action buttons — the user hit this directly and
  screenshotted it. Widening lets Sheets/Level chips wrap into fewer
  rows; the spacing trims recover the rest. **This is still a real
  tension with "no scrolling anywhere," not a permanently solved
  problem** — every new modal section pushes height back up, and an
  unusually short window can still need to scroll the page. If this
  recurs, the next lever is consolidating sections further (as Prioritize
  Weak Sheets/scratch box were folded into "Mix & Extras" instead of
  getting their own sections, below) before reaching for internal modal
  scrolling, which was deliberately rejected once already (the nested-
  scroll trap mentioned above) — don't reintroduce it without asking.
  - **Second compaction pass**: after the widen-to-820px change, the user
    reported the modal STILL didn't fit at their actual 100% zoom (they'd
    zoomed the browser out to get a screenshot that looked fine — the
    screenshot wasn't representative of the real problem). Explicitly
    asked whether to add internal modal scrolling to guarantee a fit; the
    user said no, keep compacting instead — so the "no scrolling" rule
    stands, at the cost of needing yet more spacing trims: `.modal-overlay
    .card{padding}` 16px 18px→14px 16px, `.modal{gap}` 13px→11px,
    `.modal-header h2{font-size}` 1.15rem→1.1rem, `.modal-close` 30px→28px,
    `.modal-sub{margin}` -10px→-8px/`{font-size}` .85rem→.82rem,
    `.modal-section{gap}` 8px→6px, `.modal-section-label{font-size}`
    .72rem→.7rem, `.chip-group{gap}` 7px→6px, `.chip{padding}`
    `6px 13px`→`5px 12px`, `.modal-toggle-row{padding}` 6px→4px/`{font-size}`
    .88rem→.86rem. **If a short-viewport user still hits this after all
    these rounds, internal modal scrolling is the honest next answer** —
    don't keep chasing smaller and smaller CSS trims indefinitely; ask
    again rather than silently reversing the user's "keep compacting"
    answer from this round.
- **Layout**: Sheets, Level, and Priority are each their own full-width
  chip-group section, stacked vertically. Question count and the Random
  order toggle are the only pair that share a `.modal-grid-2` row (2
  columns, collapses to 1 under 480px) — they're short single-control
  fields, not chip lists, so pairing them doesn't cause the imbalance
  below. Level/Priority used to be paired side-by-side in a
  `.modal-grid-2` row too, but that broke down once Level had 11 distinct
  values and Priority only 5 (post-bucketing, see below): squeezing Level
  into a half-width column made it wrap to many rows while Priority's
  half sat mostly empty next to it — visually broken, not the "no scroll"
  goal. Full-width stacking lets Level wrap into far fewer rows and
  removes the imbalance entirely. Don't re-pair Level and Priority into a
  shared `.modal-grid-2` row without re-checking this.
  - **Balanced Mix is its own full-width `.modal-section` below the
    Question count/Order grid row, NOT a second toggle stacked inside
    the Order half-column.** It was first added stacked under Random
    order in that half-width column — the same imbalance bug as
    Level/Priority above, just recreated: `Balanced Mix (even split
    across selected sheets)`'s label is far too long for a half-width
    column, so it wrapped awkwardly and looked broken (the user flagged
    this directly: "UI or check box is not proper"). Moved out to its
    own full-width row, same fix pattern as Level/Priority's un-pairing.
    Don't restack a long-label toggle into a half-width grid column
    without checking it actually fits on one line first.
  - **Balanced Mix's section carries its own uppercase `.modal-section-
    label` ("MIX & EXTRAS" — renamed from "MIX" once Prioritize Weak
    Sheets/the scratch box toggle joined it, see below)**, same as
    Sheets/Level/Priority — it was initially
    left without one (Question count/Order's grid row doesn't need one
    per-cell since each already has its own label), which made the whole
    section look like an orphaned checkbox floating in dead space rather
    than a real section, since nothing at the top of that block matched
    the vertical rhythm every other section has. Don't drop this label if
    the section is restyled again.
  - **`.modal-toggle-row input` (both Random order and Balanced Mix) is a
    fully custom-drawn checkbox (`appearance:none`), not left to native
    OS/browser rendering with only `accent-color` set.** `accent-color`
    alone only controls the CHECKED look — the unchecked box's border/
    background still comes from the OS/browser theme, which on some
    Windows+Chrome setups rendered as a solid black square even on this
    app's light theme (a real rendering bug the user hit and screenshotted,
    not hypothetical). Drawing both states in CSS (bordered box unchecked,
    accent-filled with a CSS-drawn checkmark when checked) guarantees the
    same look everywhere and matches the app's rounded/pill visual
    language (§9) instead of an inconsistent native control. Don't revert
    to bare `accent-color` styling on a checkbox without re-testing the
    unchecked state on Windows/Chrome specifically.
- Chips for **Sheets** (`sheet` field, same real tab names as the
  browse-mode selector — not `category`), **Level**, and **Priority** —
  each an **independent selection state**, not the browse-mode filters.
- **The wildcard chip and individual value chips are mutually exclusive by
  default — not "all pre-checked".** `buildChipGroup(container, values,
  allLabel, initialSelected, exclusive)` takes an `exclusive` flag
  (defaults to `true`) — **Interview Mode's Priority group passes
  `exclusive: false`** so `🎲 Random` can be combined freely with any of
  the bucket chips (`Random` + `LinkedIn`, `Random` + `Not Blank`, etc.) —
  the user explicitly asked why they couldn't check "random with linkedin"
  or "just linkedin" etc. together. This is safe because
  `chipGroupSelected()` already returns `null` (no filter) whenever the
  wildcard is lit, *regardless* of which individual chips are also lit —
  `Random` is a superset of every bucket, so combining is harmless, never
  contradictory. Sheets and Level keep `exclusive: true` (the default) —
  don't change their behavior without being asked. `buildChipGroup()`
  returns `{allChip, chips}`.
  By default only `allChip` (labeled "All" for Sheets, "🎲 Random" for
  Level/Priority — see below) shows as selected; the individual value
  chips start visually neutral, even though functionally the group still
  means "include everything" at that point. **Exception: Interview Mode's
  config modal now opens with NOTHING selected in Sheets/Level/Priority
  (`buildChipGroup(..., new Set())`), and Random order unchecked** — user
  must choose everything before starting; no more "just click Start on
  defaults." Browse-mode filter popovers are unchanged (still default to
  wildcard-on). Clicking any individual chip
  turns the wildcard off and toggles just that chip; clicking the wildcard
  always resets the group back to "everything" and clears any individual
  picks. `chipGroupSelected(group)` returns `null` while the wildcard is
  active (meaning "no filter — don't build a Set, just skip this
  dimension's check entirely" — see `buildInterviewPool()`, which treats
  `config.sheets === null` etc. as "any value passes") or an array of the
  manually-picked values otherwise (which can be empty, if the user turned
  the wildcard off and picked nothing — validated as an error before
  starting, same as before).
  - **Why this changed**: the previous version marked every individual
    chip as `selected` (accent-colored) whenever the wildcard was active,
    so opening the modal showed all 16 Sheets chips lit up as if the user
    had manually picked each one — the user asked "why is everything
    selected by default", reasonably reading it as either a bug or
    needless visual noise. The fix keeps the *default behavior* the same
    (no filter, draw from everything) but makes the *visual state* honest:
    only the one wildcard chip is lit when nothing has been manually
    narrowed down. Don't go back to pre-selecting every individual chip.
- **The select-all/wildcard chip's label differs by group on purpose**:
  `buildChipGroup(container, values, allLabel)` takes the label as a
  parameter — Sheets uses `'All'` (picking a literal category), Level and
  Priority use `'🎲 Random'` (the user explicitly asked for a dedicated
  "random" option on these two, since "don't filter by this dimension"
  reads more naturally as "random" than "all" when the dimension is
  level/priority rather than a concrete sheet). Functionally identical
  either way (wildcard chip on = include every value in that group) — only
  the label differs. Don't rename Sheets' chip to "Random" or Level/
  Priority's back to "All" without being asked.
- **Interview Mode's Priority chips are bucketed, not raw values** —
  `PRIORITY_BUCKETS = ['Blank', 'Not Blank', 'LinkedIn', 'Count']`, built
  via `buildChipGroup(els.interviewPriorityList, PRIORITY_BUCKETS, '🎲
  Random')`, and matched with `priorityBucketsFor(q.priority)` in
  `buildInterviewPool()` (a question can match more than one bucket, e.g.
  `"LinkedIn-1"` is both `Not Blank` and `LinkedIn` — included if ANY
  checked bucket matches). **This bucketing is scoped to Interview Mode
  only** — browse mode's Priority filter popover (`FILTER_COLUMNS`/
  `columnFilters`) still shows every raw value as its own chip, unchanged.
  - **Why**: the source Excel's raw `priority` values are noisy —
    `0/1/2/3/4/7` (exact counts) plus case/spelling variants of the same
    real signal (`LinkedIn-1`, `Linkedin-1`, `LinkedIn-2`, `Linkedin-2`).
    Listing all of them as individual Interview Mode chips made the modal
    look broken (a wall of near-duplicate chips). The user explicitly
    chose to leave the raw source data untouched (don't normalize
    `Linkedin-1`→`LinkedIn-1` etc. in `extract_data.py`) and instead fix
    only the Interview Mode selector, since exact counts/spelling aren't
    meaningful for picking a practice set — "has any priority signal at
    all", "was it asked on LinkedIn", and "blank vs not" are. Don't
    collapse/bucket browse mode's raw Priority value list the same way
    unless asked — that filter is meant to show/inspect the real data
    as-is.
  - **One exception, added at explicit request**: browse mode's Priority
    popover gets one extra synthetic chip, **`Non Blank`**
    (`NON_BLANK_PRIORITY` in `index.html`), alongside every real raw
    value — not a replacement for any of them. It isn't a real Excel
    value; matching it is a special case in `applyFilters()`'s
    `matchesCols`: a row matches if its `priority` is non-blank AND `Non
    Blank` is checked, in addition to (not instead of) the normal
    exact-value check — so checking `Non Blank` together with a specific
    value like `LinkedIn-1` still works as an OR, same superset semantics
    as Interview Mode's `Not Blank` bucket. This is the one deliberately
    approved exception to "browse mode's Priority filter shows raw values
    only" above — don't extend the same synthetic-chip treatment to
    Sheet/Topic/Level, or bucket/collapse the rest of Priority's raw
    values, without being asked again.
- **`level` values ARE normalized at extraction time** (`normalize_level()`
  in `extract_data.py`) — unlike Priority (above), the user explicitly
  asked for Level's near-duplicates to be deduped, not just worked around
  in the UI. Only folds unambiguous phrasing/case variants: strips a
  `-Level` suffix (`Mid-Level`→`Mid`, `Junior to Mid-Level`→`Junior to
  Mid`) and normalizes `years`/`year` casing (`5–7 years`→`5–7 Years`).
  Applied to `level + years` **before** they're combined into the stored
  `levelLabel`, so it runs on every future sync, not just once by hand.
  Cut CoreJava/SpringBoot/Microservices from 14 distinct Level values down
  to 11 by normalization alone (926 rows unaffected — merges only touched
  the label, not which rows exist). Left alone as genuinely separate, not
  folded: `General`, `General (3–5 Years)`, `General (5–7 Years)` (years
  info would be lost). A further 3 single-row oddities existed at that
  point — `Fresher (3–5 Years)` (CoreJava srNo 95), `3–5 Years
  (3–5 Years)` and `Performance & Monitoring (3–5 Years)` (SpringBoot
  srNo 124/125) — these looked like real source-data mistakes (wrong text
  in the Excel's Level column), not phrasing variants, so they were NOT
  auto-normalized (per the "ask first" rule below); the user fixed all 3
  directly in the Excel workbook and a re-sync picked up the correction —
  Level was down to 8 distinct values for these 3 sheets at that point
  (later cut further to 6 by the Years-driven rule below, which
  supersedes the Level-column text entirely). If new sheets are synced
  later and this kind of "wrong data
  in the Level column" oddity shows up again, don't silently guess a fix
  — ask the user first, since collapsing it could misrepresent what the
  row actually is (see the "don't fabricate/normalize without asking"
  rule below, which still applies to anything NOT covered by the specific
  fold above).
- **Level is derived entirely from Years — the Excel's Level column text
  is NOT used at all anymore, not even as a fallback.** This is a
  user-specified, fixed mapping (`LEVEL_BANDS` in `extract_data.py`,
  applied via `canonical_level_for_years(years)` — its result becomes
  `level` directly, replacing the old `canonical or level or 'General'`
  fallback chain):
  | Years band | Level name       |
  |------------|------------------|
  | 0–1 Year   | Fresher          |
  | 1–3 Years  | Junior to Mid    |
  | 3–5 Years  | Mid              |
  | 5–7 Years  | Senior           |
  | 7–10 Years | Lead / Architect |
  | *(blank, or outside 0–10)* | `General` |
  `canonical_level_for_years()` parses however many numbers it finds in
  the Years cell (regex, dash/en-dash/spacing-agnostic) — one number
  (`lo == hi`) or two (a range) — then finds which band's `[lo, hi]`
  contains the **midpoint**. This means a Years value that falls BETWEEN
  two of the 5 exact bands (not a perfect match to one) still resolves to
  a real band via its midpoint, rather than falling through to
  `General` — that "in-between years still get a real level, not
  General" behavior was explicitly requested. Only a Years cell with no
  parseable number, or a midpoint outside 0–10 entirely, becomes
  `General`. **The original Level-column text is completely ignored now**
  — not read as a fallback for blank/unparseable Years, not used when it
  contradicts Years. Applied when re-syncing CoreJava/SpringBoot/
  Microservices: no behavior change for this data (all rows already
  cleanly matched one of the 5 bands or had blank Years), confirming the
  stricter rule is safe against the current dataset. Don't add more bands
  to `LEVEL_BANDS` or change the `General` fallback without the user
  specifying the exact name — don't guess one.
- **Level values sort in ascending years order in every chip
  list/filter — not alphabetically.** `LEVEL_SORT_ORDER = ['Fresher',
  'Junior to Mid', 'Mid', 'Senior', 'Lead / Architect', 'General']` in
  `index.html`, matching `LEVEL_BANDS`' order in `extract_data.py`
  (`General` sorts last, since it has no years attached). `uniqueValues()`
  special-cases `key === 'level'` to sort by
  `LEVEL_SORT_ORDER.indexOf(value.split(' (')[0])` instead of the default
  alphabetical `.sort()` used for every other field — this affects the
  browse-mode Level filter popover AND Interview Mode's Level chip list
  (both call `uniqueValues('level')`). A value not in `LEVEL_SORT_ORDER`
  (shouldn't happen given the extraction rule above, but kept as a safety
  net) sorts after all 6 known levels, alphabetically among themselves.
- **Question count** is a free-typed `<input type="text" inputmode=
  "numeric" pattern="[0-9]*" id="interviewCountInput">`, not a dropdown —
  the user explicitly asked why they couldn't type their own number.
  **Plain text, not `type="number"`** — changed after the user asked for
  "textbox only," meaning no native browser spinner (up/down increment)
  UI cluttering a field that's just a 1-4 digit number; `inputmode=
  "numeric"` still brings up a numeric keyboard on mobile, and all actual
  number validation (whole number ≥ 1) already lived in
  `startInterviewFromModal()`'s JS, not in `type="number"`'s native
  behavior, so nothing about validation changed when the type did. **Also
  no longer full-width** — `.count-input{max-width:110px}` overrides
  `.modal-select`'s default `width:100%`, since the user also asked why
  it stretched to the whole grid-column width for a value that's only
  ever a few digits. The now-meaningless `.max` attribute (only had an
  effect on `type="number"`) was removed from
  `populateCountPresets()` along with it. Blank still means "All" matching
  questions functionally, but the field has **no `placeholder` at all
  now** — it went from `All (926)` to a neutral `Number of questions`
  hint to no hint whatsoever, in two steps: the original wording read as
  though the field already had a value/was locked to "All" rather than
  being empty and freely editable, and once that was fixed the user asked
  to drop the placeholder entirely rather than replace it with different
  wording. Don't add a placeholder back to `#interviewCountInput` without
  being asked. Typing a number uses exactly that many
  (validated as a whole number ≥ 1 before starting, error shown inline
  otherwise). **A blank count itself still means "all matching
  questions" everywhere it's actually used (`buildInterviewPool()`,
  `buildBalancedInterviewPool()`, saved presets, "Restart Same
  Session"/"Repeat Same Questions") — only `startInterviewFromModal()`'s
  submit-time validation (below) now refuses to let a fresh modal
  session START with it blank.** Restart/Repeat bypass that validation
  entirely (they relaunch directly off `lastInterviewConfig`, not through
  the modal), so a session that was already running with a blank count
  before this change keeps working exactly as before — this is a gate on
  the Start Interview button, not a change to what blank actually means.
  A `<datalist id="interviewCountPresets">` seeded with the
  old fixed steps (5/10/15/20/25/30/40/50, filtered to those below the
  total) is still wired to the input via `list=`, so the common values
  remain one click away as suggestions in browsers that support datalist
  — but any number can be typed over them. Populated fresh each time the
  modal opens via `populateCountPresets()`, since `allQuestions.length` is
  the ceiling (`max` attribute; no `placeholder` — see above). `.modal-select` (shared
  with this input) must NOT set `cursor:pointer` — that's a leftover from
  when the class styled a `<select>` and made the number input's cursor
  look like a non-interactive picker instead of an I-beam, which read to
  the user as "non-editable". Left as the browser's default input cursor
  now; don't re-add `cursor:pointer` to `.modal-select`.
- **Random order** toggle (checked by default, Fisher–Yates `shuffle()`).
- **Balanced Mix** toggle (`#interviewBalancedMix`, unchecked by default,
  sits right below Random order in the same "Order" `.modal-section`) —
  added at explicit user request to make a multi-sheet session feel like
  a real interview panel's mix (some CoreJava, some SpringBoot, some
  Microservices) instead of skewing toward whichever selected sheet
  happens to have more rows banked (CoreJava at 320 rows vs Coding at
  70, say) — the plain path pools every matching question across all
  selected sheets and shuffles, so a straight random sample naturally
  overrepresents the larger sheet.
  - **When checked, `buildInterviewPool()` routes to
    `buildBalancedInterviewPool()`** instead of the plain pool-then-slice
    path: the requested count is split as evenly as possible ACROSS the
    selected sheets (or all real sheets, if the Sheets wildcard is
    active) first, `Math.floor(count / sheetCount)` each with the
    remainder handed to a **shuffled** subset of sheets (so it's not
    always the same sheets favored by the uneven split) — THEN that many
    questions are picked at random from each sheet's own matching pool
    independently. Level/Priority filtering (`matchesInterviewLevelPriority()`)
    applies identically to both paths.
  - **A sheet with fewer matching questions than its quota just
    contributes what it has** — the total can end up short of the
    requested count rather than over-filling from other sheets, same as
    a real interviewer running out of prepared questions in one area
    rather than padding it from elsewhere. Don't "fix" this by
    redistributing shortfall to other sheets without being asked — it
    was a deliberate simplicity choice, not an oversight.
  - **Balanced Mix only changes WHICH questions are selected, not
    presentation order** — Random order still separately controls
    whether the final list is interleaved (checked) or stays grouped
    sheet-by-sheet, in the shuffled sheet order the quotas were assigned
    in (unchecked). The per-sheet picks themselves are always randomly
    selected from within each sheet regardless of the Random order flag
    — only the plain (non-balanced) path ties "which N are selected" to
    Random order the way §7's slicing note below describes.
  - **With Question count left blank ("All"), Balanced Mix has no
    effect** — every matching question across the selected sheets is
    included either way, so there's nothing to split; don't add special
    handling here, the existing fallback already returns the same result
    set as the plain path in that case.
- **Prioritize Weak Sheets** toggle (`#interviewPrioritizeWeak`, same
  "Mix & Extras" `.modal-section` as Balanced Mix, unchecked by default) — biases
  the per-sheet quota split toward sheets you've drilled LESS in past
  sessions (from the history log, below), instead of an even split.
  Works standalone (checking it alone routes through the same per-sheet-
  quota mechanism as Balanced Mix, `buildInterviewPool()`'s condition is
  `config.balancedMix || config.prioritizeWeak`) — you don't need Balanced
  Mix also checked.
  - **`computeSheetDrillCounts()`** approximates how much each sheet has
    been drilled from `interviewHistory`: a session's config records
    which sheets were CHECKED, not which sheet each individual question
    came from, so each past session's `reachedCount` is split evenly
    across the sheets it drew from (or every real sheet, if that session
    used the Sheets wildcard). Approximate by design, not meant to be
    exact — good enough for biasing a quota.
  - **Weighting is Laplace-smoothed inverse frequency**: `weight = 1 / (1
    + drillCount)`. A never-drilled sheet gets weight 1 (the max); a
    heavily-drilled one approaches 0 but never hits it exactly — so a
    well-drilled sheet can still turn up occasionally rather than being
    excluded outright once practiced.
  - **`allocateWeightedQuotas(weights, totalCount)`** does largest-
    remainder rounding (floor each weighted share, then hand out
    leftover seats to the sheets with the biggest fractional remainder)
    so quotas always sum to exactly `totalCount` instead of drifting from
    repeated floor-rounding. Same shortfall behavior as plain Balanced
    Mix applies: a sheet with fewer matching questions than its quota
    just contributes what it has.
  - Verified against the real dataset with a synthetic drill history
    (CoreJava drilled 35x, SpringBoot 5x, everything else never drilled,
    count=24): CoreJava's quota came back 0, every never-drilled sheet
    got the largest shares, and the total matched exactly 24.
- **Scratch box toggle** (`#interviewScratchToggle`, in "Mix & Extras")
  shows `#iScratchRow` between the question and Reveal Answer, so you
  write your answer first. `interviewAnswers[]` (parallel to
  `interviewQuestions`) persists each question's text across Prev/Next
  instead of clearing it — needed so voice answers/scoring below aren't
  lost on navigation. Still nothing written to `DATA`/`localStorage`.
- **Answer by voice** (`#interviewVoiceAnswer` + `#iMicBtn`,
  `SpeechRecognition`/`webkitSpeechRecognition` — separate Web API from
  Read Aloud's `SpeechSynthesis`, speech IN not OUT). Chrome/Edge only;
  feature-detected via `STT_SUPPORTED`, hidden if unsupported. Needs a
  secure context (https/localhost, not `file://`) — fine on GitHub Pages.
  Transcript streams into the scratch box; forces it visible even if the
  scratch toggle itself is off.
- **Score my answers** (`#interviewScoreAnswers`) — rule-based scoring
  (`scoreInterviewAnswer()`: word-count + keyword-overlap-vs-reference-
  answer + multi-sentence bonus − filler-word penalty, 0–10), NOT AI —
  a static site can't safely call an LLM (no way to hide an API key
  client-side). This is an explicit, deliberate exception to §11's
  "no scoring mechanics" rule, at the user's request — don't extend
  scoring elsewhere (browse mode, etc.) without being asked again. Scored
  on Reveal Answer; completion screen shows an overall average + per-sheet
  breakdown (`renderInterviewCompletionScore()`); **Export .txt**
  (`exportInterviewSessionTxt()`) downloads question + your answer +
  score + reference answer per question, client-side Blob, no server.
  **Bug fixed**: `stopAnswerRecognition()` used to only call `.stop()` and
  rely on the async `onend` to clean up -- navigating to the next question
  before `onend` fired let the old recognizer's `onresult` keep writing
  into the new question's scratch box. Now nulls handlers + `.abort()`s
  synchronously. Also: `revealInterviewAnswer()` now stops the mic (it
  didn't before, so it kept listening after you'd moved on).
  **Toggle labels shortened** (`interviewScoreAnswers`'s used to be 100+
  chars) — detail moved to `title` tooltips instead, since 6 stacked
  toggles in "Mix & Extras" was pushing the modal's height-fit problem
  (above) back open. `#iScratchClearBtn` (🗑️) added next to the mic to
  wipe the scratch box without manual select-all.
- Starting builds the pool (plain, non-balanced path): filter by checked
  sheets/levels/priorities → shuffle if randomized → **then** slice to
  the chosen count (in that order — slicing after shuffling is what
  makes "10 random questions" actually random instead of always the same
  first 10 of the filtered set). An empty resulting pool → inline error
  in the modal, don't start.
- **Question count must be explicitly filled in before starting — a
  blank count no longer counts as a valid default.** This reverses the
  original design, which treated a blank count (meaning "all matching
  questions") as perfectly valid — the user explicitly asked for the
  stricter behavior for Question count specifically.
  - **Sheets/Level/Priority's wildcard chips ("All"/"🎲 Random") are
    NOT included in this — they're still a valid choice, same as
    always.** A stricter version was tried first that also required
    `sheets !== null` etc. (rejecting the wildcard state entirely, not
    just an explicitly-emptied selection), matching a literal reading of
    "every filter must be selected." That immediately confused the user:
    the wildcard chip is **active by default the instant the modal
    opens**, before anyone touches anything, so there's no way to tell
    "I deliberately clicked All" apart from "I never touched it, it's
    still on its default" — both leave the group at `null` and look
    pixel-identical. The user clicked "All", saw it highlighted purple,
    and still got `"Select a Sheet"` — reported as "even if i have
    selected the sheet as ALL why these errors?" Reverted for
    Sheets/Level/Priority: `startInterviewFromModal()` now only flags a
    group as missing if it's an **explicitly emptied** selection
    (`sheets !== null && sheets.length === 0` — the user deliberately
    turned the wildcard off, then deselected every individual chip too),
    not the wildcard state itself. Question count doesn't have this
    ambiguity problem — blank is visibly, unambiguously "nothing typed,"
    with no default-active look-alike state to confuse it with — so its
    stricter check (`countRaw === ''`) stands.
  - Reports every missing field at once, not just the first (not that
    there's normally more than one now, in practice — usually just
    Question count) in a single, plainly-worded error using a natural
    "a, b and c" list (`missing.slice(0, -1).join(', ') + ' and ' +
    missing[last]`), e.g. `'Select a Question count before starting.'`
    An earlier version appended a fixed explanation — `— the "All"/"🎲
    Random" wildcard chip and a blank count no longer count as a
    selection.` — to every message regardless of which fields were
    actually missing, which read oddly and was also simply wrong once
    the wildcard was reinstated as valid. The user asked for the message
    to be "optimized" — the explanation of WHY belongs in this doc, not
    repeated in the UI on every failure.
  - Don't reintroduce "wildcard chip doesn't count" for Sheets/Level/
    Priority without solving the underlying ambiguity first (e.g. actual
    per-group "has the user interacted with this control at all" state
    tracking, not just reading the resulting selection) — the visual
    indistinguishability is the real problem, not something a wording
    change can fix.
  - **None of the "Mix & Extras" checkboxes (Balanced Mix, Prioritize
    Weak Sheets, the scratch box toggle) — or Random order — have any
    validation, and deliberately don't need any.** The user asked why,
    given Sheets/Level/Priority/Count all got validation treatment. The
    answer: a checkbox has exactly two states, checked or unchecked, and
    unchecked is ALWAYS a clear, deliberate-enough "off" — there's no
    ambiguous default-that-looks-like-a-real-choice state the way the
    chip-group wildcard had (above) or a genuinely-empty text field has.
    Unchecked doesn't need to be distinguished from "the user meant to
    check it but didn't get around to it" — it just means "don't use this
    feature," which is a completely valid, self-explanatory choice as-is.
    Adding a "skip this toggle" toggle on top of an already-binary toggle
    would be redundant (a toggle to decide whether the toggle counts) and
    was explicitly considered and rejected when the user raised this.

**Active session** (`#interviewView`):
- Hides the toolbar/status row/table/single view (`applyFilters()`
  restores them on exit — see the bug note below) and shows **one
  question at a time**, on desktop and mobile alike — NOT governed by the
  768px browse-mode breakpoint.
- **No Sr.No shown** — it's browse-mode bookkeeping, not useful mid-quiz.
  Per question: a `.field-inline` row with Sheet/Category/Level tags
  (`#iSheet`/`#iCategory`/`#iLevel`) — Sheet was added alongside the same
  addition to the desktop Details column and mobile field rows (see §6),
  so which sheet a practice question is from is visible here too. Priority
  (`#iPriority`) is deliberately NOT in that row — it sits in its own
  `.q-priority` div directly AFTER the Question section instead (between
  the Question `.field-row` and the Answer `.field-row`/Reveal button),
  same relocation/ordering as desktop/mobile (see §6's Priority note).
- **Question phrasings render as separate stacked lines, not joined with
  "or", in browse mode (desktop table + mobile)**, same as Interview Mode
  (below) — both used to differ on a "Q." label (Interview Mode had one,
  browse mode never did, per explicit user request at the time), but that
  label has since been removed from Interview Mode too (see below), so
  both modes now render plain stacked lines with no prefix label.
  `q.question`/`q.questionPlain` (§3,
  "or"-joined into one string) still exist in `DATA` and are what search
  matches against, but browse mode doesn't render them directly as HTML
  anymore — it renders from `q.questionParts` via the shared helper
  `questionPartsHtml(q)` (defined near `answerHtmlOrPlaceholder`), used
  by `renderTable()` and `renderSingle()`. A single-phrasing question
  (the majority) returns the plain text unwrapped; a multi-phrasing one
  returns `<div class="q-parts"><div class="q-line">...</div>...</div>`
  — plain stacked lines, no "Q." label, no `.q-label` span. **Don't add
  the "Q." label to browse mode** — it was tried and explicitly rejected.
  **`.q-line` (browse mode) is a separate, plainer CSS class from
  `.q-part` (Interview Mode)** — `.q-line` has no font-weight/font-size
  override (`line-height:1.5` only), so it inherits whatever size the
  surrounding cell/field already uses. This was a real bug: browse mode
  first reused Interview Mode's `.q-part` (bold, 1.05rem, meant for its
  large practice card), which made a 2-phrasing row visibly bolder/bigger
  than the 1-phrasing rows next to it in the same table — the user caught
  this as "you changed the font". Don't merge `.q-line` back into
  `.q-part` or apply Interview Mode's font styling to browse mode.
  Interview Mode's own rendering (`renderInterviewQuestion()`) is a
  separate inline `.map()`, still with its own bold/larger `.q-part`
  styling (even for a single phrasing) — that part is unrelated to browse
  mode and unaffected by the note below.
  - **The "Q." label itself was later removed from Interview Mode too**
    (`<span class="q-label">Q.</span>` dropped from the `.map()` above,
    and the now-fully-unused `.q-part .q-label` CSS rule deleted) — the
    user explicitly said they didn't like it, reversing what this section
    used to call "Interview Mode's own established convention." A
    question now renders as plain bold/larger `.q-part` lines with no
    prefix label, in both modes. Don't reintroduce the "Q." label to
    either mode without being asked again.
- Then a **"Reveal Answer" button** (labeled "A:" once revealed) shows the
  Answer — the one deliberate exception to §5's "no click to reveal" rule,
  since reveal-then-check is the actual point of practice mode.
  Previous/Next navigate the pool; Previous disabled on the first question.
- **Read Aloud** (`#iSpeakBtn`, 🔊 icon button in `.interview-topbar`) —
  speaks the current question's `questionPlain` via the browser's
  built-in `SpeechSynthesis` API (`speakCurrentInterviewQuestion()`) —
  no external service, works fine on the static GitHub Pages deploy.
  Manual click/`R` key by default. **`#interviewAutoRead`** (config modal,
  "Mix & Extras") makes it automatic instead — checked in
  `currentSessionMeta.config.autoRead`, fired at the end of
  `renderInterviewQuestion()`. Safe from autoplay blocking either way,
  since speech only ever fires from a click-triggered render (Start/Next/
  Prev), never on page load. `SPEECH_SUPPORTED` feature-checks
  `'speechSynthesis' in window` once at load and hides the button, voice
  picker, and Auto-read checkbox entirely if unsupported, rather than
  showing controls that silently do nothing. Any ongoing speech is
  cancelled (`cancelInterviewSpeech()`) on every question change, reaching
  the completion screen, and `endInterview()` — never lets speech from one
  question keep playing into the next.
  - **Voice picker** (`#iVoiceSelect`, narrow `<select>` next to
    `#iSpeakBtn`, capped `max-width:140px`/`110px` on mobile with
    ellipsis overflow) — `speechSynthesis` doesn't pick a "best" voice on
    its own, it just uses whatever the browser's default happens to be,
    which can be flat/robotic even when nicer installed voices exist
    (Chrome/Edge often ship several "X Online (Natural)"/"Neural"
    voices). Added after the user compared this app's Read Aloud against
    another local project's and found the voice quality worse — turned
    out both use the identical `SpeechSynthesis` API with no third-party
    TTS service involved in either (confirmed by inspecting the other
    project's code — plain `SpeechSynthesisUtterance`, no API key, no
    backend), so the difference was purely which default voice each
    browser session happened to land on, not anything the code
    controlled. This picker fixes that by letting the user choose.
    - **`FAVORITE_VOICE_PATTERNS`** — the user named four specific voices
      they actually like: `Google US English`, `Google UK English
      Female`, `Google UK English Male`, `Google हिन्दी`. Matched by exact
      name (case-insensitive, trimmed) via `favoriteVoiceRank()` — returns
      the pattern's index (stable preferred order) or `-1` (not a
      favorite). Don't reorder `FAVORITE_VOICE_PATTERNS` or add more
      entries without being asked — this list is exactly what the user
      said they like, not a general "good voices" heuristic.
    - **`populateVoiceSelect()`'s dropdown shows ONLY these favorites,
      not the full installed voice list** — filters `speechSynthesis.
      getVoices()` down to whichever favorites are actually installed,
      sorted into the declared preferred order (`Google US English`
      first, so it's the auto-picked default when available). This is a
      deliberate reversal of an earlier version that sorted favorites to
      the top of the FULL list — the user explicitly asked to remove
      everything except their favorites, not just deprioritize the rest.
      **Fallback**: if NONE of the four favorites are installed on this
      browser/OS (e.g. a browser without Chrome's Google voices), the
      dropdown falls back to the full list via `generalVoiceSort()`
      (English-first, then `voiceQualityScore()` — same heuristic as
      before) rather than leaving Read Aloud with an empty, unusable
      dropdown. Verified both paths against mock voice data: favorites
      present → only those 4 shown, in declared order; favorites absent
      → full fallback list shown, sorted by the general heuristic.
    - **Async voice loading**: some browsers (Chrome notably) return `[]`
      from `getVoices()` on the very first call, populating the real
      list asynchronously — `populateVoiceSelect()` is called once at
      load AND wired to `speechSynthesis.onvoiceschanged`, safe to run
      more than once.
    - **Persisted via `localStorage`** (`interviewVoiceURI` key, matched
      by `voiceURI` not name/index, since voice lists can reorder between
      sessions) — set on the select's `change` event, read back by
      `populateVoiceSelect()` on the next load if that voice is still
      available, otherwise falls through to the auto-picked default.
      `try/catch`-wrapped, same defensive pattern as every other
      `localStorage` use in this app.
    - Hidden entirely alongside `#iSpeakBtn` when `!SPEECH_SUPPORTED`.
- **Focus Mode** (`#iFocusBtn`, 🧘 icon button next to Read Aloud,
  `toggleFocusMode()`/`disableFocusMode()`) — adds a `focus-mode` class to
  `<body>` that dims the header (opacity, restored on hover) and enlarges
  the question/answer text, for a less browsing-app, more immersive
  session. **Deliberately does NOT hide the header or mode-toggle** — §5's
  "Normal (browse) mode and Interview Mode are always both reachable, the
  header is never hidden" rule still applies; dimming (not hiding) is
  what keeps this compliant while still reducing visual clutter. Reset by
  `endInterview()` (`disableFocusMode()`) so it doesn't leak into browse
  mode after a session ends.
- **Timer**: `#interviewTimer` shows elapsed `MM:SS`, starting the instant
  `launchInterview()` runs (`startInterviewTimer()` — `setInterval` every
  1s off a `Date.now()` start timestamp) so the user can gauge real
  interview pacing ("how many questions in X minutes"). Stops
  (`stopInterviewTimer()`) on reaching the completion state and on
  `endInterview()`; restarts fresh on "Restart Same Session" (it re-runs
  `launchInterview()`). This is a pacing aid only — not a per-question
  score, not stored/exported anywhere; see the "no quiz mechanics" rule
  below.
- Reaching Next past the last question shows a completion state with
  **three** actions — not a score/pass-fail result:
  - **"Exit to Browse"** returns to browse mode.
  - **"Restart Same Session"** re-runs `buildInterviewPool()` on the same
    config — a fresh draw (reshuffles/re-picks if randomize/Balanced
    Mix/Prioritize Weak Sheets were on), not the same questions.
  - **"Repeat Same Questions"** (`repeatInterviewSession()`, added at
    explicit request) instead relaunches with the EXACT array just
    finished — `interviewQuestions.slice()`, same questions, same order,
    no rebuild — for drilling one specific set to mastery rather than
    always getting a new pull. Both call `launchInterview()`, which
    already finalizes the outgoing session into history before starting
    the new one (see below) — no special-casing needed for either button.
- "End Interview" / "Exit to Browse" both return to browse mode via
  `applyFilters()`.
- **Known bug, fixed**: `endInterview()` must explicitly reset
  `els.tableView.style.display = ''` and `els.singleView.style.display =
  ''` before/with calling `applyFilters()`. `launchInterview()` sets those
  to inline `display:none`, which overrides the CSS media-query rules that
  normally control browse-view visibility — without the reset, browse mode
  stays permanently hidden after the first Interview Mode session ends.
  Don't drop this reset if `endInterview`/`launchInterview` are touched.
- **Keyboard shortcuts during an active session**: Space or Enter reveals
  the answer if hidden, or advances to the next question if already
  revealed (mirrors a flashcard app's pacing — one key to check, press
  again to move on); ←/→ are Previous/Next directly; **`R` triggers Read
  Aloud** (`speakCurrentInterviewQuestion()`, same as clicking `#iSpeakBtn`
  — added after the user asked why the other actions had shortcuts but
  Read Aloud didn't; `#iSpeakBtn`'s `title` was updated to `"Read question
  aloud (R)"` so the shortcut is discoverable from the button itself, not
  just this doc). Scoped to when `#interviewView` is visible AND the
  question card (not the completion screen) is showing, and ignored while
  an `<input>`/`<textarea>` has focus so it never steals keystrokes from a
  field elsewhere on the page (this is also what keeps `R` from firing
  while typing in the scratch box). A single `document` `keydown`
  listener, not per-element — added at explicit request to make a session
  feel closer to real interview pacing (not reaching for the mouse
  between every question).
- **Interview session history** (`#historyModal`, opened via the header's
  🕘 History button, always visible alongside the mode toggle/theme
  button): a per-browser `localStorage` log (`interviewHistory` key,
  capped to the newest 50) of past sessions — date, the Sheets/Level/
  Priority/Balanced Mix/Random order config used, how many questions were
  reached vs. the pool size, and how long it took. **This is a log that a
  session happened, NOT scoring or correctness tracking** — no right/
  wrong, no pass/fail, consistent with §11's "no quiz mechanics" rule;
  it's the same spirit as the pacing timer already shown mid-session.
  - `currentSessionMeta` is set by `launchInterview()` (start time +
    `lastInterviewConfig` + pool size) and finalized/recorded by
    `finalizeInterviewSession()`, called from three places so a session
    is recorded exactly once however it ends: reaching the last question
    (`interviewNext()`'s completion branch), `endInterview()` (guarded —
    a no-op if already finalized, e.g. "Exit to Browse" after
    completion), and the top of `launchInterview()` itself (finalizes
    whatever was running before — covers "Restart Same Session", which
    calls `launchInterview()` again without going through `endInterview()`
    first).
  - `localStorage` reads/writes are wrapped in `try/catch` throughout
    (`loadInterviewHistory`/`saveInterviewHistory`/`clearInterviewHistory`)
    — history is a convenience, a private-mode/quota failure should never
    block the app, same defensive pattern as the theme toggle's
    `localStorage` use (§8).
  - "Clear History" wipes the whole log (no per-entry delete) — simple on
    purpose, don't add per-entry deletion without being asked.
  - Each history card has a **"Use this config again"** button
    (`reuseHistoryConfig()`) — re-opens the config modal pre-filled from
    that session (via `applyInterviewPreset()`), doesn't auto-start.
    History doesn't store the originally-typed count, so `totalQuestions`
    (actual delivered pool size) stands in for it.
- **Live feedback while configuring** (`updateInterviewLiveFeedback()`,
  fired on any chip click or count input via event delegation): shows
  "N questions match your filters" near Question count, and marks
  (`.needs-input`, red label) whichever of Sheets/Level/Priority/Count
  still needs input, using the same "missing" rule as
  `startInterviewFromModal()`'s validation. Doesn't replace that
  validation — just surfaces it earlier. Also disables `#interviewStartBtn`
  until everything's filled (`.btn:disabled` styling already existed).
- **Presets row has a "Start" button** (`#interviewPresetStartBtn`) —
  loads the selected preset and immediately calls
  `startInterviewFromModal()`, skipping the extra click. No-op if no
  preset is picked.
- **History entries have a "Delete" button** too, not just "Clear
  History" — `deleteHistoryEntry(index)` removes one entry and
  re-renders.

This is the one sanctioned exception to "no quiz mechanics" (§11) — a
practice/reveal/pacing flow, not scoring. The timer is about pacing
awareness, not performance tracking. Don't add points, correctness
tracking, or pass/fail results unless asked. (History, above, doesn't
violate this either — it logs that/when/what, never right-vs-wrong.)

## 8. Dark / light theme

- Theme toggle button (🌙 / ☀️) in the header.
- Preference persists via `localStorage.setItem('theme', ...)`.
- On load: saved preference if present, else `prefers-color-scheme`.
  Applied via a small **synchronous inline `<script>` in `<head>`**,
  before the stylesheet paints, to avoid a light/dark flash. Don't move
  this to the bottom of `<body>`.
- All colors are CSS custom properties on `:root` and
  `:root[data-theme="light"]`. Never hardcode a color in component CSS —
  add/reuse a variable so both themes stay in sync.
- Toggling must work standalone (flips the DOM attribute + icon) even if
  `localStorage` throws — wrapped in `try/catch`, never blocks the toggle.
- **Dark palette was tried as a richer, purple-tinted "modern SaaS" look,
  then reverted** — the user asked for dark mode to feel more modern,
  this direction was picked over a near-black/OLED option and a smaller
  polish-only pass, implemented (deeper background gradient, bluer/richer
  surfaces, brighter accent, purple-tinted border/shadow glow, plus a
  `.chip:hover` background-tint change that applied in both themes), and
  then the user said **"dark mode i dont like it"** — reverted all of it
  back to the original values below in the same conversation. Don't
  re-attempt a dark-mode palette overhaul from scratch without asking
  first; if dark mode comes up again, ask what specifically feels dated
  rather than proposing a full repaint.

## 9. Visual style: "Clean & minimal"

Chosen direction (over "Bold & colorful" and "Dense & professional"):

- Inter font (Google Fonts, system-font fallback stack).
- Soft `box-shadow` elevation instead of heavy borders.
- Rounded corners (~12–16px cards, ~999px pills/tags).
- Color-coded tag badges — Sheet (blue), Category (violet), Level (teal),
  Priority (amber) — as `.tag-sheet`/`.tag-category`/`.tag-level`/
  `.tag-priority`, theme-aware variables. Keep this mapping for new
  fields/tags. **There is no Sr.No tag anymore** (`.tag-srno` and its
  `--tag-sr-bg`/`--tag-sr-fg` tokens were removed — see §6, Sr.No isn't
  displayed anywhere in browse mode).
- Buttons: solid accent-filled primary, transparent-bordered "ghost"
  secondary, subtle hover/press motion.
- Don't switch styles without the user explicitly asking for a change.

## 10. Deployment target: GitHub Pages (the actual product)

- This is not a local tool — **GitHub Pages is where the user actually
  uses this app**, on both desktop and mobile, to revise/read/run
  Interview Mode without the Excel file in hand (§0). Every decision above
  should keep working identically there.
- Case-sensitive Linux filesystem — keep filenames' case consistent
  between code references and actual files on disk.
- Data is embedded (§1), so `index.html` works even opened directly via
  double-click. A local server is still worth using for anything
  path-sensitive.
- GitHub Pages' CDN and browsers cache aggressively. If a change doesn't
  seem to take effect after deploying, that's most likely stale cache —
  verify via "View Page Source" on the live URL before assuming the code
  is wrong.
- **`.gitignore` excludes `*.xlsx` (the source workbook) by default** —
  not needed by the deployed site (data is embedded directly in
  `index.html`, §1) and may still carry the excluded HR sheet's personal
  content in the raw file even though `extract_data.py` never reads it
  into `DATA` — don't want that ending up in a public repo's git history.
  If the user wants the workbook tracked somewhere, that's a separate,
  explicit decision, not the default. Also ignored: `*.bak` (the
  timestamped safety backups every sync/remove/clear/restore script
  writes into `bkp/` before overwriting `index.html`, keeping only the
  newest 5 — §12; the `*.bak` pattern already covers the whole `bkp/`
  folder, no separate line needed), `extracted_questions.json` (only
  survives a failed sync run), Python's `__pycache__/`, and common OS/
  editor cruft.

## 11. General change discipline

- Don't add scoring mechanics (points, correct/incorrect tracking,
  pass/fail results) anywhere — browse mode is a pure reference tool,
  Interview Mode (§7) is reveal-based practice, not a quiz. **Exception**:
  §7's opt-in "Score my answers" rule-based scoring — explicit user
  request, not a green light to add scoring anywhere else.
- Don't add more question data beyond what's actually in the source Excel
  without being asked, and never fabricate Q&A content (§3).
- **Currently 1029 questions across 5 sheets (CoreJava, SpringBoot,
  Microservices, Coding, HR) at full row count — the other 12 sheets
  are not yet in `DATA` on purpose.** The user adds sheets deliberately,
  one selective sync at a time — do not treat "test it", "fix bugs", or
  "enhance the UI" as an implicit green light to expand `DATA`. Only add
  more sheets/rows when the user explicitly asks (see SYNC_EXCEL.md §2b
  for the selective-sheet procedure, §2 for a full sync).
- Known source-data quirk, not a bug, left as-is: the `Junit` sheet's
  `level` values use a plain hyphen (`"Fresher (0-1 Year)"`) while other
  sheets use an en-dash (`"Fresher (0–1 Year)"`) — this is a real
  inconsistency in the Excel workbook itself, so it shows as two separate
  entries in the Level filter/Interview Mode checklist. Don't silently
  normalize this in code without asking — it's a data question, not a
  rendering bug.
- When extracting more rows, map columns by header name per sheet (§3),
  preserve rich text (§4), and join — never split — multi-line Question
  cells.
- Any new UI control should follow the existing patterns (pill/checkbox
  filters with "Select All" for fixed value sets, plain inputs for free
  text, CSS variables for all colors) rather than a new one-off style.
- `extracted_questions.json` (the intermediate dump `extract_data.py`
  writes) is ephemeral — delete it after splicing into `index.html`. The
  script itself is **not** ephemeral anymore — see §12.
- **Every interactive `input()` prompt across the sync scripts
  (`add_sheets_menu.py`, `edit_config.py`, `clear_data.py`,
  `smart_sync.py`'s removal-confirmation prompt) is wrapped to handle
  `EOFError`/`KeyboardInterrupt` gracefully** — a real user hitting Ctrl+C
  mid-prompt (confirmed via `manage.bat` during development — the
  workbook's rich-text `openpyxl` parse was mid-flight and the interrupt
  surfaced as a raw traceback) now gets a clean "Cancelled" message and a
  normal exit instead of a scary traceback. Destructive-prompt scripts
  (`clear_data.py`, `smart_sync.py`'s removal step) treat an interrupt the
  same as any non-`Y` confirmation input — safest default, nothing gets
  removed. If a new interactive prompt is added to any script, wrap it the
  same way.
- **All confirmation prompts across the sync scripts use a plain `Y/N`
  answer** (`clear_data.py`, `smart_sync.py`'s removal step,
  `remove_sheet.py`, `restore_backup.py`) — not a typed phrase. Anything
  other than `y`/`Y` is treated as "no", including a blank answer or an
  interrupt. This was a deliberate choice to relax the friction on every
  destructive/overwriting prompt in the project (an earlier version of
  `clear_data.py` and `smart_sync.py` required typing an exact phrase like
  `CLEAR ALL DATA` — don't reintroduce that unless the user asks for it
  back). If a new destructive prompt is added to any script, use `Y/N` the
  same way.
- **Defensive robustness fixes applied from a code-review pass
  (`Fix.txt`)**, kept as standing practice:
  - Search (`applyFilters`) reads `(q.questionPlain || '')`/
    `(q.answerPlain || '')` before `.toLowerCase()`, not the bare field —
    `extract_data.py` always populates both, but a guard costs nothing
    and prevents a crash if `DATA` is ever hand-edited against the rules.
  - `restartInterviewSession()` checks `pool.length === 0` before calling
    `launchInterview()`, same guard `startInterviewFromModal()` already
    had — currently unreachable (the same config already produced a
    non-empty pool once, and `DATA` doesn't change mid-session) but kept
    for defense-in-depth against `renderInterviewQuestion()` crashing on
    an undefined question.
  - `interviewAnswerShown` was removed — it was set in two places
    (`renderInterviewQuestion`/`revealInterviewAnswer`) but never read
    anywhere, genuinely dead state. Don't reintroduce it unless something
    actually needs to branch on whether the answer is currently shown.
  - `Fix.txt`'s "raw `innerHTML` — XSS risk" item was reviewed and
    deliberately NOT changed: `question`/`answer`/`questionParts` render
    via `.innerHTML` on purpose (rich-text formatting is a required
    feature, §4), but `extract_data.py`'s `run_to_html()` HTML-escapes
    every Excel cell's text before wrapping it in the safe tags it
    generates itself — the data only ever comes from the user's own local
    Excel file, never external/user input. Don't "fix" this by switching
    to `.textContent` — that would break rich-text rendering, which is a
    deliberate feature, not the bug being described.

## 12. Excel → index.html sync workflow

**Runnable procedure: [SYNC_EXCEL.md](SYNC_EXCEL.md)** — when the user asks
to sync/regenerate from Excel ("run SYNC_EXCEL.md" or equivalent), follow
that file's steps exactly rather than improvising the procedure from
memory. It encodes the same rules as this section plus the concrete
step-by-step (including pulling the *full* dataset, not the testing-phase
sample — see §11). This section explains *why*; SYNC_EXCEL.md is *how*.

**The rule: `index.html`'s `DATA` array is a generated build artifact.
The `.xlsx` workbook is the single source of truth. Never hand-edit `DATA`
directly in `index.html` — any content fix/addition happens in Excel, then
gets regenerated.** This is deliberate, and it's what makes future re-syncs
safe:

- Because `DATA` is never hand-edited, regenerating it is always a **plain
  full overwrite** of that one array — no diffing/merging logic is needed
  or wanted, because there is nothing hand-written in `DATA` that could
  ever be lost by overwriting it. If `DATA` ever *did* contain a hand
  edit made directly in `index.html`, overwriting would silently discard
  it — which is exactly why hand-editing `DATA` is off-limits in the first
  place, not a hypothetical to design around.
- **Project hierarchy**: `index.html` MUST stay at the repo root — GitHub
  Pages (§10) only serves from the root or a `/docs` folder without extra
  config, and this project has no build step to work around that. The
  sync scripts live in `scripts/` (`extract_data.py`, `add_sheets.py`,
  `smart_sync.py`, `clear_data.py`, `remove_sheet.py`, plus
  `add_sheets_menu.py`/`list_sheets.py`/`verify_index.py`/`edit_config.py`/
  `check_stale.py`/`restore_backup.py` — see the full script rundown
  below); backups land in a `bkp/` folder alongside `scripts/` at the repo
  root (git-ignored, §10), not tracked; the detailed docs live in `docs/`
  (`RULES.md` — this file — and `SYNC_EXCEL.md`). `README.md`, `CLAUDE.md`,
  `.gitignore`, and the `.xlsx` workbook stay at the root alongside
  `index.html`. Every script resolves paths off `PROJECT_ROOT =
  os.path.dirname(os.path.dirname(os.path.abspath(__file__)))` (its own
  file location, not the caller's cwd) — so `python scripts/extract_data.py`
  works correctly whether it's run from the repo root, from inside
  `scripts/`, or via an absolute path from anywhere else. Don't add a
  script that assumes cwd == repo root; resolve off `__file__` like the
  existing ones do.
- `extract_data.py` (kept permanently in `scripts/`, not deleted after
  use — an earlier version of this rule said to delete it, which was
  wrong once "re-sync when the Excel changes" became a real recurring
  need) is the one authoritative extraction pipeline: reads the `.xlsx`
  with `openpyxl(rich_text=True)`, applies every rule in §3/§4 (column
  mapping by header name per sheet, rich-text preservation, one-Excel-row-
  one-entry with `questionParts` for alternate phrasings, the row cap from
  `config.json`), and **writes the result straight into
  `index.html`'s `var DATA = [ ... ];` array itself** (full overwrite of
  just that array, via `splice_into_index_html()`).
- **The workbook filename is NOT hardcoded** — `find_workbook()` auto-
  detects whatever single `.xlsx` file is sitting in `PROJECT_ROOT`
  (Excel's own `~$...xlsx` temp lock files are ignored, not counted).
  Raises and refuses to run if there are zero or more than one real
  `.xlsx` files, listing them by name rather than guessing which one to
  use. The user explicitly asked for this — don't reintroduce a fixed
  `WORKBOOK = '<filename>'` constant; if the workbook needs renaming or
  replacing, that's just a file swap in the project root, no code change
  needed.
- **`extract_data.py` is fully standalone — `python scripts/extract_data.py`
  is the entire sync, no other tool needed.** This changed from an
  earlier design where the script only wrote `extracted_questions.json`
  and a human (or Claude) did the splice into `index.html` by hand as a
  separate reviewed step — the user explicitly asked whether this would
  work without Claude at all, so the splice was moved into the script
  itself. Before overwriting, it backs up the current `index.html` into
  `bkp/` as a timestamped `index.html.<timestamp>.bak`, pruning to keep
  only the newest 5 (`BACKUPS_TO_KEEP` in `extract_data.py`) — restore via
  `restore_backup.py`'s numbered picker (or manage.bat option 11), or by
  copying the right file back over `index.html` by hand. This replaced an
  earlier single always-overwritten `index.html.bak` — the user pointed
  out that a run several syncs ago was unrecoverable once a later run
  clobbered the one backup slot; keeping the last 5 means a bad run
  doesn't have to be caught immediately to still be undoable. If
  `var DATA = [ ... ];` can't be found in `index.html` at all, it raises
  and writes nothing rather than guessing where to put the data.
  `extracted_questions.json` is written mid-run as
  a debugging intermediate but auto-deleted after a successful splice —
  it only survives if the splice step itself failed, for troubleshooting.
- **To re-sync after the Excel changes**: just run `python
  scripts/extract_data.py`. After it finishes: re-run the verification
  steps from §11 (JS syntax check, `getElementById`/`id=` cross-check, a
  live serve
  check) before considering the sync done — the script writing
  successfully doesn't by itself prove the result is correct. (Or use
  `manage.bat` option 5 (Full Resync), which chains straight into
  `verify_index.py` automatically.)
- **`extract_data.py` has NO hardcoded sheet list anymore.** Originally a
  module-level `SHEETS = ['CoreJava', 'SpringBoot', 'Microservices']`
  constant controlled a plain run's scope, requiring a manual code edit
  every time a sheet was added (a real, confirmed footgun: `add_sheets.py`
  deliberately never touched `SHEETS`, so a later plain `extract_data.py`
  run would have silently dropped whatever `add_sheets.py` had added,
  since a run is a full overwrite of `DATA`). Replaced after the user
  asked for the project's tooling to be data-driven/configurable instead
  of hardcoded: `extract()` with no `sheets` argument now derives the
  default from `sorted(set(q['sheet'] for q in read_current_data()))` —
  i.e. **a plain run always mirrors whatever sheets are currently embedded
  in `index.html`**, so it can never go stale against a constant someone
  forgot to update. To target something else (add/drop a sheet for one
  run), pass sheet names as CLI args instead — `extract(sheets=[...])`
  already supported this for other scripts to call programmatically; the
  `__main__` block now also reads `sys.argv[1:]` and passes it through
  when present (`python scripts/extract_data.py CoreJava SpringBoot`).
  Don't reintroduce a hardcoded `SHEETS` constant — if a script needs an
  explicit sheet set, it should derive it from live workbook/DATA state or
  accept it as an argument, not embed it in source.
- **Row cap (full dataset vs. sampled/testing) is configurable, not a
  hardcoded constant.** `config.json` at the repo root (loaded via
  `scripts/config.py`'s `load_config()`, which falls back to sane
  defaults if the file is missing/malformed/missing a key — this is
  convenience config, not something that should ever block a script from
  running) holds `"rows_per_sheet"`: `null` for the full dataset, an
  integer for a sampled/testing cap. `extract_data.py` reads
  `ROWS_PER_SHEET = cfg.load_config()['rows_per_sheet']` at import time
  instead of hardcoding the value. Currently `null` (full dataset; was a
  hardcoded `10` during the early UI-iteration/testing-phase, §11, before
  the user asked for the real CoreJava/SpringBoot/Microservices data).
  Only go back to a sampled cap if the user explicitly asks to.
- **`config.json`/`scripts/config.py` is the one shared place for
  project-wide settings** — currently `server_port` (used by
  `scripts/serve.py`, see below) and `rows_per_sheet`. `DEFAULTS` in
  `config.py` documents/enforces the known keys; unknown keys in
  `config.json` are silently ignored rather than erroring (forward
  compatible, not strict-schema). If a future setting needs to be
  configurable rather than hardcoded, add it here rather than as a new
  constant in some other script.
- This workflow is also how `questionParts`/rich-text/etc. formatting
  bugs get fixed going forward: fix the extraction logic in
  `extract_data.py`, re-run, re-splice — not by hand-patching individual
  entries inside `index.html`'s `DATA` array.
- **Three additional standalone scripts exist for common maintenance
  tasks the user can run without Claude**, all built on top of
  `extract_data.py`'s `extract()`/`read_current_data()`/
  `splice_into_index_html()` (no duplicated extraction logic):
  - **`clear_data.py`** — wipes `DATA` to `[]`. Destructive; requires a
    `Y/N` confirmation before writing anything. Backs up `index.html`
    first, same as every script here.
  - **`add_sheets.py <Sheet> [<Sheet> ...]`** (or `--all` for every real
    tab **read live from the workbook** — `list(ed.wb.sheetnames)`, not a
    hardcoded list; previously resolved via a curated `ed.ALL_KNOWN_SHEETS`
    constant that had to be hand-updated whenever the workbook's tabs
    changed, replaced for the same data-driven/configurable reasoning as
    `extract_data.py`'s `SHEETS` above; `HR` was also filtered out of this
    list by name until the user explicitly asked for it to be included —
    see the HR note in §3) — adds sheets that AREN'T already in `DATA`;
    any requested sheet that's already present is skipped and left completely
    untouched, never re-extracted or overwritten. Always pulls the full
    row count for whatever it adds. This is what makes "add a sheet"
    additive without needing separate merge logic in `extract_data.py`
    itself. An unrecognized name (checked against the live workbook tab
    list now, not a possibly-stale constant) still gets a warning and
    still gets attempted, in case of a legitimate off-list rename.
  - **`smart_sync.py [--yes]`** — re-checks every sheet ALREADY in `DATA`
    against the current Excel, field by field (`srNo`, `category`,
    `level`, `question`/`questionParts` incl. rich-text HTML, `answer`
    incl. rich-text HTML, `priority`) — not a blind full overwrite. Rows
    are matched between old and fresh extractions by `(sheet,
    questionPlain, occurrence)` — **NOT Sr.No.** Sr.No was tried first and
    rejected: it's often the positional fallback (assigned by row order
    when the Excel cell is blank), so deleting or inserting just ONE row
    anywhere in a sheet shifts every row after it, which made the ENTIRE
    rest of the sheet misreport as "removed + added" instead of
    "unchanged" — the user caught this exact scenario ("Sr.No may change
    if I remove one question from the list"). A question's own text is a
    much more stable identity — it only stops matching when the question
    is actually reworded, a rarer and more deliberate edit than "some
    unrelated row moved." `srNo` is now IN `FIELDS_TO_COMPARE` instead (a
    Sr.No renumbering with no text change now correctly shows as a normal
    field change, not a false removal). A per-occurrence counter still
    disambiguates the rare case of duplicate question text within one
    sheet (plain `(sheet, srNo)` had the same duplicate problem before —
    confirmed 18 real Sr.No collisions in SpringBoot during testing — and
    `(sheet, questionPlain)` can in principle collide too, so the
    occurrence counter is kept either way). Verified directly: a
    synthetic 5-row sheet with row 3 deleted correctly reports 1 removed
    (row 3) and 2 changed-by-`srNo`-only (rows 4/5, renumbered down) —
    not 3 rows misreported as removed+added. Unchanged rows are left
    alone; changed rows (any field, formatting included, since formatting
    differences already show up as literal HTML string differences — no
    separate "check boldness" logic needed) are replaced; rows newly
    present in Excel are added automatically; rows whose question text no
    longer exists anywhere in Excel are reported but only removed with
    explicit confirmation (typed phrase, or `--yes` for non-interactive
    runs) — additions/changes are safe to apply automatically, deletions
    are not.
  - All three were tested end-to-end in an isolated sandbox copy (not the
    real `index.html`) before being confirmed working: confirm-phrase
    reject/accept paths, already-present-sheet skip, new-sheet add,
    tampered-field detection and correction, and the duplicate-Sr.No key
    bug above (caught during testing — an early version silently dropped
    18 rows from the diff before occurrence-based keys were added).
- **`verify_index.py`** — a 5th standalone script, but NOT part of the
  Excel-sync family above (it never touches `DATA`/`index.html`, read-only
  throughout). Automates the post-change verification checks from §11/
  SYNC_EXCEL.md §5 that were previously done by hand each time: both
  inline `<script>` blocks parse (`node --check`), every
  `getElementById('...')` call has a matching `id="..."`, and a data
  sanity pass (total + per-sheet counts, at least one rich-text sample, at
  least one multi-phrasing sample). Requires `node` on PATH for the syntax
  check. Run standalone (`python scripts/verify_index.py`) or via
  `manage.bat` option 7 — run it after any manual edit to `index.html` as
  a quick sanity pass, though it doesn't replace judgment (it can't catch
  a rendering/behavior regression, only structural/data breakage).
  **No longer hard-checks HR == 0** — that check predated the user's
  explicit decision to include HR (§3's HR note) and was removed once
  noticed contradicting that decision; HR is a normal sheet like any
  other now.
  **Supports `--quiet`/`-q`**: on success, collapses the normal 3-section,
  ~20-line breakdown into one summary line (`Verify: OK -- syntax OK, ids
  55/55, 1029 questions across 5 sheet(s).`); on failure, still prints
  full detail for whatever failed (never hides a real problem, only
  compresses the passing case). Added after the user said the auto-chained
  verify output (after every Smart Sync/Add Sheet/Full Resync/Remove
  Sheet) made `manage.bat` "not properly readable" and asked for concise
  logs — `manage.bat`'s auto-chained calls use `--quiet`; the standalone
  Verify menu option (7) still calls it without the flag, since choosing
  that option IS explicitly asking for the full detail.
  **`smart_sync.py` and `extract_data.py` gained the same `--quiet` flag**
  after a follow-up "reduce the logs more, for the WHOLE manage.bat" ask —
  same principle: `--quiet` drops decorative/after-the-fact detail
  (`smart_sync.py`: the per-sheet Excel row-count listing, the itemized
  "changed rows" listing; `extract_data.py`: the JSON per-sheet dump) down
  to one summary line each (`Smart Sync: OK -- 997 questions, already in
  sync.` / `Full Resync: OK -- 997 questions across 4 sheet(s) (...).`),
  but never hides anything decision-critical — `smart_sync.py`'s
  removed-rows listing (what you're being asked to confirm or decline)
  always prints in full regardless of the flag. `manage.bat` passes
  `--quiet` to both when auto-chaining them. A full Smart Sync run through
  the menu went from ~20 lines to 4. If a new sync script needs the same
  treatment, follow this pattern: full detail by default, `--quiet` for
  one summary line on the boring/no-op case, full detail always for
  anything the user has to make a decision about.
- **`list_sheets.py`** — a 6th standalone script, also read-only (reads the
  workbook's real tab names via the already-loaded `extract_data.wb` plus
  `read_current_data()`; never writes anything). **Lists every real tab
  straight from the workbook itself (`wb.sheetnames`) — no curated/
  hardcoded sheet list involved at all** — so a brand-new Excel tab shows
  up immediately as a normal, addable row, and
  every sheet it lists is already addable via `add_sheets.py` (which also
  now checks unrecognized names against the live workbook, not a
  constant — see above). Each row shows sync status (`synced` + row
  count, or `NOT synced`) — `HR` included, since the user asked for it to
  stop being specially hidden here too (see §3's HR note). This exists so
  `manage.bat`'s Add Sheet option can show real sheet names instead of
  requiring the user to type one blind. Was originally filtered through a
  curated `ALL_KNOWN_SHEETS`
  constant (only showing catalogued sheets, with anything else pushed
  into a separate footnote) — changed after the user asked "can't it
  identify all sheets from Excel" and, pointedly, two real tabs (`DevOps`,
  `Caching`) turned up hidden in that footnote instead of the main list.
  §3's sheet catalog is now purely descriptive prose (what's been synced
  and why), not a data source any script depends on — don't reintroduce a
  hardcoded sheet-name constant that any script reads from.
  - **Also shows an "Answered" column** per synced sheet — `count / total
    (pct%)`, using the same has-an-answer-or-not test as the app's
    Answer filter and `answerHtmlOrPlaceholder()`'s placeholder
    (`(q.get('answerPlain') or '').strip()` truthy or not) — plus one
    "Total answered" summary line across every synced sheet. Added so
    Data Summary answers "where does Excel still need answers written
    in," not just "which sheets/rows exist." Excel-source completeness,
    not a quality/correctness judgment on the answers that do exist.
- **`add_sheets_menu.py`** — a 7th standalone script, the interactive
  counterpart to `add_sheets.py`'s CLI form. Lists synced sheets (with row
  counts) plus a **numbered** list of not-yet-synced sheets, and takes the
  user's pick as number(s) (or `all`) instead of typed exact tab names.
  Exists because several real tab names carry easy-to-mistype punctuation
  (`Adv. Java`, `Spring Frmwrk`, `Spring Sec.`) — the user asked "what if
  someone wrongly types a name, can't we use a key/value pick instead?"
  `HR` is included in this numbered list (see §3's HR note — it was
  excluded here by name until the user explicitly asked otherwise). A bad
  number (out of range, non-numeric) is rejected outright with nothing
  extracted, rather than being passed through to
  `extract_data.py`'s `wb[sheet]` lookup as a literal (which would raise
  a `KeyError`/crash instead of a clean rejection). Shares the same
  extract-and-splice primitives as `add_sheets.py` (`ed.extract()` +
  `ed.splice_into_index_html()`) rather than duplicating logic — it's a
  different front-end onto the same add operation, not a separate
  mechanism. `manage.bat`'s Add Sheet option (3) calls this instead of the
  old two-step (`list_sheets.py` then a free-text `set /p`) — `add_sheets.py`
  itself is unchanged and still available for CLI/scripted use with exact
  names or `--all`.
- **`remove_sheet.py`** — an 8th standalone script, the removal
  counterpart to `add_sheets_menu.py`: lists every sheet currently IN
  `DATA` (with row counts), takes a single numbered pick, and splices
  `DATA` back in with that sheet's rows dropped — Excel itself is
  untouched, so `add_sheets_menu.py` brings the sheet back later exactly
  as it currently exists there. Confirms with a plain `Y/N` prompt before
  writing, same as every destructive prompt in the project. Added because
  the existing
  removal path (`smart_sync.py`'s per-row removal, gated on rows that no
  longer exist *in the Excel source itself*) had no way to temporarily
  drop a whole sheet the user still wants to keep in Excel — the user
  asked for exactly that ("remove sheet 1 - HR", intending to re-add it
  later). Shares `extract_data.py`'s `read_current_data()`/
  `splice_into_index_html()`, no duplicated logic. `manage.bat`'s Remove
  Sheet option (4) calls this, then auto-chains into `verify_index.py`
  same as Smart Sync/Add Sheet/Full Resync.
- **`edit_config.py`** — a 9th standalone script: an interactive prompt to
  view/change `config.json`'s settings (`server_port`, `rows_per_sheet`)
  without hand-editing JSON. Blank input at either prompt keeps the
  current value; `"full"`/`"none"`/`"null"` clears `rows_per_sheet` back
  to unlimited. Wraps its `input()` calls in `try/except EOFError` — if
  stdin is ever exhausted mid-prompt (only really possible via
  non-interactive/piped invocation, never via a real keyboard), it falls
  back to "keep current value" instead of crashing with a raw traceback.
  Exists because the user asked whether the menu's options made sense,
  and reasonably flagged that there was no way to change `server_port`/
  `rows_per_sheet` without opening a script file by hand, undermining the
  "configurable, not hardcoded" point of `config.json` in the first place.
- **`check_stale.py`** — a 10th standalone script, read-only, never
  touches `index.html`/the workbook. Compares the `.xlsx` workbook's mtime
  against `index.html`'s mtime and prints a one-line heads-up if the
  workbook was modified more recently — nothing at all otherwise (silence
  is the common case). `manage.bat` runs this exactly once, right at
  launch before the menu is first shown — NOT on every return-to-menu
  loop (it sits above the `:menu` label, which the "done" loop jumps back
  to without re-running it). Exists so editing the workbook and then
  forgetting to sync doesn't silently leave the app showing stale data —
  the user asked for this specifically after being burned by exactly that
  once. Purely a heads-up, never blocks/prompts/exits.
- **`restore_backup.py`** — an 11th standalone script, the interactive
  picker for `bkp/`'s backups (see `splice_into_index_html()`'s
  keep-last-5 scheme above). Lists up to the 5 kept backups for
  `index.html`, newest first, with each one's timestamp and question
  count, and takes a single numbered pick rather than always restoring
  blindly "the last one" — useful when the run you want to undo wasn't
  the most recent one. Confirms with a plain `Y/N` prompt (same pattern
  as `remove_sheet.py`). **Restoring is a full raw-file copy of the
  chosen backup over `index.html`, not a DATA-only splice** — a backup
  can predate a code edit to `index.html` itself, not just a data sync,
  so restoring has to undo everything about that run, not just its data.
  The current `index.html` is itself backed up into `bkp/` first (same
  scheme), so restoring is itself undoable, not a one-way door.
- **`manage.bat`** (repo root) — a menu launcher over all 11 scripts above
  plus local-dev/workflow conveniences, so the user can do any of this by
  double-clicking without opening VS Code/a terminal:
  - Runs `check_stale.py` once at launch, before the menu is shown (see
    above) — printed above the menu banner, not tucked into any one
    action.
  - Smart Sync / Add Sheet / Full Resync / Remove Sheet / Restore Backup
    each auto-chain into `verify_index.py` immediately afterward (so the
    standard §11 post-change check happens without a separate manual
    step) — **Clear Data deliberately does NOT auto-verify**, since an
    intentionally-empty `DATA` would just report a spurious-looking "0
    questions" rather than signal a real problem.
  - Add Sheet delegates to `add_sheets_menu.py` — a numbered pick, not a
    typed sheet name (see above).
  - Data Summary (`list_sheets.py` standalone), Verify, Serve Locally
    (delegates to `scripts/serve.py` — Python's `http.server` on the
    `config.json`-configured port, with the browser auto-opened; not
    hardcoded in `manage.bat` itself), Open `index.html` directly
    (`file://`), Open the `.xlsx` workbook directly, Restore Backup
    (delegates to `restore_backup.py`'s numbered picker over the last 5
    backups in `bkp/` — see above; this replaced an earlier version that
    always restored the single `index.html.bak` behind a typed `YES`
    confirmation), and View/Edit Settings (`edit_config.py` — see above)
    round out the menu.
  - **Every action prints a `[%TIME%] <action> starting/done` line**
    (Windows `%TIME%`, e.g. `[18:41:53.63]`) — added alongside the
    `--quiet` verify change above, same "concise and readable, and show
    what happened when" ask. Keep this pattern (a start line before the
    underlying script runs, a matching done line after) if new menu
    actions are added.
  - Deliberately has **no git actions** (commit/push) — those stay a
    separate, explicit, per-session decision per this project's normal
    change-confirmation discipline, not something to automate into a menu.
  - Written with **CRLF line endings** (the Windows-native convention for
    `.bat` files) — if it's ever edited, keep it CRLF; a batch file saved
    with LF-only endings can behave inconsistently around commands like
    `pause` reading redirected input, which is also why the "return to
    menu" step uses `set /p` rather than `pause` (`pause` reads from the
    console handle directly rather than any redirected stdin, which broke
    non-interactively-piped testing during development — `set /p` instead
    made the whole flow both testable and consistent).
