# TriBe Founders App — Phase 2 Spec

*Capture Layer — meetings, email, iMessage, reimbursements*

**Prerequisite:** Phase 1 running stable for at least 2 weeks with real use. All three founders bookmarked and opening the app without reminders.

**Duration estimate:** 3-4 weeks of focused build time.

**Philosophy:** Phase 2 is when the wiki stops being a manual document and starts listening. Every piece of Phase 2 is a **passive capture** — meetings transcribed automatically, emails scanned for specific topics founders care about, iMessage watched for commitments and expenses. Nothing in Phase 2 pushes notifications. Everything lands in the wiki for founders to see when they check.

---

## What Phase 2 Adds

### Meeting capture pipeline
- Self-hosted Cap instance for recording
- Automatic transcription via Whisper (local or Groq API)
- Meeting processor agent that extracts tasks, decisions, ideas, open questions
- Post-meeting review screen (the mockup built in Phase 1, now wired up)
- Pre-meeting brief generator (1 hour before scheduled meetings)

### Email watcher system
- Watcher file format as specified in design decisions doc
- Gmail connector per-founder (starts with Shawn only)
- Shawn's EDE watcher as the proof-of-concept example
- Lane page auto-updates with confidence markers and source links

### iMessage integration
- Local SQLite reader for `~/Library/Messages/chat.db` on Shawn's Mac
- Scoped to founders group chat only — never other conversations
- Dollar amount pattern matching for reimbursement log
- Commitment/decision extraction for Group Table resolution
- Manual-refresh button as fallback if auto-polling fails

### Reimbursement log
- Auto-populated from iMessage dollar-amount mentions
- Settle-up checkboxes, running balances per founder
- Monthly reconciliation checkpoint

### Search upgrade
- Keyword search (Phase 1) → semantic search across wiki pages
- Raw transcript search (separate fallback path)

---

## Phase 2 Scope Boundaries

### In scope
Everything listed above, plus:
- Confidence markers on all agent updates
- Source-link rendering in the wiki UI
- "Needs confirmation" badges on inferred items
- Empty state improvements once data starts flowing

### Explicitly deferred to Phase 3
- Mark and Michael email watchers
- Idea re-surfacing triggers
- Wiki-librarian weekly health checks
- "Did we miss this?" post-meeting safety net
- Cycle-time metrics surfacing
- Related ideas sidebar on wiki pages

### Explicitly deferred to Phase 4
- Fire-alarm narrow notifications
- Research Mode real-time surfacing
- Communications drafter
- Licensing tracker agent

---

## Build Sequence

Order matters here. Each step unblocks the next.

### Week 1 — Cap + meeting capture

1. **Stand up self-hosted Cap** on a cheap cloud box (Hetzner CX22 ~$4/mo or free Oracle ARM). `git clone CapSoftware/Cap && docker compose up -d`. Point `videos.tribebenefits.com` at it. Install Cap Desktop on all three founders' machines, connect to the self-hosted server.
2. **Wire transcription** — Cap generates transcripts automatically on upload. Route completed transcripts into `raw/transcripts/YYYY-MM-DD-title.md` in the repo via a small script (webhook from Cap → GitHub commit).
3. **Test end to end** with one real meeting. The three founders record a sync on Cap, transcript lands in raw/, Shawn opens the repo and sees the file. No processing yet — just verify the pipeline works.

### Week 2 — Meeting processor agent

4. **Build the meeting processor** as a Claude Code agent with a prompt that reads new transcripts and outputs structured JSON: tasks, decisions, ideas, open questions, each with owner (if inferrable), source quote, and timestamp. Writes draft entries to `wiki/meetings/YYYY-MM-DD-proposed.md`.
5. **Wire up the post-meeting review screen** (the Phase 1 mockup `tribe-meeting-confirm.html`). Reads the proposed file, displays items with source quotes, Confirm/Edit/Skip/Confirm-All actions write back to the repo as real task entries, decision records, idea files, or Group Table items.
6. **Test with real meetings** — let the three founders run a week of syncs and review the output. Tune the extraction prompt based on what it misses or gets wrong.

### Week 3 — Pre-meeting brief + email watchers

7. **Build the pre-meeting brief generator** — scheduled job that runs 1 hour before any calendar event tagged "founders sync." Pulls from all three brainstorms (harvest only, no edits), stale lane items, radar, parked intentions, unresolved Group Table items. Writes `wiki/meetings/YYYY-MM-DD-briefing.md`.
8. **Build the watcher system** — a simple runner that reads all files in `watchers/` and executes each one on schedule. Each watcher file is parsed, the Gmail query is executed for that founder's account, matching emails are fed to a per-watcher agent that updates the target lane page.
9. **Ship Shawn's EDE watcher** as the first real watcher. Connect Shawn's Gmail via MCP. Write `watchers/shawn-ede.md` using the template from design decisions. Let it run for a few days and verify the EDE lane page updates from real CMS/ID.me emails.

### Week 4 — iMessage + reimbursements + search

10. **Build the iMessage reader** — local Python script on Shawn's Mac that reads `~/Library/Messages/chat.db`, filters to the founders group chat only, exports new messages since last run to `raw/imessage/YYYY-MM-DD.md`. Runs every 15 minutes via cron.
11. **Build the reimbursement extractor** — agent that reads new iMessage entries, pattern-matches dollar amounts with context, creates entries in `wiki/reimbursements.md`. Handles dedup against email receipts if any.
12. **Build the commitment extractor** — same raw iMessage input, but looking for commitments, decisions, or new initiatives. Updates Group Table or lane pages accordingly with source quotes.
13. **Upgrade search** — chunk and index all wiki pages and raw transcripts into a simple embedding store (sqlite-vec or similar). Wire the search bar on the home screen and wiki page to query both the wiki and raw layers. Return synthesized answers with source links.

---

## Key Technical Decisions

**Why Whisper for transcription, not a paid API:** Cap already integrates Whisper. Zero incremental cost. Quality is excellent for three-person sync meetings. If latency becomes an issue, Groq's Whisper API is nearly free and very fast.

**Why store raw iMessage as markdown instead of piping live:** Files are debuggable, versioned, recoverable. If the extractor agent makes a mistake, the raw file is the ground truth you can reprocess.

**Why one Mac reads iMessage, not a service:** Apple's iMessage is locked. The only reliable way is reading the local SQLite database. Shawn's Mac becomes the iMessage ingest point — this is a known architectural tradeoff and it's fine for a three-founder business. If Shawn's Mac is offline, iMessage capture pauses until it comes back. Messages aren't lost because iMessage itself persists them; the extractor just catches up on next run.

**Why keyword + semantic search, not just semantic:** Keyword is instant and deterministic. Semantic is better for loose questions but has latency and cost. Route based on query length — 1-3 words is keyword, longer phrases are semantic. Search bar decides which path automatically, user never thinks about it.

**Confidence levels in the agent output:**
- **high** — explicit statement in a source ("I renewed it")
- **medium** — inferred from artifact or downstream activity
- **low** — time-based fade or weak signal (never auto-apply, always surface for review)

---

## Success Criteria for Phase 2

Phase 2 is working when:

1. Three meetings in a row have been captured end-to-end (Cap → transcript → processor → review screen → confirmed entries in the wiki) with >80% accuracy on first-pass extraction
2. Shawn's EDE lane page has updated itself from at least one real email without manual editing
3. At least one reimbursement has been captured from an iMessage without anyone opening the app
4. One founder has asked the search bar a loose question and gotten a useful answer with source links
5. The post-meeting review screen has had a "Confirm All" moment where the agent got everything right

When all five are true, you're ready for Phase 3.

---

## What to Expect to Tune

These are the parts of Phase 2 that always need iteration in the first 2 weeks of real use:

- **The meeting extraction prompt** — will miss nuances in your specific way of speaking. Expect to refine it based on 5-10 real meetings.
- **Radar thresholds** — what feels yellow vs. red shifts once data is flowing. Let the first month of data inform the thresholds.
- **Dollar-amount false positives** — "that costs about $50" in a brainstorm isn't a reimbursement. Tune the pattern to require "spent," "paid," "expensed," or similar action verbs near the amount.
- **Watcher sensitivity** — EDE watcher may pick up ID.me marketing emails the first week. Tune the ignore list.

None of these are failures. They're the normal cost of moving from manual to automated capture.

---

*End of Phase 2 spec.*
