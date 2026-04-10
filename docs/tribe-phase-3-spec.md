# TriBe Founders App — Phase 3 Spec

*Intelligence Layer — self-healing wiki, idea resurfacing, second founder onboarding*

**Prerequisite:** Phase 2 running stable for at least 3 weeks. Meeting capture and at least one email watcher are producing reliable output. The three founders are reading the wiki regularly and trusting what they find.

**Duration estimate:** 4-6 weeks.

**Philosophy:** Phase 3 is when the wiki stops being a passive recorder and becomes an active memory. It starts surfacing old ideas at the right moments, catching things the group missed, noticing patterns in how the team operates, and self-healing its own contradictions. This is the phase where Mark and Michael stop saying "the wiki is useful" and start saying "the wiki is weirdly helpful — it just reminded me of something from April that I'd completely forgotten about."

---

## What Phase 3 Adds

### Self-healing wiki
- Wiki-librarian agent running weekly health checks
- Automatic contradiction detection across pages
- Stale content surfacing (pages not touched in 30+ days get flagged)
- Broken cross-reference repair
- The weekly "This Week" summary auto-generated (no more manual entries)

### Idea resurfacing
- Trigger-based surfacing in pre-meeting briefs (topic match, precondition true, search activity, contradiction/confirmation)
- The "Worth Revisiting" section in pre-meeting briefs
- Post-meeting "Did we miss this?" safety net
- Ambient "Related ideas" sidebar on wiki pages

### Second and third founder watchers
- Mark's Gmail connected, his first watcher written
- Michael's Gmail connected, his first watcher written
- Shared Gmail (founders@tribebenefits.com) connected for business-wide watching
- Watcher template made discoverable via "How to add a watcher" wiki page

### Cycle-time metrics
- Timestamp tracking across Group Table lifecycle (raised → prep done → decided → executed)
- Monthly "how we're operating" notes in the Monday brief
- Trends surfaced neutrally — never as blame

### Parked intentions resurfacing
- The "we should fly out to meet each other" pattern
- Periodic gentle surfacing in pre-meeting briefs ("this has been parked since April")
- Graduation to active lane item when the group commits to a date

---

## Phase 3 Scope Boundaries

### In scope
Everything above, plus:
- Confidence level refinement based on Phase 2 accuracy data
- Watcher template UI (a form-based watcher creator for non-technical founders)
- Automatic decision record creation when Group Table items resolve
- Automatic archival flow (with founder confirmation on the home screen)

### Explicitly deferred to Phase 4
- Fire-alarm notifications
- Research Mode real-time meeting surfacing
- Regional skinning beyond Florida
- Communications drafter agent
- Licensing tracker as its own agent
- Revenue tracker (comes online when commissions start flowing in June)
- Public-facing TriBe marketing site integration

---

## Build Sequence

### Week 1 — Wiki-librarian agent

1. **Build the librarian agent** — scheduled to run every Sunday night. Reads the entire wiki (not raw), produces a structured report: pages updated this week, contradictions detected, stale pages (>30 days untouched), broken cross-references, items that should have had decision records but don't, open loops aging into warning zones.
2. **Wire the weekly report** into the home screen as the "This Week" section. Phase 1 and 2 had it manual; now it auto-populates from the librarian's output.
3. **Contradiction detection** — specifically look for inconsistencies between scenarios (base/conservative/stretch), between lane status and radar state, between decision records and current page state. Flag in a dedicated "Needs reconciliation" card that appears on the home screen only when populated.
4. **Test with real data** — let Phase 2 have produced a few weeks of content. Run the librarian manually first, read the output with all three founders, tune the report structure based on what's useful vs. noise.

### Week 2 — Idea resurfacing triggers

5. **Build the trigger engine** — separate agent that runs as part of the pre-meeting brief generator. Takes the meeting agenda topics (from brainstorms, calendar descriptions, recent chat traffic) and the idea library. For each idea, checks the five triggers from the design decisions doc: topic match, precondition met, explicit revisit date, search activity, contradiction/confirmation.
6. **Surface matched ideas** in a dedicated "Worth Revisiting" section of the pre-meeting brief. Maximum 2-3 items per brief. Each with the original quote, date, and the reason the agent is surfacing it now.
7. **Post-meeting "Did we miss this?"** — after the meeting is processed, agent checks whether any relevant ideas from the library matched the meeting topics but weren't discussed. Flags them at the bottom of the review screen as "these touched on what you talked about — worth flagging for next time?"
8. **Test on real meetings** — let the trigger engine run on a month of real meetings and ideas. Expect to tune which triggers are too sensitive and which miss obvious matches.

### Week 3 — Second and third founder onboarding

9. **Build the watcher creator UI** — a form-based version of the watcher template that Mark or Michael can fill out on their phone without touching a markdown file. Fields match the template: what to watch, which account, which lane to update, what to ignore. Submit creates the watcher file in the repo.
10. **Connect Mark's Gmail** — walk him through the Gmail MCP auth flow. Write his first watcher together (probably Aetna partnership or whatever his most active external relationship is at the time). Let it run a week and confirm his lane updates from it.
11. **Connect Michael's Gmail** — same flow. First watcher is probably for agent recruitment or a specific carrier conversation he's leading.
12. **Connect the shared Gmail** (founders@tribebenefits.com, assuming it exists by now). This becomes the watcher for business-level signals — Namecheap, Stripe, carrier broadcast emails, anything that isn't tied to one founder.

### Week 4 — Cycle-time metrics + parked intentions

13. **Add timestamp tracking** to the Group Table data model. Every state transition writes a timestamp: when raised, when prep marked done, when decided, when executed. This should be invisible to founders — just metadata the agent maintains.
14. **Build the rolling metrics view** — small section on the wiki that shows averages for the last 30 days. Raised→decided days, decided→executed days, breakdowns by category (brand, operational, financial). Surface neutrally, no founder-level blame.
15. **Monthly "how we're operating" note** in the Monday brief for the first meeting of each month. One paragraph from the agent summarizing cycle-time trends and flagging anything that changed notably.
16. **Parked intentions resurfacing** — every 4 weeks, the pre-meeting brief surfaces any parked intentions in a "still parked" section. Gentle reminder, not nagging. If you explicitly dismiss one ("we're not doing this"), it archives. If you act on one, it becomes a real lane item.

### Week 5-6 — Polish and integration

17. **Tune everything** — this phase involves a lot of subtle adjustment. Contradiction detection will be too sensitive at first. Idea resurfacing will miss obvious matches or surface irrelevant ones. The weekly librarian report will be too long or too short. Budget real time for refinement.
18. **Update the home screen** — several cards now have live data flowing into them that was manual in earlier phases. Make sure visual treatment reflects that (small timestamps on auto-updated content, source links, confidence markers).
19. **Ship the archival flow** — when the agent wants to archive a partner or close a loop involving another founder, it posts the proposal to a "Needs confirmation" card on the home screen. One founder taps Confirm or Reject. Confirmed items archive with full audit trail. This was described in Phase 1 philosophy but not actually built; Phase 3 is when it goes live.

---

## Key Technical Decisions

**Why weekly librarian, not daily:** Daily is too noisy. The wiki doesn't change that fast and a daily report becomes another thing to ignore. Weekly is the right cadence for ambient maintenance — the report lands Monday morning as part of the natural founder rhythm.

**Why ideas surface in briefs, never in real time:** The whole point of the pull-not-push philosophy is that the wiki doesn't interrupt meetings. Real-time surfacing during a conversation fragments attention at the exact moment the three of you are trying to have a human discussion. Research Mode is the opt-in exception for deep strategy sessions (Phase 4).

**Why timestamps are invisible:** Cycle-time metrics are valuable but should never feel like a productivity scoreboard. Founders should see the data only in monthly context notes, never as a live dashboard. Making the data "invisible except in aggregate" prevents it from becoming toxic.

**Why two-tier idea storage (full pages + seedlings):** Full idea pages for things Michael articulates as a real strategy. Seedlings for "maybe we should" vague thoughts. Both are captured, both are searchable, but they have different surfacing weights. Full ideas are more likely to be resurfaced; seedlings mostly sit quietly unless something directly matches.

---

## Success Criteria for Phase 3

Phase 3 is working when:

1. The weekly librarian report has caught at least one real contradiction or stale item that the founders genuinely didn't notice
2. An idea from a past meeting has been resurfaced in a pre-meeting brief and actually influenced the discussion
3. All three founders have their own email watcher running and producing accurate lane updates
4. Mark or Michael has used the watcher creator UI to add a new watcher themselves without Shawn's help
5. A parked intention has been resurfaced and either acted on or explicitly archived
6. At least one founder has opened the app and said something like "how did it know to remind me of that?"

When all six are true, the system has crossed from "useful tool" to "actual institutional memory."

---

## What to Expect to Tune

- **Idea trigger sensitivity** — resurfacing will either be too chatty (every brief has "Worth Revisiting" items that don't actually matter) or too quiet (obviously relevant ideas never come up). Expect 2-3 weeks of tuning.
- **Contradiction detection false positives** — the agent will flag "contradictions" that are actually just different phrasings. Let it learn from what founders dismiss.
- **Stale page thresholds** — 30 days might be right, might be 45. Depends on how actively you work across different areas.
- **Metric framing** — the monthly "how we're operating" note has to be carefully written. First drafts will accidentally sound like blame. Refine the prompt until it reads like a neutral friend observing patterns.

---

## Phase 3 → Phase 4 transition

By the end of Phase 3, the system is doing most of what we originally described. Phase 4 is almost entirely about polish, edge cases, and adding specialist agents for specific functions that emerge from actual use. Don't plan Phase 4 in advance — let the three of you run Phase 3 for a couple months and note what keeps being annoying or missing. That's your Phase 4 backlog.

A few things that are likely to make it into Phase 4 based on this conversation:

- **Fire-alarm narrow notifications** once you've lived with pull-only for long enough to trust yourselves to define "truly existential" correctly
- **Licensing tracker** as its own dedicated agent once real license data is in the system
- **Revenue tracker** once commissions start flowing from pod 1 in June — this is actually a natural Phase 3.5 if the timing works
- **Communications drafter** once the agent has enough tone data from your real Joseph-style emails to draft in your voice reliably
- **Research Mode** for quarterly planning if the three of you find yourself wishing the agent could participate in strategy sessions

---

## One reminder about the philosophy

As you're building Phase 3, resist the temptation to add features that weren't in this plan. Every phase has felt like "we should also add X" moments, and 90% of those X's are not actually valuable. The system you're building is already doing more than most three-founder startups ever achieve in terms of shared memory and ambient operation. Finish Phase 3 cleanly, run it for two months, and let the real gaps reveal themselves before planning Phase 4.

The goal was never to build everything. The goal was to build the minimum system that makes the business more than the sum of three founders' individual attention. By the end of Phase 3, you have that system.

---

*End of Phase 3 spec. Next review: after 2 weeks of Phase 3 real use, compile actual learnings into a Phase 4 backlog document.*
