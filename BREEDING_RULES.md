# BREEDING_RULES.md

## MVP design summary

This prototype uses a **small diploid genetics model**.
Every soldier has:

- visible core gene loci
- hidden recessive defect loci
- derived combat and breeding stats
- parent references for inbreeding checks

The game does not need to simulate full real biology.
It only needs enough inheritance logic to feel believable and produce meaningful choices.

---

## 1. Soldier data model

Each soldier should have at least:

- `id`
- `name` or short display code
- `generation`
- `fatherId` or `parentAId`
- `motherId` or `parentBId`
- `mature: boolean`
- `mainGenes`
- `hiddenDefectGenes`
- `stats`
- `manifestedDefects`
- `tags`

---

## 2. Visible main genes

Use **five visible loci** in the MVP.
Each locus has two alleles.
Use simple letter pairs.

### Main loci

1. `ATK` with alleles `A / a`
2. `DEF` with alleles `B / b`
3. `SPD` with alleles `C / c`
4. `FER` with alleles `D / d`  
   breeding efficiency / breeder quality
5. `MUT` with alleles `E / e`  
   mutation tendency / volatility flavor

### Inheritance rule

For each locus in the child:

- randomly inherit one allele from parent A
- randomly inherit one allele from parent B

Example:

- Parent A `ATK = A/a`
- Parent B `ATK = A/A`
- Child `ATK` can become `A/A` or `A/a`

---

## 3. Hidden recessive defect genes

Use **three hidden defect loci** in the MVP.
These are not the main fantasy stats. They are the core inbreeding penalty.

### Hidden defect loci

1. `FRAIL` with alleles `X / x`
   - `xx` manifests as **Frail**
   - penalty: lower max HP / lower defense value

2. `DULL` with alleles `Y / y`
   - `yy` manifests as **Dull**
   - penalty: lower speed / lower hit reliability

3. `INFERTILE` with alleles `Z / z`
   - `zz` manifests as **Low Fertility**
   - penalty: worse breeding efficiency or cannot be selected for breeding in stricter tuning

### Important rule

Do **not** treat close relation as a direct flat stat penalty.
The inbreeding penalty should come mainly from the increased chance that related parents share the same hidden recessive bad alleles, causing homozygous defects in the child.

---

## 4. Derived stats

Keep derived stats simple.
Use a small readable scale.

Suggested visible stats on the card:

- `Power`
- `Armor`
- `Speed`
- `Breed`

### Example derivation

Each main locus contributes 0 / 1 / 2 points depending on allele pair:

- homozygous weak, like `aa` = 0
- heterozygous, like `Aa` = 1
- homozygous strong, like `AA` = 2

Then map these to card stats.

Suggested mapping:

- `ATK` contributes heavily to `Power`
- `DEF` contributes heavily to `Armor`
- `SPD` contributes heavily to `Speed`
- `FER` contributes heavily to `Breed`
- `MUT` contributes a small bonus to battle swinginess or rare positive event chance

Then apply manifested defect penalties after the base stats are calculated.

---

## 5. Inbreeding risk label

Show a clear risk label before confirming breeding.
The system should at least detect:

- unrelated
- share one parent
- same two parents / full siblings
- parent-child

### Suggested labels

- `Low Risk`
- `Elevated Risk`
- `High Risk`
- `Extreme Risk`

### MVP implementation guidance

For the first version, it is enough to compare:

- direct parent-child relation
- same parents
- one shared parent
- otherwise unrelated

It is okay if cousin-level ancestry is omitted in the first pass.

---

## 6. Starting roster

The first playable version should start the player with a small roster, for example 4 soldiers.

The starting set should intentionally create meaningful choices:

- one stronger fighter
- one better breeder
- one balanced unit
- one risky but potentially powerful line

At least one starter should quietly carry a hidden defect allele so the system can demonstrate itself early.

---

## 7. Breeding flow

### Breeding step

1. Player selects two mature soldiers.
2. UI shows:
   - parent cards
   - breeding cost
   - inbreeding risk label
3. Player confirms breeding.
4. Child is generated.
5. Child appears in a reveal card.
6. Child is added to the roster.

### Cost

Use one simple resource in the MVP, such as `Biomass`.

### Suggested MVP economy

- breeding costs biomass
- scrapping grants biomass
- battle grants biomass

Optional second resource can wait.

---

## 8. Battle flow

Battle presentation should be card-based and short.
It does **not** need to be a deep deck-combat system.

### MVP battle structure

- player chooses up to 3 soldiers
- enemy team is generated or predefined
- battle auto-resolves
- units act in speed order or simple alternating order
- each attack deals damage based on Power vs Armor
- defeated cards become dimmed / crossed out
- surviving side wins

### Goals of the battle system

- prove that breeding matters
- prove that fighter vs breeder tradeoffs matter
- generate rewards that return to the breeding loop

---

## 9. Soldier uses after creation

A mature soldier should support three meaningful uses:

1. **Keep for breeding**
2. **Send to battle**
3. **Scrap for biomass**

This is enough for the MVP.
Do not add more utility branches yet.

---

## 10. UI priorities

The player must be able to answer these questions quickly:

- Which soldier is my best fighter?
- Which soldier is my best breeder?
- Are these two too closely related?
- What defects did this child manifest?
- Is this child worth keeping?

If the UI does not answer those well, simplify instead of adding more systems.
