# AGENTS.md

## Repository goals

This repository is a Phaser + Vite + TypeScript browser game prototype.

The game loop is:
1. manage a bio-lab
2. assign adult female operatives to multi-day infiltration / companionship missions
3. earn money and authorized paternal samples
4. breed the next generation
5. manage age, health, loyalty, pregnancy, exposure risk, and bloodline quality



## Working style

- Read `README.md`, `GAME_BRIEF.md`, `BREEDING_SYSTEM.md`, `TRAITS_SYSTEM.md`, and `TASKS.md` before making changes.
- Propose a short implementation plan before non-trivial edits.
- Keep the project runnable at all times.
- Prefer small, reviewable changes over sweeping rewrites.
- Reuse the existing Phaser scene structure unless there is a clear reason not to.
- Keep interfaces concise. When adding new systems or content, prioritize using buttons to open new windows.
- Use simple placeholder UI and shapes first. Do not block implementation on art polish.
- Prefer deterministic, data-driven TypeScript structures over hard-coded special cases.

## Technical rules

- Use TypeScript.
- Prefer Phaser-native solutions.
- Keep state serializable where practical.
- Put reusable gameplay data in dedicated config / data files.
- Separate visible stats from hidden simulation values.
- Avoid new production dependencies unless strictly necessary.
- Do not add a backend, auth, analytics, or monetization in this phase.

## Game design rules

- Support both visible values and hidden simulation values.
- Visible values include: age, life stage, health, stamina, loyalty, main stats, tags, defects, state.
- Hidden values may include: genotype, bloodline tags, protocol stability, aging wear, latent growth traits, hidden defects.
- Near-incest penalties must be represented mainly by higher hidden-defect expression and higher negative-trait risk, not by a flat universal stat penalty.
- Twins and miscarriage are low-probability easter eggs, not core loops.
- Distinguish clearly between:
  - innate traits: shown at birth
  - growth traits: revealed at age milestones
- Trait inheritance can come from:
  - gene-triggered inheritance
  - forced family inheritance
  - atavism / mutation
- Age, health, and lifespan must materially affect infiltration and breeding decisions.

## UX rules

- The UI must help the player answer:
  - who should go infiltrate now
  - who should rest now
  - who is worth breeding
  - which pair is risky
  - which bloodline is worth preserving
- Show summaries and labels before exposing raw simulation detail.
- Avoid overwhelming players with raw gene strings in the main UI.
- Present breeding predictions as tendencies and risk bands, not exact outcomes.

## Definition of done

A feature is only done when:
- the relevant scene / UI path is usable
- the hidden simulation updates correctly when advancing one day
- the player can understand the result from the UI
- code is reasonably structured and explained
- the project still runs locally

## Validation

After meaningful edits:
- run the relevant local command if possible
- summarize which files changed
- explain remaining gaps and next recommended step
