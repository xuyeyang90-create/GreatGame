# Traits System

## Trait categories

Traits are intentionally simple and story-flavored.

There are two categories:
- innate traits: visible at birth
- growth traits: revealed later at age milestones

Each character should have a small number of traits:
- 1 to 2 innate traits
- 0 to 2 growth traits

## Inheritance sources

Trait inheritance can come from:
1. gene-triggered inheritance
2. forced family inheritance
3. atavism / mutation

### 1. Gene-triggered inheritance
Use hidden genetic conditions or hidden breeding gene tendencies.

### 2. Forced family inheritance
If one or both parents have a family-coded trait, the child may inherit it directly with a moderate probability.

Suggested:
- one parent has it => 25% to 35%
- both parents have it => 60% to 80%

### 3. Atavism / mutation
Low-probability, story-like inheritance from ancestor flavor, unusual gene spread, or volatility.

## Trait timing

### Innate traits
Appear at birth.

### Growth traits
Reveal at age milestones.

Suggested milestones:
- end of growth stage: first growth trait reveal
- after reaching maturity or after first meaningful mission experience: second growth trait reveal

Codex should implement growth traits as hidden pending entries generated at birth, then revealed later.

## Innate trait list for MVP

### Photogenic
Effects:
- appearance +8
- better suitability for first-impression or elite targets

Source:
- gene-triggered

### Talkative
Effects:
- eloquence +8
- less dependent on fully unlocked clues

Source:
- gene-triggered or forced family inheritance

### Calming Presence
Effects:
- gentleness +8
- lower failure tendency on sensitive targets

Source:
- gene-triggered

### Emotionally Stable
Effects:
- stability +8
- lower loyalty drain on missions

Source:
- gene-triggered or forced family inheritance

### Pressure Resistant
Effects:
- less health wear on difficult infiltrations
- smaller overwork penalties

Source:
- gene-triggered

### Long-Lived Tendency
Effects:
- better lifespan potential
- decline starts later
- health loss contributes less to aging wear

Source:
- constitution-linked gene trigger or atavism

### Frail
Effects:
- constitution -8
- slower health recovery
- harsher pregnancy burden

Source:
- defect expression

### Subfertile Body
Effects:
- lower conception chance
- slightly higher gestation risk

Source:
- defect expression or atavism

### Cold Affect
Effects:
- gentleness -6
- slower loyalty recovery
- slightly more resistant to charm pressure from intense targets

Source:
- defect expression or atavism

### Early Senescence
Effects:
- hidden at first, but decline begins earlier
- aging wear grows faster after mid-life

Source:
- defect expression or atavism

## Growth trait list for MVP

### Attachment Formed
Reveal:
- end of growth stage

Effects:
- loyalty restores faster
- performs better when kept in familiar roles
- suffers a small penalty when frequently reassigned

Source:
- forced family inheritance or gene-triggered

### Composed Under Pressure
Reveal:
- maturity

Effects:
- reduced loyalty loss against high-charisma targets
- lower late-mission failure risk

Source:
- gene-triggered

### Social Instinct
Reveal:
- maturity

Effects:
- better assignment matching
- less clue spending needed for acceptable pairing

Source:
- gene-triggered or atavism

### Over-Sensitive
Reveal:
- end of growth stage

Effects:
- stronger loyalty loss against intense targets
- better performance in gentler / care-oriented scenarios

Source:
- gene-triggered

### Protocol Drift
Reveal:
- maturity

Effects:
- hidden protocol stability decreases
- more likely to refuse, vanish temporarily, or later break away under long high-pressure use

Source:
- negative growth outcome, defect amplification, or MND tendency

### Self-Awareness
Reveal:
- maturity

Effects:
- not purely negative
- can improve performance with nuanced targets
- but long repetitive exploitation raises the chance of self-directed withdrawal

Source:
- atavism, mutation, or volatile mental tendency

### Bloodline Echo
Reveal:
- maturity

Effects:
- one main stat gets an extra +5
- family tag passes more easily to descendants

Source:
- atavism

### Protects Same Line
Reveal:
- end of growth stage

Effects:
- greater loyalty stability when close bloodline members remain in the lab
- rewards maintaining a core line

Source:
- forced family inheritance

### Self-Repair
Reveal:
- maturity

Effects:
- improved passive health recovery
- less long-term wear from repeated assignments

Source:
- longevity-growth outcome

### Overwork Sensitive
Reveal:
- maturity

Effects:
- health drops faster during repeated deployments
- looks fine early, becomes costly later

Source:
- negative growth outcome

## Story event guidance

Traits should create understandable consequences, not random punishment.

Example chain:
- visible loyalty can stay moderate
- hidden protocol stability can still decay
- with Protocol Drift or Self-Awareness, repeated pressure can trigger:
  - refusal
  - temporary disappearance
  - permanent withdrawal
  - exposure increase

Do not make "high loyalty but random betrayal" happen without supporting hidden logic.
