# Bio-Lab Infiltration Prototype

A Phaser browser-game prototype about running a bio-lab, sending adult female operatives on infiltration missions, collecting money and authorized paternal samples, and breeding future generations while managing loyalty, health, aging, and exposure risk.

## Core loop

1. review lab status
2. manage the card pool
3. assign or recover operatives
4. breed when resources and health allow
5. advance one day
6. resolve mission progress, loyalty drain, pregnancy progress, births, trait reveals, health wear, and exposure events

## Current design focus

This phase focuses on:
- breeding simulation
- trait design
- age / health / lifespan
- day progression
- mission assignment support data
- risk presentation in UI

## Key visible systems

- Female cards
- Male cards
- Retrieved sample cards
- Main stats
- stamina
- loyalty for female operatives
- health
- age and life stage
- pregnancy state
- exposure risk
- tags, defects, and traits

## Local commands

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Repository docs

- `GAME_BRIEF.md` — top-level fantasy and product constraints
- `BREEDING_SYSTEM.md` — breeding, bloodline, age, health, lifespan
- `TRAITS_SYSTEM.md` — innate and growth trait design
- `TASKS.md` — implementation sequence
- `CODEX_IMPLEMENTATION_PROMPT.md` — first prompt to paste into Codex

## Implementation priorities

1. build the hidden data model
2. add day progression and lifecycle updates
3. add breeding flow and risk display
4. add mission assignment and mission-day resolution
5. reveal trait milestones and exposure pressure
6. refine UI and balancing
