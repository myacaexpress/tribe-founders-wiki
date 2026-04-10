# TriBe Founders Wiki

Private operational wiki for Trifecta Benefits LLC founding team.

## What this is

A single source of truth for three founders (Shawn, Mark, Michael) running a Florida Medicare distribution agency. Everything lives here — strategy, partners, financials, tasks, decisions, brainstorms.

## Architecture

Three layers:
- **raw/** — unedited source documents (transcripts, emails, iMessages). Sacred. Never modified.
- **wiki/** — agent-processed structured markdown. Self-healing. Where humans read.
- **CLAUDE.md** — schema and business rules. The instruction set agents follow.

## Folder structure

```
tribe-brain/
├── CLAUDE.md              # Schema + business rules (read this first)
├── app/                   # Web app code
├── raw/                   # Inputs (never edit)
│   ├── transcripts/
│   ├── imessage/
│   └── emails/
├── wiki/                  # The processed brain
│   ├── people/
│   ├── partners/
│   ├── decisions/
│   ├── operations/
│   ├── financials/
│   └── ideas/
├── founders/
│   ├── shawn/  (lane/ + brainstorm/)
│   ├── mark/   (lane/ + brainstorm/)
│   └── michael/ (lane/ + brainstorm/)
├── watchers/              # Email watcher configs (Phase 2)
└── docs/                  # Specs, PRD, design decisions
```

## Getting started

1. Read `CLAUDE.md` — it's the single source of truth for how this system works
2. Read `docs/` — phase specs and design decisions
3. The web app lives at `app.tribebenefits.com` (Phase 1)

## Phases

- **Phase 1:** Manual wiki + web app. Prove the shape. Earn trust.
- **Phase 2:** Capture layer. Meetings, email watchers, iMessage, reimbursements.
- **Phase 3:** Intelligence layer. Self-healing wiki, idea resurfacing, all watchers online.
- **Phase 4:** Polish. Fire alarms, research mode, communications drafter.
