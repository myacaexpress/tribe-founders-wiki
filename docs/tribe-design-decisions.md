# TriBe Founders App — Design Decisions & Rationale

*Companion to `tribe-phase-1-spec.md`. Captures the reasoning, rules, edge cases, and deferred behaviors agreed to during the founding design conversation. Keep this file next to the spec in the repo.*

---

## Core philosophy (the non-negotiables)

### Pull, not push
Notifications are off by default. The wiki is the notification system. Founders check it when ready, not when the system decides to interrupt. Radar absorbs anything that might affect the business. The only permitted exception is a narrow "fire alarm" tier for events where the business is harmed within 48 hours if ignored (license literally expiring tomorrow, carrier termination notice, legal correspondence with deadline). Fire alarms almost never fire. If they fire more than once a month, thresholds are wrong.

### Raw is sacred
Every source document — meeting transcripts, iMessage exports, emails, voice memos — lives in `raw/` permanently and is never edited or deleted. Agents read from raw but never modify it. The raw layer is the undo button for the entire system: if the wiki is wrong, you can always re-derive it from raw.

### Source traceability is a hard rule
Every agent-generated claim in the wiki must link back to the raw source that produced it. A task extracted from a meeting shows the transcript quote with speaker and timestamp. An expense pulled from iMessage shows the original message. A decision archived as "not pursuing QIA" shows the meeting quote that triggered the archival. No claim lives in the wiki without traceable evidence. This is the trust foundation — when anything is questioned, one tap reveals the source.

### Agent proposes, humans confirm (for high-stakes changes)
Low-stakes operations (appending to a log, updating a status line, tagging something for later) happen autonomously. High-stakes operations (archiving a partner page, closing a loop involving another founder, marking a task done based on inference, routing between lane and Group Table when ambiguous) surface for confirmation before being applied. Phase 1 is conservative everywhere. Phase 2 loosens as trust builds.

### Unanimous agreement for async decisions
A Group Table item is only "decided" when all three founders have engaged — either with agreement, counter-proposal, or explicit "go ahead without me." Two-of-three + silence = still "raised," not decided. This protects against founders coming back from a weekend and finding decisions made without them. Meeting decisions are different: presence is taken as engagement, silence in a live meeting is not disqualifying.

### Archive, never delete
Partner pages, people pages, and decision records are archival-only. When TriBe stops pursuing a carrier, the partner page moves to `wiki/partners/archived/` with a status header explaining why and when. The associated person page (contact) stays in `wiki/people/` with updated context — "former X contact, warm relationship, context: we evaluated and passed." People outlive partnerships on purpose. You might run into them again; the institutional memory matters.

### Every status change creates a decision record
When anything meaningful changes state — partner archived, scenario chosen, name locked in, pod launch date set — a new file lands in `wiki/decisions/YYYY-MM-DD-slug.md` with the reasoning pulled from the source that triggered the change. Six months later, "why did we decide X?" is always one file away.

---

## The three-layer pattern (Karpathy-inspired)

**Raw layer** — unedited sources. Sacred. Never modified.
**Wiki layer** — agent-processed structured markdown. Self-healing via linting passes. Where humans read.
**Schema layer** — `CLAUDE.md` rules. The instruction set the agent follows when compiling raw into wiki. Evolves over time. Shawn's primary editorial role is refining the schema, not writing articles.

The agent's "linting" job is the most undervalued piece: checking for contradictions between pages, flagging stale content, catching decisions that didn't get recorded, noticing when cross-references are broken. Without linting, the wiki rots in 3 weeks. With it, the wiki compounds in value indefinitely.

---

## Founder lanes vs. brainstorms (critical trust distinction)

**Brainstorms** (`founders/X/brainstorm/`) are the messy scratchpad. Half-thoughts, questions, complaints, things to raise later. You write *to yourself*. Other founders technically can read them but the norm is "I can read it but I wouldn't cite it." The agent **harvests** from brainstorms for pre-meeting briefs but never **edits** them. Your scratchpad stays yours even though it's in a shared repo. If you write something that becomes a decision, the agent copies the relevant bit into the decisions log and backlinks — your original messy note stays exactly as written.

**Lanes** (`founders/X/lane/`) are the public work log. You write *to your cofounders*. Real initiatives with a status. Each lane item gets its own file. Lanes are meant to be cited in meetings. That's the whole point.

The distinction must be preserved. If they collapse into one thing, people either stop using the brainstorm (feels surveilled) or clutter the lane with half-thoughts (lane becomes noisy). Two spaces, two purposes, two different trust norms.

---

## Lane page standard shape

Every lane page follows this structure so all founders' lanes feel consistent:

```markdown
# [Initiative name]

**Status:** [one-line current state]
**Why it matters:** [1-2 sentences tying it to business outcomes]
**Next step:** [concrete next action, with deadline if applicable]
**Zone:** active | exploring

## Log
- YYYY-MM-DD — [event or update, with source link if applicable]
- YYYY-MM-DD — [earlier event]
- ...
```

The "exploring" zone is for real-but-fragile work. Exploring items appear in the lanes card on the home screen with dimmer styling or an "exploring" tag. Norm: don't ask about exploring items unless the owner brings them up. Graduates to "active" when the work firms up, archives with a one-line reason if it dies. Archived exploring items become valuable institutional memory ("we looked at X in April, here's why it didn't work").

---

## Ideas and seedlings (capturing thinking that isn't a task)

When the meeting processor extracts content from a transcript, it distinguishes:

- **Tasks** — commitments with an owner ("I'll reach out to Aetna")
- **Decisions** — group agreements ("we're going June for pod 1")
- **Ideas** — novel approaches or frameworks worth preserving (Michael's renewal-block-as-collateral strategy). Each gets its own file in `wiki/ideas/` with the exact speaker quote at the top and a short agent synthesis underneath
- **Seedlings** — vague "maybe we should" thoughts. Land as entries in a single running file `wiki/ideas/seedlings.md` with speaker and date. Lower ceremony than full idea pages but still captured and searchable
- **Parked intentions** — soft commitments without concrete owners or dates ("we should fly out to meet each other"). Land in `wiki/parked-intentions.md` and surface periodically in pre-meeting briefs until acted on or explicitly dropped

Nothing good gets lost. Ideas and parked intentions never expire from age alone — they only get removed when explicitly resolved.

---

## Idea re-surfacing triggers (Phase 3)

Ideas float back into pre-meeting briefs only when one of five triggers fires:

1. **Topic naturally appears** in a new meeting or message thread that touches the idea's concept area
2. **Precondition becomes true** (e.g., "once we're at 15 agents" and you hit 15 agents)
3. **Scheduled revisit** — only if explicitly requested at origin ("let's come back to this in three months")
4. **Search activity** — if an idea gets searched for multiple times in a month, agent promotes it
5. **Contradiction or confirmation** — new external info validates or challenges the idea

Ideas never float based on age alone. That would be noise.

Floating never happens in real time during meetings (default). It happens in three specific places: the **pre-meeting brief** (main surfacing path, 1 hour before meeting), the **post-meeting review screen** ("did we miss this?" safety net), and **ambient in the wiki** (Related sidebar when browsing relevant pages). For deep strategy sessions, a **Research Mode** opt-in enables silent real-time surfacing into a sidebar, but this is off by default.

---

## Task completion detection (Phase 2+)

The agent uses four signals to mark tasks done, ranked by confidence:

1. **Explicit completion in a source** — "I renewed it yesterday" in a transcript, or a "Verification Complete" email. High confidence. Mark done, tag source.
2. **Artifact status change** — task is "schedule Aetna call," a calendar event titled "Aetna intro call" appears. The artifact is the evidence. High confidence.
3. **Inferred from downstream activity** — task is "set up Cap," three days later someone mentions "I recorded yesterday's call on our Cap instance." Medium confidence. Mark done but tag as "inferred — confirm if wrong" and surface in weekly digest.
4. **Time-based fade** — 14 days with no mention. Do NOT mark done. Promote to radar yellow as "going quiet," surface in next meeting brief as a question: "Still active, completed, or dropped?"

The rule: never silently mark things done when uncertain. Surface ambiguity where humans will see it, let a thirty-second conversation resolve it.

---

## Confidence markers on agent updates

Every agent-written entry in the wiki gets tagged with a confidence level and source link. Examples:
- *"Status updated 4/10 — based on email from cms.gov subject 'Verification Complete' [view source]"*
- *"Inferred complete 4/14 — Shawn mentioned Cap instance running in sync transcript [view source]. Confirm if wrong."*

This turns the agent from an authority into a research assistant. It proposes; humans verify when it matters.

---

## Add Something — conversational confirmation

After free-text capture, the agent writes back a short confirmation showing what it did:

> *"Got it. I split that into two items:*
> *• Task for you: set up Namecheap account (landed in your lane)*
> *• Group decision: pick and buy the domain name (Group Table for next meeting)*
> *Sound right? Tap to adjust."*

Builds trust over time. Every time the agent correctly splits a messy thought into clean destinations, trust grows. Eventually founders stop reading the confirmation.

---

## Group Table routing rules

**Default:** solo task, assigned to whoever raised it.

**Route to Group Table if:**
- Brand/naming decisions
- Spending over $500
- Hiring/firing/comp decisions
- Legal structure changes
- Tech stack commitments over $100/mo
- Partner/carrier decisions
- Anything affecting founder income or ownership
- Trigger phrases: "we should," "should we," "need to decide," "what do you think"

**Ambiguous cases:** one-tap "solo or group?" confirmation before routing.

**Lifecycle:** raised → (discussed) → decided → executing → complete. Can exit at any point via any path (meeting, iMessage, email, external).

**Resolution regenerates follow-ons.** When a Group Table item resolves, the agent regenerates the downstream task chain. Domain decision resolves → Namecheap purchase task spawns, Gmail setup task spawns, wiki update spawns, social handle check spawns. Nobody manually creates these. They appear the moment the decision lands.

**Responsive, not rigid.** The agent re-evaluates open items on every new signal and updates their shape. Prep suggestions come and go. Tasks appear when decisions land, disappear when decisions reverse. The list you see is always current without bookkeeping.

---

## Prep suggestions (soft, not hard)

Group Table items auto-generate soft prep checklists. These are **suggestions, not obligations**. Visual treatment:
- Lighter weight text than regular tasks
- Dotted circle instead of checkbox
- Small gray tag "prep — for Monday sync"
- Soft phrasing: "Worth checking before Monday: [thing]"

Prep items disappear after the meeting or when the decision resolves via another path — no penalty for not doing them. They're about making meetings productive, not about accountability.

Prep items live in the same Tasks card as regular tasks (Option B from design discussion), not in a separate card. "One list of everything I need to do" beats "organized into neat buckets."

---

## Cycle-time metrics (byproduct of Group Table)

Every Group Table item carries four timestamps: **raised → prep done → decided → executed**. From this data:

- Average days raised → decided
- Average days decided → executed  
- Items currently stuck at each phase
- Patterns by category (brand decisions vs. operational)
- Patterns by founder who raised (surfaced neutrally, not as blame)

Surfaces in a small metrics section on the wiki and in occasional monthly notes in the Monday brief: *"Last 30 days: 7 group decisions, avg 9 days raised→decided, 3 days decided→executed. Slowest: pod 1 pricing question (14 days, still at prep)."*

---

## Watcher template (Phase 2)

New watchers are plain markdown files at `watchers/[founder]-[topic].md`:

```markdown
# Watcher: [short name]

**Who owns this:** [founder name]
**Which email account:** [which connected account to scan]
**Look for emails from or about:** [domains, senders, keywords, phrases]
**Ignore:** [newsletters, noise]
**Update this lane page:** [path, or "create a new one called X"]
**What I'm trying to track:** [one paragraph in natural language about what this is for and what to surface — the agent reads this for context]
**How often:** [hourly, every few hours, daily]
**Show on radar if urgent:** [yes/no, and what counts as urgent]
```

The "what I'm trying to track" paragraph is the key field. Founders describe what they care about in natural language; the agent figures out filtering internally. Mark and Michael never see or think about the mechanics.

**Adoption pattern:** Shawn goes first with EDE watcher. Mark and Michael pull it from him after seeing it work. No pushing. Each founder separately authorizes their own Gmail — unavoidable and actually good for privacy.

**Source linking on watcher updates:** every lane update made by a watcher tags with confidence and source. "Status updated from email from cms.gov 4/10 [view source]."

---

## Expense / reimbursement log (narrow, temporary)

**Scope:** casual out-of-pocket spending captured passively from iMessage dollar-amount mentions. Not accounting. Not taxes. Just "who fronted what and needs to be paid back."

**Fields per entry:** who paid, how much, what for (verbatim from the message), when. No categories, no approval workflows, no receipt requirements.

**The page shows:** three running totals (owed-to balance per founder), reverse-chronological ledger, checkbox per entry for when settled.

**Settlement pattern:** periodic manual settle-up. Founders agree on cadence (every couple weeks or monthly). Zelle/Venmo notifications in shared Gmail auto-check entries when they arrive.

**Retirement:** this tool dies when the business opens a checking account with founder debit cards. At that point the page gets a header "Retired [date] — reimbursements handled via business account after this point" and becomes a historical record.

**Trust guardrail:** monthly reconciliation checkpoint. First of the month, agent writes a short report at the top of the page: total expenses, flagged items (missing receipts, duplicates, uncategorized), reimbursement balances as of month-end. Three founders confirm in the first meeting of the month. Previous month is then locked — no retroactive edits without explicit override.

---

## Security: one password for everything

Single shared password gates the entire app. No per-page permissions. Rationale:
- Every page in the wiki is sensitive (financials, strategy, brainstorms, contacts)
- Protecting only the expense page implies the rest is fine to leak, which isn't true
- Three founders are all in the same trust circle — there's no scenario where Mark is allowed on the wiki but not on expenses
- Per-page permissions are complexity nobody wants to maintain

Implementation: session cookie after password check, password stored as env var, remembered per device long-term, no user accounts.

---

## Meetings

**Start Meeting Now flow:**
- Phase 1: creates Google Meet link, copies to clipboard, opens iMessage and mail:to deeplinks for manual paste to founders
- Phase 2: auto-sends to iMessage group + shared Gmail, auto-starts Cap recording, auto-drops transcript into `raw/transcripts/` when done

**Pre-meeting brief (Phase 2):**
Lands 1 hour before meeting at `wiki/meetings/YYYY-MM-DD-briefing.md`. Pulls from all three brainstorms, stale lane items, radar, unresolved agent questions, recent iMessage decisions needing confirmation, parked intentions, and idea re-surface triggers. Standard sections always in same order for fast scanning.

**Post-meeting review screen (Phase 2):**
Cap transcript drops → agent extracts tasks / decisions / ideas / open questions → review screen shows each with source quote → founders tap Confirm / Edit / Skip per item or Confirm All at the bottom. The quote is the critical trust piece — full traceability to the exact transcript line.

Also includes a **"Did we miss this?"** safety net — if the meeting discussed topics with prior relevant ideas and none came up, agent flags them as "want to flag for next time?"

**Capture confidence:** start conservative (Phase 2 default) — all proposed items shown for confirmation. Once accuracy is high and founders are just tapping Confirm All, flip to aggressive mode and skip the confirmation step.

---

## Meeting philosophy shift

Most founder meetings waste time on status updates that could have happened async. With this system, the pre-meeting brief handles status transfer before anyone shows up. Meetings become focused on the work meetings are actually good for: hard decisions, creative discussion, alignment, human stuff. Post-meeting, agent absorbs new commitments and updates the wiki. Meetings become **less** work because the bookkeeping is handled before and after.

Over time: "raise, prep, discuss, decide, execute" replaces "raise, discuss, research, table, raise again next meeting." Fewer items ping-pong across meetings waiting for information.

---

## Home screen lanes section — design principle

The three founder cards in the Lanes section must be visually identical in size, shape, and treatment. No founder's lane can look more important than another's. No metrics, no task counts, no scoreboard. Just three parallel tracks of work made ambient. This is the jealousy-prevention dynamic rendered into the visual design.

The only differentiator is a small color dot or border in the founder's assigned color (Shawn=teal, Mark=coral, Michael=sage). Recent-updated markers are allowed but kept subtle. Never any metric that invites comparison.

---

## Radar page design rules

Radar has three zones with explicit thresholds:

- **Red** (handle this week) — license ≤14 days, loop stale 14+ days, carrier term/rate change, legal deadline
- **Yellow** (on the horizon) — license ≤60 days, loop stale 7+ days, prep not done day of meeting, Aetna/partner communication quiet 7+ days
- **Sage** (watching, no action) — license ≤90 days, known upcoming events, things the system is monitoring

Items auto-promote and demote between zones. Handled items disappear. Empty radar doesn't render — the app rewards you for a clean slate.

**Test:** if radar stresses Mark out when he opens it in the morning, thresholds are wrong. If it reassures him nothing is slipping, it's doing its job.

---

## Brainstorm harvesting for meetings

Before each scheduled meeting, agent scans all three founder brainstorms since the last meeting and extracts:
- Explicit "for next meeting" notes
- Questions that reference shared topics
- Ideas that touch active initiatives
- Complaints or concerns about shared work

These become a **"From the brainstorms"** section of the pre-meeting brief, attributed neutrally ("a note from Mark's brainstorm," not "Mark complained about"). Harvest is read-only — original brainstorm entries are never modified.

---

## Things explicitly NOT to build

- Push notifications (except narrow fire-alarm tier)
- Badges, red dots, unread counters
- Per-page permissions
- Dashboard-style metrics scoreboards
- Anything that makes one founder's output visible as a number
- Real-time AI during meetings (except opt-in Research Mode)
- Automatic deletion of anything
- Data entry forms with multiple fields
- Separate apps for different functions (it all lives in the wiki)

---

## Naming philosophy

Working names: **Trifecta Benefits** / **TriBe**. Logo treatment: TriBe with coral B, rest white or dark. Tagline: *"As you serve, you deserve."* Regional editions (Florida, Utah, etc.) skin the client-facing marketing with local landscape photography while the core brand stays stable. The founder app uses the brand language but with a calmer warm cream background instead of atmospheric photography — save photography for moments that earn it (login screen, welcome splash).

Brand philosophy: warm, teaching-as-empathy, reciprocal. Michael's training approach to agents flows through into how agents treat clients. The tagline works in both directions — clients serving and deserving, founders pouring into the business and having the system pour back into them.

---

## Deferred to later phases (explicit reminders)

**Phase 2:** Cap self-hosting, meeting processor, pre-meeting brief generation, post-meeting confirmation, Shawn's EDE watcher, iMessage reader, reimbursement auto-population, basic keyword→semantic search, confidence tagging on updates.

**Phase 3:** Semantic transcript search, Mark and Michael watchers, idea re-surfacing triggers, wiki-librarian weekly health checks, idea-to-execution metrics surfacing, "Did we miss this?" post-meeting safety net, Related ideas ambient sidebar on wiki pages.

**Phase 4 (polish):** Fire-alarm narrow notifications, Research Mode opt-in, regional skinning beyond Florida, communications drafter, licensing tracker agent, revenue tracker, anything that emerges from actual usage.

---

*End of design decisions companion. If anything in Phase 2+ is unclear during implementation, the answer is probably in this file. If it isn't, the answer is to start a new conversation with this document as context and extract the missing decision then.*
