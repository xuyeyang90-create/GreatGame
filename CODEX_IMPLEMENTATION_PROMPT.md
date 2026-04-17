Read `README.md`, `AGENTS.md`, `GAME_BRIEF.md`, `BREEDING_SYSTEM.md`, `TRAITS_SYSTEM.md`, and `TASKS.md` first.

You are working in a Phaser + Vite + TypeScript browser game project.

Goal:
Implement the next playable vertical slice for a bio-lab management game with infiltration, breeding, age, health, lifespan, hidden bloodline risk, and innate / growth traits.

Important product constraints:
- All operatives are adults.
- Keep the writing and UI safe for a broad audience.
- Missions are social infiltration / companionship / intelligence-oriented, not explicit sexual content.
- Do not turn the prototype into a narrative-heavy VN. Keep it systemic and management-driven.

What the game must support:
1. Left card library with tabs:
   - Female
   - Male
   - Retrieved Samples

2. Top-right lab display:
   - current day
   - money
   - sample count
   - infiltrating count
   - pregnant count
   - exposure risk
   - recent events
   - average health
   - declining / aging count

3. Bottom-right main actions with tabs:
   - Breeding
   - Assignments

4. Female cards:
   - can infiltrate
   - can serve as mothers
   - have stamina, health, loyalty, age, life stage, traits, defects, state

5. Male cards:
   - used mainly as fathers
   - have stamina, health, age, bloodline value, traits

6. Retrieved sample cards:
   - can act as paternal sources for breeding
   - show source quality / tags

7. Advance-day simulation:
   - mission timers tick down
   - stamina / health / loyalty update
   - pregnancy days update
   - aging wear updates
   - life stage updates
   - trait reveal milestones trigger
   - event log updates
   - births / failures / withdrawals resolve

Implementation rules:
- First summarize your understanding of the design docs and the existing repo.
- Then propose a short implementation plan.
- Keep changes incremental and reviewable.
- Prefer a data-driven architecture.
- Use placeholder visuals and simple cards / panels.
- Do not add heavy dependencies.
- Keep the project runnable after each step.

Core simulation rules to implement:
- visible main stats:
  appearance, figure, aura, gentleness, eloquence, stability, constitution
- hidden genotype for visible stats
- hidden breeding genes: FEC, GES, HER, VAR, MND
- hidden defect families:
  frail, cold, subfertile, unstable, taciturn, fragile-attachment
- bloodline risk checks to grandparent depth only
- bloodline risk primarily increases defect-expression and negative-trait risk, not flat stat penalties
- age / health / lifespan must materially affect mission and breeding choices

Trait rules:
- innate traits appear at birth
- growth traits are generated at birth but revealed later
- trait inheritance can come from gene triggers, forced family inheritance, or atavism / mutation
- twins and miscarriage are rare easter eggs only

Suggested build order:
1. introduce data types and mock data
2. implement day progression and event log
3. implement breeding UI and birth resolution
4. implement innate traits and hidden pending growth traits
5. implement assignment UI and simple mission resolution
6. connect exposure risk and protocol-stability outcomes

UI priorities:
- let the player quickly answer:
  - who should infiltrate
  - who should rest
  - who is safe to breed
  - which pair is risky
  - which bloodline is worth preserving
- show readable labels and risk bands before exposing low-level details

When you finish a pass:
- list changed files
- explain what each change does
- run validation if possible
- describe remaining gaps and the next recommended implementation step
