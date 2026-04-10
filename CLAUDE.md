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
- Every status change creates a decision record in wiki/decisions/.

## Three-layer architecture (Karpathy-inspired)
- **Raw layer** — unedited sources in raw/. Sacred. Never modified by agents.
- **Wiki layer** — agent-processed structured markdown in wiki/. Self-healing via linting. Where humans read.
- **Schema layer** — this file (CLAUDE.md). The instruction set agents follow when compiling raw into wiki.

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

Ambiguous cases → one-tap "solo or group?" confirmation before routing.

## Radar thresholds
- **Red (handle this week):** license ≤14 days, loop stale 14+ days, carrier term/rate change, legal deadline
- **Yellow (on the horizon):** license ≤60 days, loop stale 7+ days, prep not done day of meeting, partner communication quiet 7+ days
- **Sage (watching, no action):** license ≤90 days, known upcoming events, things the system is monitoring

Items auto-promote and demote. Handled items disappear. Empty radar doesn't render.

## Archival rules
- Never delete partner or people pages
- Archive with date and reason to wiki/partners/archived/
- People pages outlive partnership pages — preserve contacts as warm
- Always create a dated decision record when status changes
- Flag downstream impacts (financial models, Manifesto) when archiving

## Founder lanes
- **Lanes** (founders/X/lane/) — public work log, written to cofounders. Each initiative gets its own file.
- **Brainstorms** (founders/X/brainstorm/) — private scratchpad. Agent harvests but never edits.
- Lane page shape: title, status, why it matters, next step, zone (active|exploring), reverse-chrono log.

## Group Table lifecycle
raised → (discussed) → decided → executing → complete
- Unanimous agreement required for async decisions (2/3 + silence = still "raised")
- Resolution regenerates follow-on tasks automatically
- Every Group Table item carries timestamps: raised, prep done, decided, executed

## Confidence markers on agent updates
Every agent-written entry gets tagged with confidence level and source link:
- **high** — explicit statement in source
- **medium** — inferred from artifact or downstream activity
- **low** — time-based or weak signal (never auto-apply, always surface for review)

## Tone guidance
- Warm, teaching-as-empathy (not clinical)
- Casual and relationship-forward with external partners
- Neutral and factual in decision records
- Agent surfacing of ideas: neutral framing, never credit or blame

## Founder color codes
Shawn = teal (#2b8a88)
Mark = coral (#e85d4e)
Michael = sage (#a8b5a0)

## Things explicitly NOT to build
- Push notifications (except narrow fire-alarm tier, Phase 4)
- Badges, red dots, unread counters
- Per-page permissions
- Dashboard-style metrics scoreboards
- Anything that makes one founder's output visible as a number
- Real-time AI during meetings (except opt-in Research Mode, Phase 4)
- Automatic deletion of anything
- Data entry forms with multiple fields
- Separate apps for different functions (it all lives in the wiki)
