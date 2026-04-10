# TriBe Founders App — Product Requirements Document

## Executive Summary

### WHAT
A private, password-gated web application that serves as the single source of truth for three co-founders running a Medicare distribution agency. The app renders a structured wiki of markdown files from a GitHub repo, provides task and decision management, and progressively adds AI-powered capture (meeting transcription, email watching, iMessage reading) across four phases.

### WHO
Three founding partners of Trifecta Benefits LLC — Shawn Milner (tech, EDE lead), Mark Fernandez (operations), and Michael Kisak (training, financials). The only users are these three founders. No external users, no agents, no clients.

### WHY
Founding a business generates an overwhelming amount of scattered information — meeting decisions, partner evaluations, financial models, licensing deadlines, half-formed ideas, and informal commitments made over iMessage. Without a shared system, institutional memory lives in individual heads and chat threads. Decisions get revisited because nobody remembers why they were made. Tasks fall through cracks. The wiki solves this by making everything ambient, traceable, and persistent — so meetings become shorter, nothing slips, and the business compounds its own knowledge over time.

### HOW (vs. status quo)
Current tools (Google Drive, iMessage group chat, email) are scattered and ephemeral. Notion/Confluence are too complex for three people and don't support the "raw sources → agent-processed wiki" architecture. This system is purpose-built around three principles that off-the-shelf tools can't provide:
1. **Three-layer architecture** (raw → wiki → schema) where raw sources are sacred and the wiki is always re-derivable
2. **Source traceability** — every claim links back to the transcript, email, or message that produced it
3. **Pull, not push** — no notifications, no badges, no red dots. The wiki is the notification system. Founders check it when ready.

---

## Technical Architecture

### System Overview
The application follows a Karpathy-inspired three-layer pattern:
- **Raw Layer** (`raw/`) — unedited source documents (transcripts, emails, iMessages). Sacred. Never modified by agents or humans after initial capture.
- **Wiki Layer** (`wiki/`) — agent-processed structured markdown. Self-healing via weekly linting. Where humans read and interact.
- **Schema Layer** (`CLAUDE.md`) — business rules and instructions that govern how agents compile raw into wiki. Evolves over time as the team refines processes.

### Tech Stack
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | File-based routing, API routes, SSR/SSG, native Vercel support |
| Styling | Tailwind CSS + TriBe brand tokens | Utility-first, fast iteration, custom warm-cream palette via config |
| Data layer (Phase 1) | GitHub repo (markdown files) | Version-controlled, auditable, free, matches three-layer architecture |
| Data layer (Phase 2+) | Turso (serverless SQLite) | Lightweight, cheap, sqlite-vec for semantic search, no cold starts |
| Authentication | Single shared password via Next.js middleware | Session cookie, env var, no user accounts needed for 3 founders |
| Deployment | Vercel | Native Next.js host, auto-deploys from GitHub, serverless functions |
| Domain | app.tribebenefits.com | Custom subdomain on Vercel |
| Meeting recording | Cap (self-hosted, Phase 2) | Free, open-source, Whisper transcription built in |
| Transcription | Whisper (local or Groq API, Phase 2) | Zero incremental cost via Cap, excellent quality for 3-person calls |
| Email integration | Gmail MCP connector (Phase 2) | Per-founder OAuth, watcher-file driven |
| iMessage integration | Local SQLite reader (Phase 2) | Reads ~/Library/Messages/chat.db on Mac |
| Search (Phase 1) | Keyword (string match across .md files) | Instant, deterministic, zero dependencies |
| Search (Phase 2+) | sqlite-vec via Turso | Semantic search with embeddings, hybrid routing by query length |
| Task management | Claude Task Master MCP | PRD parsing, task breakdown, dependency tracking |
| AI agent | Claude Code + Opus 4.6 (Claude Max plan) | Agentic coding, wiki processing, meeting extraction |

### Data Layer Strategy
**Phase 1: Files-only.** All data lives as markdown files in the GitHub repo. The wiki, lanes, brainstorms, radar, Group Table, decisions, and ideas are all .md files committed to git. This is not a compromise — it's the correct architecture for three users and aligns perfectly with the raw/wiki/schema three-layer pattern. Benefits: version-controlled history, free, auditable, works natively with Claude Code, zero infrastructure.

**Phase 2+: Turso (serverless SQLite).** When the app needs search embeddings, structured state tracking (watcher run history, task status), and faster queries, add Turso. sqlite-vec plugs directly into Turso for semantic search. Cost is pennies/month for this scale. No cold starts, no connection pooling, no managed database overhead.

**Migration path:** Phase 1 markdown files remain the source of truth even after Turso is added. Turso acts as a read-optimized index, not a replacement. If the database disappears, the markdown files still have everything. This preserves the "raw is sacred" principle at the data layer.

### Deployment Architecture
```
GitHub Repo (tribe-founders-wiki)
    ↓ push to main triggers
Vercel (app.tribebenefits.com)
    ↓ builds Next.js app
    ↓ serves via edge network
Password Gate (Next.js middleware)
    ↓ authenticated requests
App reads markdown files from repo (bundled at build time via SSG, or via GitHub API for dynamic content)
```

Phase 2+ adds server-side processes:
```
Cap Instance (videos.tribebenefits.com)
    ↓ webhook on transcript complete
Transcript Processor Agent
    ↓ writes to
raw/transcripts/ → Meeting Processor Agent → wiki/meetings/

Gmail MCP (per-founder OAuth)
    ↓ polled by
Watcher Runner (reads watchers/*.md configs)
    ↓ updates
founders/X/lane/ pages with confidence markers

iMessage Reader (Shawn's Mac, cron every 15 min)
    ↓ exports to
raw/imessage/ → Commitment/Expense Extractor → wiki/ updates
```

---

## Brand System

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Background | #faf7f2 | Warm cream, app background |
| Card background | #ffffff | Cards, modals |
| Border | #eae4da | Card borders, dividers |
| Primary text | #1a1a1a | Body text |
| Muted text | #8a8580 | Secondary text, timestamps |
| Teal (Shawn) | #2b8a88 | Primary actions, Shawn's lane |
| Coral (Mark) | #e85d4e | Capture actions, Mark's lane, logo B |
| Sage (Michael) | #a8b5a0 | Secondary actions, Michael's lane |
| Amber | #e8a33d | Warnings, decisions |

### Typography
- **Display font:** Georgia / system serif (wiki page headlines)
- **UI font:** -apple-system, system-ui (everything else)

### Logo
TriBe with coral B (#e85d4e), rest white or dark depending on background.
Tagline: "As you serve, you deserve."

---

## Launch Features (MVP — Phase 1)

Phase 1 is fully manual — no automation, no email scanning, no meeting processing. The job is to prove the shape of the system, earn trust with Mark and Michael, and create the foundation every later phase builds on.

### 1. Password Gate
**A single shared password protects the entire app. One login screen, remembered per device, no user accounts. Every page in the wiki contains sensitive business information, so the gate covers everything equally.**

- Session cookie after password check
- Password stored as environment variable
- Long-term device memory (don't re-prompt on every visit)
- No per-page permissions, no user accounts, no roles

#### Tech Involved
- Next.js middleware or Express middleware
- Vercel environment variables
- httpOnly session cookie

#### Main Requirements
- Single password for all three founders
- Remembered per device long-term
- Covers all routes equally
- No "forgot password" flow needed (founders know the password)

---

### 2. Home Screen
**The primary interface — a vertically stacked, mobile-first screen (max width 440px) showing the full state of the business at a glance. Every card represents a different dimension of the founding operation.**

- Header with TriBe logo centered, "FOUNDERS — FLORIDA" subtitle
- State sentence — one-line plain-language summary of where things stand
- Start Meeting Now button — teal gradient, creates Google Meet link, copies to clipboard, opens iMessage and mailto deeplinks
- Radar card — red/amber/sage items with title and meta
- Group Table card — decisions needing group input with lifecycle indicator
- Lanes card — three founder sub-blocks with colored left borders, 2-3 active initiative lines each
- Tasks card — To Do / Done tabs, items with colored owner tags, soft "prep" markers
- Tools card — 6-tile grid linking to Shared Gmail, Drive, Cap, Manifesto, Group Chat, Calendar
- Open Full Wiki link — dashed-border card linking to wiki page
- This Week section — timeline of what changed (manual in Phase 1)
- Add Something FAB — floating coral button, bottom center

#### Tech Involved
- Next.js or static HTML/JS
- CSS with TriBe brand system
- Google Meet API (link generation) or static meet.google.com/new redirect
- Clipboard API
- Deep links (iMessage: sms://, email: mailto:)

#### Main Requirements
- Mobile-first, max-width 440px
- All cards render from markdown files in the repo
- Three founder lanes visually identical in size — no metrics, no scoreboard, no jealousy triggers
- Founder color assignments: Shawn=teal border, Mark=coral border, Michael=sage border
- Radar auto-sorts by urgency zone (red → yellow → sage)
- Empty radar doesn't render (rewards clean slate)
- Tasks card includes prep suggestions with dotted circle (not checkbox) and lighter text
- FAB always visible, bottom-center

---

### 3. Wiki Page
**A Wikipedia-style rendered view of the markdown wiki. Serif headlines, sans-serif body, clean information architecture. Never shows raw markdown to users.**

- Back button + logo + "Wiki" label in header
- Search bar (keyword search across wiki pages, Phase 1)
- H1 title with subtitle
- "At a Glance" info box (founded, model, launch, region, founders)
- Intro paragraph with inline links
- Contents TOC card with jump links
- Section H2s: Founders, Active Partners, Operations & Licensing, Financial Model, Recent Decisions, Ideas & Brainstorms, Archived
- Each section is tappable link cards with colored bullets and right-side tags
- "Wiki last updated X ago" footer

#### Tech Involved
- Markdown-to-HTML renderer (remark/rehype or marked)
- TOC generator from heading structure
- Keyword search (simple string matching across .md files)
- CSS with Georgia serif for headlines

#### Main Requirements
- Renders any markdown file from wiki/ as a styled page
- Auto-generates TOC from H2/H3 headings
- Colored bullets: teal=active, amber=decision, coral=idea, gray=archived
- Search returns results with file links and context snippets
- Never displays raw markdown syntax to users

---

### 4. Add Something Sheet
**A bottom-sheet capture interface for quick input. Founders write naturally; the system routes to the right destination. Phase 1 uses simple file storage; Phase 2 adds intelligent routing.**

- Slides up from bottom on FAB tap
- Grabber handle at top
- "What's on your mind?" headline
- "Write it naturally — I'll sort it out." subtitle
- Large text area with example placeholder text
- Three destination buttons:
  - My Lane (teal) — real work others should see
  - My Brainstorm (coral) — half-thoughts, questions
  - Watch My Email (sage) — disabled in Phase 1, shows "Phase 2" badge
- Lane pre-selected by default
- Cancel / Save buttons
- After save: confirmation message showing what the system did with the input

#### Tech Involved
- CSS bottom-sheet animation (transform, backdrop)
- File write to GitHub repo (via API or local)
- Timestamp-based filename generation

#### Main Requirements
- Text stored as-is in chosen destination folder with timestamp filename
- Lane destination writes to founders/[current-user]/lane/[timestamp-slug].md
- Brainstorm destination writes to founders/[current-user]/brainstorm/[timestamp-slug].md
- Watch destination disabled with "Phase 2" visual badge
- Confirmation message after save (simulated agent response in Phase 1)
- Lane page follows standard shape: title, status, why it matters, next step, zone, log

---

### 5. Group Table
**The decision-management system. Items that need all three founders to weigh in live here with a clear lifecycle. Routing rules determine what's solo vs. group automatically.**

- Renders as its own card on home screen AND as a wiki section
- Entries have: id, raised_by, raised_at, title, reason, questions, prep suggestions, status, resolution, spawned tasks
- Status lifecycle: raised → discussed → decided → executing → complete
- Manual status changes in Phase 1 (click to advance)
- Unanimous agreement rule: 2/3 + silence = still "raised", not decided
- Resolution records: via (meeting/imessage/other), decision text, source quote, decided_at timestamp

#### Tech Involved
- YAML or JSON data file in wiki/group-table.md or structured front matter
- Status lifecycle state machine
- Markdown rendering with status badges

#### Main Requirements
- Routing rules (encoded in CLAUDE.md): route to Group Table if item involves brand/naming, spending >$500, hiring/firing, legal structure, tech stack >$100/mo, partner decisions, income/ownership, trigger phrases
- Ambiguous items get one-tap "solo or group?" confirmation
- Prep suggestions render as soft items (dotted circle, lighter text, "prep — for Monday sync" tag)
- Prep items disappear after meeting or when decision resolves
- Resolution regenerates follow-on tasks (Phase 2 auto, Phase 1 manual)
- Every resolved item creates a decision record in wiki/decisions/

---

### 6. Meeting Quick-Launch
**One-tap meeting creation that gets all three founders connected fast. Phase 1 is manual paste; Phase 2 auto-sends invites.**

- Teal gradient button on home screen
- Creates Google Meet link on tap
- Copies link to clipboard
- Opens iMessage deeplink (sms:// with pre-filled group) for manual paste
- Opens mailto: deeplink for email fallback

#### Tech Involved
- Google Meet API or meet.google.com/new redirect
- Clipboard API (navigator.clipboard.writeText)
- iOS/macOS deep links (sms://, mailto:)

#### Main Requirements
- Single tap creates link + copies to clipboard
- Visual confirmation that link was copied
- iMessage and email deeplinks open native apps for manual paste
- Phase 2 upgrade: auto-send to iMessage group + shared Gmail

---

### 7. Radar
**The early-warning system. Three urgency zones with explicit thresholds. Items auto-promote and demote. Empty radar rewards a clean slate.**

- Renders as card on home screen
- Three zones: Red (handle this week), Yellow (on the horizon), Sage (watching)
- Each item: title, meta description, source link
- Empty state: card doesn't render at all

#### Tech Involved
- Markdown file (wiki/radar.md) with structured items
- Threshold logic for zone assignment
- Date-based auto-promotion (Phase 2+)

#### Main Requirements
- Red thresholds: license ≤14 days, loop stale 14+ days, carrier term/rate change, legal deadline
- Yellow thresholds: license ≤60 days, loop stale 7+ days, prep not done day of meeting, partner quiet 7+ days
- Sage thresholds: license ≤90 days, known upcoming events, monitored items
- Items move between zones based on thresholds (manual in Phase 1, auto in Phase 2)
- Handled items disappear
- Test: if radar stresses Mark when he opens it in the morning, thresholds are wrong

---

### 8. Founder Lanes & Brainstorms
**Each founder gets two spaces: a public lane (work log for cofounders) and a private brainstorm (personal scratchpad). The distinction preserves trust and prevents noise.**

- Three founder directories: shawn/, mark/, michael/
- Each has lane/ (public initiatives) and brainstorm/ (private scratchpad)
- Lane items are individual markdown files with standard shape
- Brainstorm entries are freeform, agent-harvested but never agent-edited
- Home screen lanes card shows 2-3 active items per founder with colored borders

#### Tech Involved
- File-per-initiative in founders/[name]/lane/
- Markdown rendering with standard template
- Home screen card with colored left borders

#### Main Requirements
- Lane page standard shape: title, status ("one-line current state"), why it matters, next step, zone (active|exploring), reverse-chrono log
- Exploring zone items appear dimmed or tagged on home screen
- Norm: don't ask about exploring items unless the owner brings them up
- Brainstorms: freeform, no template, never modified by agents
- Three lane cards on home screen are visually identical in size/shape — no metrics, no task counts
- Only differentiator: small color dot/border in founder's assigned color
- Recent-updated markers allowed but subtle

---

### 9. Wiki Content & People/Partner Pages
**Seed the wiki with real content so it's useful from day one. People pages persist beyond partnerships. Partner pages archive but never delete.**

- People pages: shawn.md, mark.md, michael.md with role, focus, contact info
- Partner pages in wiki/partners/active/ and wiki/partners/archived/
- Operations pages: licensing.md, tech-stack.md, pod-launch.md
- Financial pages: manifesto-v2.md, base-scenario.md, founder-pnl.md
- Decision records in wiki/decisions/ (dated markdown files)
- Ideas in wiki/ideas/ (each idea its own file) + seedlings.md running file
- Parked intentions in wiki/parked-intentions.md

#### Tech Involved
- Structured markdown templates
- Wiki renderer handles all page types consistently

#### Main Requirements
- People pages outlive partnership pages — contacts stay warm even after partnership ends
- Partner archival: move to wiki/partners/archived/ with status header (why and when)
- Every status change creates a decision record (wiki/decisions/YYYY-MM-DD-slug.md)
- Ideas distinguished from seedlings: ideas get full pages, seedlings get entries in running file
- Parked intentions never expire from age alone

---

### 10. CLAUDE.md Schema
**The business rules file that governs all agent behavior. Lives at repo root. Every Claude Code session reads it first.**

- Encodes: business identity, core philosophy, routing rules, radar thresholds, archival rules, tone guidance, founder colors
- This is the "schema layer" of the three-layer architecture
- Shawn's primary editorial role is refining this file over time

#### Tech Involved
- Markdown file at repo root
- Read by Claude Code at session start
- Referenced by all agent processes in Phase 2+

#### Main Requirements
- Must be comprehensive enough that a new Claude Code session can orient itself
- Routing rules for Add Something captures clearly defined
- Radar thresholds with specific day counts
- Tone guidance: warm, teaching-as-empathy, casual with external partners, neutral in records
- Explicitly lists what NOT to build

---

### 11. Deployment & Domain
**Ship to app.tribebenefits.com via Vercel with password protection.**

- Connect GitHub repo to Vercel
- Custom domain: app.tribebenefits.com
- Password protection via Vercel's built-in feature or middleware
- Automatic deploys on push to main

#### Tech Involved
- Vercel CLI or dashboard
- DNS configuration for subdomain
- Vercel environment variables for password

#### Main Requirements
- Deploys automatically when main branch is pushed
- Password gate works on all routes
- Mobile-responsive (primary device is phone)
- Fast load times (static or SSG preferred)

---

## Future Features (Post-MVP)

### Phase 2 — Capture Layer (3-4 weeks after Phase 1 stable for 2 weeks)

### Meeting Capture Pipeline
- Self-hosted Cap instance for recording
- Automatic transcription via Whisper
- Meeting processor agent extracts tasks, decisions, ideas, open questions from transcripts
- Post-meeting review screen with source quotes and Confirm/Edit/Skip/Confirm All
- Pre-meeting brief generator (1 hour before scheduled meetings)

#### Tech Involved
- Cap (self-hosted on Hetzner CX22 or Oracle ARM)
- Whisper (built into Cap, or Groq API fallback)
- Claude Code agent for transcript processing
- Structured JSON output → wiki/meetings/ proposed files

#### Main Requirements
- End-to-end: Cap records → transcript to raw/ → agent extracts → review screen → confirmed entries to wiki
- >80% accuracy on first-pass extraction across 3 meetings
- Pre-meeting brief pulls from brainstorms, stale lanes, radar, parked intentions, Group Table
- Brief lands 1 hour before meeting at wiki/meetings/YYYY-MM-DD-briefing.md

---

### Email Watcher System
- Watcher files in watchers/ define what to watch per founder
- Gmail connector per-founder (OAuth, starts with Shawn only)
- Shawn's EDE watcher as proof-of-concept
- Lane page auto-updates with confidence markers and source links

#### Tech Involved
- Gmail MCP connector
- Watcher runner reads watchers/*.md config files
- Per-watcher Claude agent updates target lane page

#### Main Requirements
- Natural language "what I'm trying to track" field drives filtering
- Source linking: every update tagged with confidence and source email
- Confidence levels: high (explicit statement), medium (inferred), low (surface for review)
- Adoption pattern: Shawn first, Mark and Michael pull from seeing it work

---

### iMessage Integration
- Local SQLite reader for ~/Library/Messages/chat.db on Shawn's Mac
- Scoped to founders group chat only
- Dollar-amount pattern matching for reimbursement log
- Commitment/decision extraction for Group Table

#### Tech Involved
- Python script reading SQLite database
- Cron job every 15 minutes
- Pattern matching for dollar amounts near action verbs

#### Main Requirements
- Only reads founders group chat — never other conversations
- Exports to raw/imessage/YYYY-MM-DD.md
- Dollar-amount extraction requires action verbs ("spent", "paid", "expensed") near the amount
- Manual-refresh button as fallback

---

### Reimbursement Log
- Auto-populated from iMessage dollar-amount mentions
- Running balances per founder
- Settle-up checkboxes
- Monthly reconciliation checkpoint

#### Tech Involved
- Structured markdown in wiki/reimbursements.md
- Pattern matching from iMessage exports
- Dedup against email receipts

#### Main Requirements
- Fields: who paid, how much, what for (verbatim), when
- Settlement via Zelle/Venmo auto-checks entries
- Monthly reconciliation: agent writes summary, three founders confirm
- Retires when business opens a checking account

---

### Search Upgrade
- Keyword search (Phase 1) upgraded to semantic search
- Chunk and index wiki pages + raw transcripts into sqlite-vec
- Route by query length: 1-3 words = keyword, longer = semantic

#### Tech Involved
- sqlite-vec for embeddings
- Embedding model (OpenAI ada or local)
- Hybrid search router

#### Main Requirements
- Search bar on home screen and wiki page
- Results include source links and context snippets
- Synthesized answers for semantic queries
- Keyword is instant and deterministic; semantic has latency tolerance

---

### Phase 3 — Intelligence Layer (4-6 weeks after Phase 2 stable for 3 weeks)

### Wiki-Librarian Agent
- Weekly health checks (runs Sunday night)
- Contradiction detection across pages
- Stale content surfacing (30+ days untouched)
- Broken cross-reference repair
- Auto-generates "This Week" summary

#### Tech Involved
- Scheduled Claude Code agent
- Full wiki read + structured report output

#### Main Requirements
- Report: pages updated, contradictions, stale pages, broken refs, missing decision records, aging open loops
- "Needs reconciliation" card on home screen (only when populated)
- Weekly cadence (daily is too noisy)

---

### Idea Resurfacing
- Five triggers: topic match, precondition true, scheduled revisit, search activity, contradiction/confirmation
- "Worth Revisiting" section in pre-meeting briefs (max 2-3 items)
- Post-meeting "Did we miss this?" safety net
- Ambient "Related ideas" sidebar on wiki pages

#### Tech Involved
- Trigger engine as part of pre-meeting brief generator
- Idea library matching against meeting topics
- Embedding similarity for topic matching

#### Main Requirements
- Ideas never float based on age alone
- Surfacing happens in briefs and post-meeting review, never real-time during meetings
- Each surfaced idea shows original quote, date, and reason for resurfacing

---

### All-Founder Watchers
- Mark and Michael Gmail connected with their own watchers
- Shared Gmail (founders@tribebenefits.com) connected
- Watcher creator UI (form-based, non-technical founders can use)

#### Tech Involved
- Gmail MCP per-founder
- Form-based watcher template builder
- Same watcher runner as Phase 2

#### Main Requirements
- Mark and Michael never touch markdown files to create watchers
- Form fields match watcher template from design decisions doc
- Shared Gmail watches business-level signals (Namecheap, Stripe, carrier broadcasts)

---

### Cycle-Time Metrics
- Timestamp tracking across Group Table lifecycle
- Monthly "how we're operating" notes in Monday brief
- Neutral framing — never blame

#### Tech Involved
- Metadata timestamps on Group Table items
- Aggregation agent for monthly notes

#### Main Requirements
- Four timestamps per item: raised, prep done, decided, executed
- Averages surfaced monthly only, never as a live dashboard
- Breakdowns by category, not by founder

---

### Phase 4 — Polish (scope defined by real usage gaps)

### Fire-Alarm Notifications
- Narrow tier for truly existential events (license expiring tomorrow, carrier termination, legal deadline)
- Should fire less than once a month; if more frequent, thresholds are wrong

### Research Mode
- Opt-in real-time idea surfacing during deep strategy meetings
- Off by default; only for quarterly planning

### Communications Drafter
- Drafts external emails in founder's voice (based on tone data from real emails)
- Joseph-style casual, relationship-forward drafts

### Revenue Tracker
- Comes online when commissions flow from Pod 1 (June 2026+)

### Licensing Tracker Agent
- Dedicated agent monitoring license expiration and renewal across all founders and carriers

---

## Feature Specifications

### Feature 1: Password Gate
**Goal:** Protect the entire app with a single shared password
**API relationships:** None
**Detailed requirements:**
- Middleware intercepts all routes
- Checks for valid session cookie
- If no cookie, renders password form (centered, branded, minimal)
- On correct password, sets httpOnly cookie with long expiration (30 days)
- Password form: single input field, TriBe logo above, "Enter password" placeholder, Submit button
- Wrong password: subtle shake animation, "Try again" message, no lockout
- No registration, no forgot password, no user accounts
**Implementation guide:**
- Next.js: use middleware.ts to check cookie on all routes except /api/auth
- Create /api/auth endpoint that validates password against process.env.APP_PASSWORD
- Set cookie: httpOnly, secure, sameSite=strict, maxAge=30 days
- Password form: single React component, auto-focus on input

### Feature 2: Home Screen
**Goal:** Show the full state of the business at a glance in a mobile-first vertical layout
**API relationships:** Reads from wiki/radar.md, wiki/group-table.md, founders/*/lane/, wiki/ files
**Detailed requirements:**
- Max-width 440px, centered on larger screens
- Cards stack vertically in fixed order: header → state sentence → meeting button → radar → group table → lanes → tasks → tools → wiki link → this week → FAB
- Each card: white background, #eae4da border, 16px border-radius, 16px padding
- State sentence: editable markdown field, manually updated in Phase 1
- Meeting button: full-width teal gradient (#2b8a88 → slightly lighter), "Start Meeting Now" text, white icon
- Radar card: items grouped by zone, zone headers (RED/YELLOW/SAGE), each item is a row with colored dot + title + date
- Lanes card: three equal sub-blocks, each with founder name + color border-left (4px) + 2-3 initiative lines truncated to one line
- Tasks card: tab switcher (To Do | Done), items with colored owner dot, "prep" items have dotted-circle and gray text
- Tools card: 2x3 grid of square tiles, each with icon + label, linking to external URLs
- FAB: 56px circle, coral (#e85d4e), white plus icon, fixed bottom-center with 24px margin
**Implementation guide:**
- Create page component reading from structured data files
- Radar component reads wiki/radar.md, parses items, sorts by zone
- Lanes component reads each founders/[name]/lane/ directory, shows latest 2-3 active items
- Tasks component reads from a tasks data file (JSON or markdown front matter)
- Tools card: hard-coded external links (Gmail URL, Drive URL, etc.)
- This Week: reads from wiki/this-week.md (manually edited in Phase 1)

### Feature 3: Wiki Page
**Goal:** Render markdown wiki files as a clean, Wikipedia-style browsable interface
**API relationships:** Reads all files in wiki/ directory tree
**Detailed requirements:**
- Route: /wiki and /wiki/[...path] for any nested page
- Renders markdown to HTML with styling (serif headlines, sans-serif body)
- Auto-generates TOC from H2/H3 headings as a card with jump links
- Search bar at top: filters wiki pages by keyword match, shows results as a dropdown
- Section pages show link cards for child pages with colored bullet and right-side tag
- "At a Glance" info box on main wiki page (key-value pairs)
- Footer: "Wiki last updated [relative time] ago"
**Implementation guide:**
- Use remark + rehype pipeline for markdown → HTML
- Or use marked.js for simpler setup
- TOC extraction: parse headings during render, generate anchor IDs
- Search: on-mount, index all .md files in wiki/, filter by query string match
- Dynamic routes: Next.js [...path] catch-all route reads corresponding .md file

### Feature 4: Add Something Sheet
**Goal:** Quick-capture interface that routes input to the right destination
**API relationships:** Writes to founders/[name]/lane/ or founders/[name]/brainstorm/
**Detailed requirements:**
- Triggered by FAB tap
- Slides up from bottom with 300ms ease-out animation
- Backdrop: semi-transparent dark overlay
- Grabber handle: 40px × 4px rounded bar, centered
- Text area: min-height 120px, auto-grows, placeholder "Jot down a thought, task, or question..."
- Three destination buttons below text area, horizontally arranged
- "Watch My Email" button disabled: gray, has "Phase 2" badge overlay
- Lane pre-selected by default (teal highlight border)
- Save writes to chosen folder with filename: YYYY-MM-DD-HH-mm-slug.md
- Slug generated from first 5 words of input, kebab-cased
- After save: confirmation toast showing what was saved and where
**Implementation guide:**
- CSS: fixed position bottom sheet, translateY animation
- State: text content, selected destination, saving state
- On save: API route that writes file to repo (GitHub API or local file system)
- Confirmation: 3-second toast that slides up, then fades

### Feature 5: Group Table
**Goal:** Track decisions that need all three founders
**API relationships:** Reads/writes wiki/group-table.md, creates wiki/decisions/ records
**Detailed requirements:**
- Data stored as structured YAML front matter in wiki/group-table.md or as individual files
- Each item: id (slug), raised_by, raised_at, title, reason_group, questions[], prep_suggestions[], status, resolution{}
- Status lifecycle: raised → discussed → decided → executing → complete
- Status change via tap on status badge, cycles forward
- Resolution: manually filled in Phase 1 (modal with decision text, via selector, source quote)
- On resolution: auto-create wiki/decisions/YYYY-MM-DD-[slug].md with reasoning
- Prep suggestions render as soft items in Tasks card
- Prep items: dotted circle (not checkbox), lighter text, gray tag "prep — for [meeting date]"
- Prep items disappear after the meeting date passes or when the decision resolves
**Implementation guide:**
- Store items as array in JSON file or YAML
- Status state machine with forward-only transitions (allow skip for "decided via iMessage")
- Decision record template: date, title, decision text, source (meeting/iMessage/other), quote, spawned tasks
- Prep items injected into Tasks card component with visual differentiation

### Feature 6: Radar
**Goal:** Surface time-sensitive items organized by urgency
**API relationships:** Reads wiki/radar.md
**Detailed requirements:**
- Data stored as structured items in wiki/radar.md with zone, title, description, date, source link
- Zone assignment based on thresholds defined in CLAUDE.md
- Card renders zone headers only for populated zones
- Empty radar = card doesn't render (not "no items" message — literally absent)
- Each item: colored zone dot, title (bold), one-line meta, optional source link
- Items manually added/removed in Phase 1
**Implementation guide:**
- Parse wiki/radar.md for structured items
- Sort items: red first, then yellow, then sage
- Conditional rendering: if all zones empty, return null
- Zone header styling: red dot + "Handle This Week", amber dot + "On the Horizon", sage dot + "Watching"

### Feature 7: Meeting Quick-Launch
**Goal:** One-tap meeting creation
**API relationships:** Google Meet (link generation), Clipboard API
**Detailed requirements:**
- Button tap: generate meet link → copy to clipboard → show confirmation → open share options
- Google Meet link: either via API or redirect to meet.google.com/new
- Clipboard: navigator.clipboard.writeText(meetLink)
- After copy: show "Link copied!" toast for 2 seconds
- Share options: two buttons — "Open iMessage" (sms:// deeplink) and "Open Email" (mailto: deeplink)
**Implementation guide:**
- Simplest: window.open('https://meet.google.com/new') to create meet
- After meet created: copy link, show toast, render share buttons
- iMessage deeplink: sms://open?addresses=mark,michael (or sms:// with group info)
- Email deeplink: mailto:?subject=TriBe%20Sync&body=[meet link]

---

## Non-Functional Requirements

### Performance
- Home screen loads in <2 seconds on mobile
- Wiki page renders in <1 second
- Search results appear in <500ms (keyword)

### Security
- Single shared password (not per-user auth)
- httpOnly, secure cookies only
- No sensitive data in URL parameters
- GitHub repo is private

### Accessibility
- All interactive elements keyboard-navigable
- Sufficient color contrast (WCAG AA)
- Semantic HTML structure

### Mobile-First
- Primary device is phone (iPhone)
- Max-width 440px for main content
- Touch-friendly targets (min 44px)
- Bottom sheet and FAB designed for thumb reach

---

## Resolved Design Decisions

1. **Static vs. SSR:** Hybrid approach. Use Next.js SSG (Static Site Generation) for wiki pages (rebuilt on deploy), with ISR (Incremental Static Regeneration) for frequently changing pages (radar, tasks, Group Table). API routes handle writes. This gives fast loads with near-real-time content.
2. **GitHub API vs. local clone:** Use GitHub API for reads and writes from the app. At build time, the repo content is bundled into the static build. For dynamic writes (Add Something, status changes), use the GitHub Contents API via Next.js API routes. No local clone needed.
3. **Meeting link generation:** Use the simple redirect to meet.google.com/new for Phase 1. No OAuth setup required. Phase 2 can add Google Calendar API integration if needed.
4. **Founder identification:** Founder picker on first visit after password auth. Simple modal: "Who are you?" with three buttons (Shawn/Mark/Michael). Selection stored in a cookie alongside the auth session. This determines which lane "Add Something" writes to, which color highlights are "mine," and which tasks are assigned to "me."
5. **Content editing:** Phase 1 editing paths: (a) Shawn edits via Claude Code for structural changes, (b) all founders can edit via the Add Something sheet for new lane/brainstorm items, (c) Group Table status changes happen in-app. Direct wiki page editing deferred to Phase 2.

## Open Questions (for founders to decide)

1. **Tailwind CSS vs. custom CSS:** PRD recommends Tailwind for development speed. Confirm this is acceptable or if custom CSS is preferred for smaller bundle size.
2. **Domain readiness:** Is app.tribebenefits.com DNS already configured, or does this need to be set up? Need access to the domain registrar (Namecheap?).
3. **Google Meet vs. alternative:** Are all three founders on Google Workspace? If not, consider Zoom or a generic meeting link approach.
4. **GitHub API token:** The app needs a GitHub personal access token (PAT) to read/write files. Shawn to generate a fine-grained PAT scoped to the tribe-founders-wiki repo.

---

## Success Criteria

Phase 1 is working when:
1. All three founders have bookmarked the URL and opened it without being reminded at least once in a week
2. At least one meeting has been prepared for by reading the wiki first
3. At least one decision has been recorded in wiki/decisions/ and referenced later
4. Mark or Michael has added something to their own lane or brainstorm without being walked through it
