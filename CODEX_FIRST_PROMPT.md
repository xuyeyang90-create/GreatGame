Read `README.md`, `AGENTS.md`, `GAME_BRIEF.md`, `TASKS.md`, `ART_GUIDE.md`, and `BREEDING_RULES.md` first.

You are working in a **Phaser + Vite + TypeScript** browser game repository.
The existing project is currently just a starter prototype and should be turned into the first playable version of this game:

**Alien soldier breeding with card-based battle presentation.**

## What to build

Build the first complete playable loop with these elements:

1. A main menu or intro screen that explains the fantasy briefly.
2. A main game screen that shows:
   - current resources
   - a roster of alien soldier cards
   - card selection state
3. A breeding flow where the player:
   - selects two mature soldiers
   - sees an inbreeding risk label before confirming
   - pays a resource cost
   - generates one child by inheriting genes from both parents
   - sees the child revealed as a new card
4. Hidden recessive defect genes as the main inbreeding penalty.
5. The ability to use soldiers in three ways:
   - keep for breeding
   - send to battle
   - scrap for resources
6. A short auto battle with card-style presentation.
7. Battle rewards that feed back into the breeding loop.

## Important design rules

- Use the rules in `BREEDING_RULES.md`.
- Do not replace the inbreeding system with a generic flat debuff.
- Keep the simulation small and readable.
- Use cards as the main visual language.
- Prefer one main hub scene unless splitting scenes clearly improves clarity.
- Keep placeholder visuals simple and clean.
- Do not over-engineer.

## Implementation approach

First do these steps before coding:

1. Summarize your understanding of the current repository.
2. Summarize the target gameplay loop.
3. Propose a short implementation plan.
4. List the files you expect to change.

Then implement the prototype.

## Technical constraints

- Prefer Phaser-native solutions.
- Keep the project runnable at all times.
- Do not add heavy dependencies.
- Use simple TypeScript data structures.
- Favor readability over abstraction.

## Gameplay constraints for this first version

- Start with a small fixed starter roster.
- Use one simple resource such as Biomass.
- Support up to 3 player battle cards.
- Keep battle resolution fast.
- No persistence required.
- No networking.
- No large campaign structure.

## After implementation

When you are done:

1. List which files changed.
2. Explain what each change does.
3. Run the relevant validation command if possible.
4. Report any remaining gaps or rough edges.
5. Suggest the next best iteration.
