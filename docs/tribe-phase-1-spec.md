# TriBe Founders App — Phase 1 Spec

*Trifecta Benefits / TriBe · Florida Edition*
*Three founders: Shawn, Mark, Michael*

---

## What Phase 1 Is

A private, password-gated web app for three founders that serves as the single source of truth for running the Medicare distribution agency. Phase 1 is **fully manual** — no automation, no email scanning, no meeting processing. The job is to prove the shape of the system with real content, earn trust with Mark and Michael, and create the foundation every later phase builds on.

If Phase 1 is the only thing that ever ships, it should still be genuinely useful.

---

## Phase 1 Scope

### In scope
- Private GitHub repo with the full folder structure
- Single-password gated web app at `app.tribebenefits.com`
- Home screen with all cards (state sentence, meeting launch button, Radar, Lanes, Tasks, Tools, This Week, wiki link, Add Something FAB)
- Wikipedia-style rendered wiki page with TOC and sectioned link cards
- Add Something sheet with three destinations (Lane, Brainstorm, Watch) — Watch option shows a "coming in Phase 2" state
- Group Table as its own home-screen card and wiki section
- Meeting quick-launch button (creates Google Meet link, copies to clipboard for manual paste into iMessage + email)
- Empty placeholder pages for Reimbursements, Expenses, and Watchers
- Manual entry for all content (tasks, decisions, lane items, Group Table items)
- Three founder lanes with Shawn=teal, Mark=coral, Michael=sage color assignments
- `CLAUDE.md` schema file encoding all business rules

### Explicitly deferred to Phase 2
- Cap self-hosting and meeting transcription
- Meeting confirmation screen (post-meeting extraction)
- Pre-meeting brief generation
- Email watchers (including Shawn's EDE)
- iMessage reading and dollar-amount capture
- Reimbursement log auto-population
- Semantic search across transcripts

### Explicitly deferred to Phase 3+
- Idea re-surfacing triggers
- Weekly health checks / wiki-librarian agent
- Research mode for strategy meetings
- Revenue tracker
- Communications drafter
- Licensing tracker agent

---

## Folder Structure

```
tribe-brain/
├── CLAUDE.md                    # Schema + business rules
├── README.md                    # How to use, for humans
├── app/                         # The web app code
│   ├── index.html               # Home screen
│   ├── wiki.html                # Full wiki page
│   ├── add.html                 # Add Something sheet
│   └── styles.css               # Shared TriBe brand styles
├── raw/                         # Inputs (sacred — never edit)
│   ├── transcripts/             # (empty in Phase 1, filled in Phase 2)
│   ├── imessage/                # (empty in Phase 1)
│   └── emails/                  # (empty in Phase 1)
├── wiki/                        # The processed brain
│   ├── index.md                 # Home of the wiki
│   ├── radar.md                 # Red/yellow/sage items
│   ├── group-table.md           # Decisions needing group input
│   ├── people/
│   │   ├── shawn.md
│   │   ├── mark.md
│   │   └── michael.md
│   ├── partners/
│   │   ├── active/
│   │   └── archived/
│   ├── decisions/               # Dated decision records
│   ├── operations/
│   │   ├── licensing.md
│   │   ├── tech-stack.md
│   │   └── pod-launch.md
│   ├── financials/
│   │   ├── manifesto-v2.md
│   │   ├── base-scenario.md
│   │   └── founder-pnl.md
│   ├── ideas/                   # Each idea its own file
│   ├── parked-intentions.md     # Soft commitments without dates
│   ├── reimbursements.md        # Placeholder for Phase 2
│   └── expenses.md              # Placeholder for Phase 2
├── founders/
│   ├── shawn/
│   │   ├── lane/                # Public active initiatives
│   │   └── brainstorm/          # Private-ish scratchpad
│   ├── mark/
│   │   ├── lane/
│   │   └── brainstorm/
│   └── michael/
│       ├── lane/
│       └── brainstorm/
└── watchers/                    # Placeholder for Phase 2
```

---

## Brand System

**Logo:** TriBe with coral B (#e85d4e)
**Primary text color:** #1a1a1a
**Background:** #faf7f2 (warm cream)
**Card background:** #ffffff
**Border:** #eae4da
**Teal (primary actions, Shawn):** #2b8a88
**Coral (community/capture, Mark):** #e85d4e
**Sage (secondary, Michael):** #a8b5a0
**Amber (warnings, decisions):** #e8a33d
**Muted text:** #8a8580
**Display font:** Georgia / system serif (wiki pages)
**UI font:** -apple-system, system-ui (everything else)

### Founder color assignments
- Shawn → teal (#2b8a88)
- Mark → coral (#e85d4e)
- Michael → sage (#a8b5a0)

These colors appear on lane cards, task owner tags, and anywhere a founder is identified.

---

## Home Screen

Stacked vertically, mobile-first, max width 440px:

1. **Header** — TriBe logo centered, "FOUNDERS — FLORIDA" in small tracked uppercase below
2. **State sentence** — one-sentence plain-language summary, written by whoever last edited the wiki (manually in Phase 1)
3. **Start Meeting Now button** — teal gradient, creates Google Meet link, copies link to clipboard, opens iMessage app deeplink and mail:to deeplink for manual paste (Phase 1 version; auto-send in Phase 2)
4. **Radar card** — red/amber/sage dotted items, each with title + meta
5. **Group Table card** — decisions waiting for group input, with lifecycle indicator (raised / discussed / decided)
6. **Lanes card** — three sub-blocks (Shawn/Mark/Michael), each with colored left border and 2-3 active initiative lines
7. **Tasks card** — To Do / Done tabs, items with colored owner tags, soft "prep" marker for prep suggestions (dotted circle instead of checkbox)
8. **Tools card** — 6-tile grid: Shared Gmail, Drive, Cap, Manifesto, Group Chat, Calendar
9. **Open Full Wiki** — dashed-border link card leading to wiki page
10. **This Week** — timeline of what changed, manual in Phase 1
11. **Add Something FAB** — floating coral button, bottom center

---

## Add Something Sheet

Slides up from bottom. Contains:
- Grabber handle
- "What's on your mind?" headline
- "Write it naturally — I'll sort it out." subtitle
- Large text area with example placeholder
- **Where should this go?** section with three destinations:
  - **My Lane** (teal) — real work others should see
  - **My Brainstorm** (coral) — half-thoughts, questions
  - **Watch My Email** (sage) — *disabled in Phase 1, shows "Phase 2" badge*
- Lane is pre-selected by default
- Cancel / Save buttons
- After save: confirmation message from agent showing what it did with the input, with "adjust" option

In Phase 1, the "agent routing" is simulated with simple rules: the text is stored as-is in the chosen destination folder with a timestamp. No intelligent routing yet.

---

## Wiki Page

Rendered from markdown files into a Wikipedia-style view. Never shows raw `.md` to users.

Structure:
- Back button + logo + "Wiki" label
- Search bar (keyword search across wiki pages only in Phase 1)
- H1 title with subtitle
- **At a Glance** info box (founded, model, launch, region, founders)
- Intro paragraph with inline links
- **Contents** TOC card with jump links
- Section H2s: Founders, Active Partners, Operations & Licensing, Financial Model, Recent Decisions, Ideas & Brainstorms, Archived
- Each section is a list of tappable link cards with colored bullet (teal=active, amber=decision, coral=idea, gray=archived) and a right-side tag
- "Wiki last updated X ago" footer

Serif headlines (Georgia), sans-serif body and UI elements.

---

## Group Table

Entries have this shape:
```yaml
id: unique-slug
raised_by: shawn | mark | michael
raised_at: timestamp
title: short description
reason_group: why this needs group input
questions: [list of open questions]
prep_suggestions: [list of soft prep items with assignee]
status: raised | discussed | decided
resolution: null | {via: meeting|imessage|other, decision: text, source_quote: text, decided_at: timestamp}
spawned_tasks: [ids of tasks created from this decision]
```

Routing rules (encoded in `CLAUDE.md`):
- Default to solo task
- Route to Group Table if item involves: brand/naming, spending over $500, hiring/firing, legal structure, tech stack commitment, partner decisions, income/ownership changes, or phrases like "we should," "should we," "need to decide"
- Ambiguous items get a one-tap "solo or group?" confirmation before routing

Group Table entries resolve via **any** path (meeting, iMessage, email). In Phase 1 this is manual — when a decision happens, someone marks the entry "decided" and fills the resolution. In Phase 2 this becomes automatic.

**Unanimous agreement required** for async decisions. 2/3 agreement + silence = still "raised."

---

## CLAUDE.md Schema File

Drop this in the repo root. Every Claude Code session reads it first.

```markdown
# TriBe Benefits — Founders Wiki Schema

## Business identity
- Name candidates: Trifecta Benefits, TriBe (leading)
- Three founders: Shawn (tech, EDE lead), Mark (operations), Michael (training, financials)
- Florida Medicare distribution agency, pre-launch for 2026
- Model: LOA + Independent, pod launch strategy
- Target launch: Pod 1 June 2026
- North star: The 2027 renewal block is the core long-term value driver

## Core philosophy
- Pull, not push. The wiki is the notification system.
- Raw is sacred. Never edit or delete from raw/.
- Every claim must trace to a source.
- The agent proposes, humans confirm for high-stakes changes.
- Unanimous group agreement required for async decisions.
- Archive, never delete. Preserve contacts and context.

## Routing rules for Add Something captures
Solo → default to the capturer's lane or brainstorm
Group Table → triggered by:
- Brand/naming decisions
- Spending over $500
- Hiring / firing / comp
- Legal structure changes
- Tech stack commitments over $100/mo
- Partner/carrier decisions
- Anything affecting founder income or ownership
- Trigger phrases: "we should," "should we," "need to decide," "what do you think"

## Radar thresholds
Licensing: 60 days out = yellow, 14 days = red
Open loops: 7 days stale = yellow, 14 days = red
Carrier communications: term/rate changes = red immediately
Prep items: not done day of meeting = yellow

## Archival rules
- Never delete partner or people pages
- Archive with date and reason to wiki/partners/archived/
- People pages outlive partnership pages — preserve contacts as warm
- Always create a dated decision record when status changes
- Flag downstream impacts (financial models, Manifesto) when archiving

## Tone guidance
- Warm, teaching-as-empathy (not clinical)
- Casual and relationship-forward with external partners
- Neutral and factual in decision records
- Agent surfacing of ideas: neutral framing, never credit or blame

## Founder color codes
Shawn = teal (#2b8a88)
Mark = coral (#e85d4e)
Michael = sage (#a8b5a0)
```

---

## Security

**Single shared password** for the whole app. One gate, one login, remembered per device. No per-page permissions. Implementation: simple session cookie after password check, password stored as env var, no user accounts.

---

## First Weekend Checklist

Six steps from zero to working v1:

1. **Create private GitHub repo** `tribe-brain` with the folder structure above. Initialize all directories with empty `.gitkeep` files so the structure commits cleanly.

2. **Drop in `CLAUDE.md`** with the schema content above. Drop in the Medicare Business Manifesto v2 as `wiki/financials/manifesto-v2.md`. Drop in the current scenario models as separate files in `wiki/financials/`.

3. **Build the web app** — single-page React or static HTML/JS, whichever is faster. Start from the four mockups already built in this conversation:
   - `tribe-founders-app-v2.html` → home screen
   - `tribe-wiki-page.html` → wiki page
   - `tribe-add-something.html` → add sheet
   - `tribe-meeting-confirm.html` → meeting confirm (hidden in Phase 1, ready for Phase 2)
   Wire them to read from the GitHub repo via a read-through proxy or by cloning the repo locally on the server.

4. **Deploy to a subdomain** — `app.tribebenefits.com` via Vercel, Netlify, or Cloudflare Pages. Add a simple password gate (Cloudflare Access, Vercel password protection, or a 10-line Express middleware). One shared password for all three founders.

5. **Populate real content manually** — add Shawn/Mark/Michael to people pages, add current partners (Aetna as exploring, AllCalls as active), create initial lane items for each founder, seed the Group Table with any pending group decisions, add current radar items (Mark's license if applicable, any other time-sensitive things).

6. **Share with Mark and Michael** — send them the URL and the shared password. Don't pitch it. Just say "here's the wiki we talked about, check it out when you have a second." Let them poke around and react.

---

## Success criteria for Phase 1

You'll know Phase 1 is working when:
- All three founders have bookmarked the URL and opened it without being reminded at least once in a week
- At least one meeting has been prepared for by reading the wiki first
- At least one decision has been recorded in `wiki/decisions/` and referenced later
- Mark or Michael has added something to their own lane or brainstorm without being walked through it

When those four things are true, you're ready for Phase 2.

---

## What Phase 2 adds (preview only)

- Self-hosted Cap for meeting recording
- Meeting processor agent (post-meeting confirmation screen comes alive)
- Pre-meeting brief generation
- Shawn's EDE email watcher as the proof-of-concept
- iMessage reader for the founders group chat
- Reimbursement log auto-population from dollar-amount mentions
- Basic semantic search across raw transcripts

Phase 2 should take 3-4 weeks once Phase 1 is solid. Do not start Phase 2 until Phase 1 has been running for at least two weeks with real use.

---

*End of Phase 1 spec. Hand this to Claude Code with the command: "Read CLAUDE.md and this spec, then build Phase 1 starting with the folder structure and the home screen."*
