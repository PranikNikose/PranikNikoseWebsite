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

Currently embedded: **996 questions across 4 sheets** — CoreJava (320),
SpringBoot (291), Microservices (315), Coding (70) — at full row count,
per the user's explicit selective-sync requests (SYNC_EXCEL.md §2b,
`add_sheets.py` for Coding). The other 12 non-HR sheets are not yet in
`DATA`; add them the same way (either individually via §2b, or all at
once via §2) when asked. `HR` is excluded (personal PII — see below).
`Adv. Java` is genuinely empty in the source (1 header row only, no
data) — that's real workbook state, not a bug, and applies whenever it's
synced in.

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
interview answers. Since this app deploys to public GitHub Pages, don't
pull rows from HR into `DATA` without the user explicitly confirming they
want that personal content made public.

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
  **Level**, **Priority**, in that order — all four use the exact same
  Excel-style popover pattern (checkboxes, "Select All", Apply/Clear).
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
- "Clear Filters" resets: all four column filters (Sheet/Topic/Level/
  Priority) → null, search → empty.
- **All four browse-mode filter popovers (Sheet/Topic/Level/Priority) use
  the same chip multi-select pattern as Interview Mode's config modal**
  (`buildChipGroup()`/`chipGroupSelected()`, §7) — NOT a checkbox list.
  Sheet gets its own dedicated trigger row/button above Search
  (`#sheetFilterBtn`/`#sheetFilterPopover`); Topic/Level/Priority render
  as pill buttons in `#filterButtons` below Search. Both trigger styles
  share one popover open/close/render implementation via the
  `popoverRefs` lookup and `renderFilterPopoverChips()` (built once in
  `buildFilterButtons()`). There is no `.fp-item` checkbox pattern
  anywhere in this app anymore, and no standalone `<select>` for Sheet —
  don't reintroduce either; a past version of this doc described that
  older checkbox-based architecture, which was fully replaced.
- **Topic's popover gets a search box (`.fp-search`), the other three
  don't.** Topic (`category`) can run to 100+ distinct values (mixing
  several synced sheets), which is too many to scan/scroll through even
  as wrapped chips — a text input above the chip-group filters which
  chips are visible as you type (`chip.style.display`, matched against
  `chip.dataset.value` case-insensitively), while the wildcard "All" chip
  always stays visible so the filter can always be cleared. Filtering
  which chips are VISIBLE never touches which are SELECTED — a chip
  picked before typing a search term stays selected even while hidden
  from view, and `chipGroupSelected()` still reports it on Apply. Sheet/
  Level/Priority don't get this search box — their value counts (a
  handful each) don't need it; only add it elsewhere if that value count
  grows enough to need it too, don't add it everywhere by default.

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
  means "include everything" at that point. Clicking any individual chip
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
  checked bucket matches). **This is scoped to Interview Mode only** —
  browse mode's Priority filter popover (`FILTER_COLUMNS`/
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
    collapse browse mode's Priority filter the same way unless asked —
    that filter is meant to show/inspect the real data as-is.
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
- **Question count** is a free-typed `<input type="number" id=
  "interviewCountInput">`, not a dropdown — the user explicitly asked why
  they couldn't type their own number. Blank = "All" (shown as the
  `placeholder`, e.g. `All (926)`); typing a number uses exactly that many
  (validated as a whole number ≥ 1 before starting, error shown inline
  otherwise). A `<datalist id="interviewCountPresets">` seeded with the
  old fixed steps (5/10/15/20/25/30/40/50, filtered to those below the
  total) is still wired to the input via `list=`, so the common values
  remain one click away as suggestions in browsers that support datalist
  — but any number can be typed over them. Populated fresh each time the
  modal opens via `populateCountPresets()`, since `allQuestions.length` is
  the ceiling (`max` attribute + placeholder). `.modal-select` (shared
  with this input) must NOT set `cursor:pointer` — that's a leftover from
  when the class styled a `<select>` and made the number input's cursor
  look like a non-interactive picker instead of an I-beam, which read to
  the user as "non-editable". Left as the browser's default input cursor
  now; don't re-add `cursor:pointer` to `.modal-select`.
- **Random order** toggle (checked by default, Fisher–Yates `shuffle()`).
- Starting builds the pool: filter by checked sheets/levels/priorities →
  shuffle if randomized → **then** slice to the chosen count (in that
  order — slicing after shuffling is what makes "10 random questions"
  actually random instead of always the same first 10 of the filtered
  set). Zero checked in any of the three checklists, or an empty resulting
  pool, → inline error in the modal, don't start.

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
  "or", in browse mode (desktop table + mobile)** — but **NOT with
  Interview Mode's "Q." label**, that's Interview-mode-only, the user
  explicitly said so when asked. `q.question`/`q.questionPlain` (§3,
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
  separate, untouched inline `.map()` that DOES always add the "Q." label
  with its own bold/larger `.q-part` styling (even for a single phrasing)
  — that's Interview Mode's own established convention (see the timer/
  reveal section below) and is unrelated to browse mode.
- Then a **"Reveal Answer" button** (labeled "A:" once revealed) shows the
  Answer — the one deliberate exception to §5's "no click to reveal" rule,
  since reveal-then-check is the actual point of practice mode.
  Previous/Next navigate the pool; Previous disabled on the first question.
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
  "Exit to Browse" and "Restart Same Session" (re-runs `buildInterviewPool`
  on the same config — reshuffles if randomize was on) — not a score/
  pass-fail result.
- "End Interview" / "Exit to Browse" both return to browse mode via
  `applyFilters()`.
- **Known bug, fixed**: `endInterview()` must explicitly reset
  `els.tableView.style.display = ''` and `els.singleView.style.display =
  ''` before/with calling `applyFilters()`. `launchInterview()` sets those
  to inline `display:none`, which overrides the CSS media-query rules that
  normally control browse-view visibility — without the reset, browse mode
  stays permanently hidden after the first Interview Mode session ends.
  Don't drop this reset if `endInterview`/`launchInterview` are touched.

This is the one sanctioned exception to "no quiz mechanics" (§11) — a
practice/reveal/pacing flow, not scoring. The timer is about pacing
awareness, not performance tracking. Don't add points, correctness
tracking, or pass/fail results unless asked.

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
  explicit decision, not the default. Also ignored: `*.bak` (the safety
  backups `extract_data.py`/`clear_data.py`/`add_sheets.py`/
  `smart_sync.py` write before overwriting `index.html`, §12),
  `extracted_questions.json` (only survives a failed sync run), Python's
  `__pycache__/`, and common OS/editor cruft.

## 11. General change discipline

- Don't add scoring mechanics (points, correct/incorrect tracking,
  pass/fail results) anywhere — browse mode is a pure reference tool,
  Interview Mode (§7) is reveal-based practice, not a quiz.
- Don't add more question data beyond what's actually in the source Excel
  without being asked, and never fabricate Q&A content (§3).
- **Currently 996 questions across 4 sheets (CoreJava, SpringBoot,
  Microservices, Coding) at full row count — the other 12 non-HR sheets
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
  config, and this project has no build step to work around that. The 4
  sync scripts live in `scripts/` (`extract_data.py`, `add_sheets.py`,
  `smart_sync.py`, `clear_data.py`); the detailed docs live in `docs/`
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
  one-entry with `questionParts` for alternate phrasings, HR exclusion,
  the `ROWS_PER_SHEET` cap), and **writes the result straight into
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
  itself. Before overwriting, it backs up the current `index.html` to
  `index.html.bak` (restore by copying that back over `index.html` if a
  run looks wrong) — if `var DATA = [ ... ];` can't be found in
  `index.html` at all, it raises and writes nothing rather than guessing
  where to put the data. `extracted_questions.json` is written mid-run as
  a debugging intermediate but auto-deleted after a successful splice —
  it only survives if the splice step itself failed, for troubleshooting.
- **To re-sync after the Excel changes**: just run `python
  scripts/extract_data.py`. After it finishes: re-run the verification
  steps from §11 (JS syntax check, `getElementById`/`id=` cross-check, a
  live serve
  check) before considering the sync done — the script writing
  successfully doesn't by itself prove the result is correct.
- **`ROWS_PER_SHEET` in `extract_data.py`** controls how much of each
  sheet gets pulled — currently `None` (full dataset; was `10` during the
  early UI-iteration/testing-phase, §11, before the user asked for the
  real CoreJava/SpringBoot/Microservices data). Only go back to a sampled
  cap if the user explicitly asks to.
- This workflow is also how `questionParts`/rich-text/etc. formatting
  bugs get fixed going forward: fix the extraction logic in
  `extract_data.py`, re-run, re-splice — not by hand-patching individual
  entries inside `index.html`'s `DATA` array.
- **Three additional standalone scripts exist for common maintenance
  tasks the user can run without Claude**, all built on top of
  `extract_data.py`'s `extract()`/`read_current_data()`/
  `splice_into_index_html()` (no duplicated extraction logic):
  - **`clear_data.py`** — wipes `DATA` to `[]`. Destructive; requires
    typing an exact confirmation phrase (`CLEAR ALL DATA`) before writing
    anything, since this app has no real multi-user "admin" system to
    gate it with — the typed phrase is the stand-in the user asked for.
    Backs up `index.html` first, same as every script here.
  - **`add_sheets.py <Sheet> [<Sheet> ...]`** (or `--all` for the whole
    known workbook, resolved via `ed.ALL_KNOWN_SHEETS` — the same 17-sheet
    non-HR list from §3, kept in `extract_data.py` so this script and any
    other tooling can share it instead of re-typing it) — adds sheets that
    AREN'T already in `DATA`; any requested sheet that's already present
    is skipped and left completely untouched, never re-extracted or
    overwritten. Always pulls the full row count for whatever it adds.
    This is what makes "add a sheet" additive without needing separate
    merge logic in `extract_data.py` itself — see the note above about
    `SHEETS` being edited directly for that script's own runs, which is a
    different, narrower mechanism.
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
