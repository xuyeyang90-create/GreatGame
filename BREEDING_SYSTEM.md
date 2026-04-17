# Breeding System

## Design goals

The breeding system must:
- support visible stat improvement through parent inheritance
- make bloodline planning meaningful
- connect directly to mission readiness and lab sustainability
- express incest / near-incest risk mainly through hidden-defect exposure
- include age, health, and lifespan as real costs

## Visible main stats

Use these visible stats:
- appearance
- figure
- aura
- gentleness
- eloquence
- stability
- constitution

These stats affect:
- infiltration suitability
- loyalty drain resistance
- mission success tendency
- breeding value
- offspring quality

## Hidden genotype model

Each visible stat is controlled by 4 gene pairs:
- 2 major loci
- 2 minor loci

Each allele can be one of:
- S = +2
- A = +1
- N = 0
- B = -1
- C = -2

Suggested stat formula:

StatScore = 50 + MajorSum * 5 + MinorSum * 3 + TraitModifiers
Clamp to 0..100

Codex should implement the simulation in a data-driven way so the formula and locus counts can be tuned later.

## Hidden defect loci

Start with 6 hidden defect families:
- frail
- cold
- subfertile
- unstable
- taciturn
- fragile-attachment

Defects should usually matter only when expressed strongly enough, especially under close-bloodline breeding.

Suggested gameplay effects:
- frail: lower constitution, slower health recovery
- cold: lower gentleness, slower loyalty recovery
- subfertile: lower breeding success and higher pregnancy risk
- unstable: lower stability, higher mission volatility
- taciturn: lower eloquence, weaker social assignment performance
- fragile-attachment: faster loyalty loss under high-pressure targets

## Breeding-only hidden gene group

Add 5 breeding gene families:
- FEC: fertility
- GES: gestation stability
- HER: inheritance locking
- VAR: volatility / mutation tendency
- MND: mental tendency

Purpose:
- FEC affects conception success
- GES affects pregnancy stability
- HER affects how strongly a child resembles bloodline tendencies
- VAR affects extreme high / low roll spread and rare events
- MND affects later loyalty / protocol / autonomy growth tendencies

## Sex rule

Use XY logic:
- mother contributes X
- father or external sample contributes X or Y
- XX => female
- XY => male

## Breeding flow

### Step 1: select mother
Requirements:
- mature life stage
- not infiltrating
- not currently pregnant
- enough stamina
- enough health

Suggested baseline gate:
- stamina >= 50
- health >= 60

### Step 2: select father or retrieved sample
Possible sources:
- male card
- retrieved external sample

### Step 3: show breeding summary
Show:
- estimated success chance: high / medium / low
- bloodline risk: low / medium / high / extreme
- gestation risk: low / medium / high
- mental risk: stable / volatile / highly volatile
- projected child tendency: e.g. "high appearance, high eloquence, unstable mind"

Do not show exact final child stats.

### Step 4: pay cost and start pregnancy
Consumes:
- money
- one breeding slot
- mother stamina
- possibly sample durability / usage

### Step 5: pregnancy days
Pregnancy lasts several in-game days.
Each day:
- reduce remaining days
- consume some mother health
- increase risk if she is still overworked
- keep her unavailable for infiltration

### Step 6: birth resolution
On completion:
- roll sex
- roll rare easter eggs
- generate child genotype
- evaluate expressed defects
- generate innate traits
- generate latent growth traits
- generate life expectancy potential

## Age, health, and lifespan

### Separate stamina from health
- stamina = short-term energy
- health = long-term bodily condition

### Age
Advance all characters by one day when the player advances one day.

### Life stages
Suggested:
- infant: 0-6 days
- growth: 7-17 days
- mature: 18+ days
- prime / decline / aging can be computed from actual lifespan progress instead of fixed age bands

### Lifespan potential
A character has:
- hidden lifespan potential at birth
- actual aging wear accumulated through use

Lifespan potential is influenced by:
- constitution
- inherited longevity tendency
- defects
- bloodline risk

Aging wear increases each day, plus extra from:
- poor health
- pregnancy
- childbirth
- repeated high-pressure infiltration
- chronic overwork

### Health consumption
Health should be consumed by:
- some infiltration assignments
- pregnancy
- childbirth
- chronic overwork
- low-recovery loops

Health should be restored slowly by:
- rest
- medical recovery actions
- certain traits

## Bloodline risk

### Kinship depth for MVP
Check to grandparents only.

### Risk bands
- low: no meaningful overlap
- medium: shared grandparents
- high: one shared parent
- extreme: full siblings or direct line

### Effects
Bloodline risk should mainly do:
- raise hidden-defect expression risk
- raise negative growth-trait risk
- slightly worsen gestation safety

Do not apply a flat universal stat penalty.

## Rare easter eggs

Keep these rare and non-core.

### Twins
- low base chance, around 2%
- may rise slightly with specific hidden factors
- produce two children from one pregnancy
- usually one stronger and one weaker, or both slightly more average
- can share one family tag

### Miscarriage
- very low base chance
- meaningfully higher only with poor health, subfertility, extreme risk, or pregnancy stress
- returns partial resources at most
- imposes a significant health penalty on the mother

## Child outputs

Every newborn should get:
- sex
- age = 0
- life stage = infant
- visible stat values
- defects that are currently visible if expressed
- innate traits
- latent growth traits
- health, stamina, and lifespan potential
- lineage info: mother, father / sample source, grandparents if known, bloodline tag
