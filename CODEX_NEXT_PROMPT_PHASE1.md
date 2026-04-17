Read the repository docs first.

Task:
Implement only Phase 1 and Phase 2 from `TASKS.md` with minimal UI disruption.

Deliverables:
- TypeScript data models for cards, lineage, hidden genotype, traits, aging, health, and protocol stability
- a mock-data seed file
- day-advance simulation that updates age, stamina, health, loyalty, pregnancy progress, aging wear, life stage, and event log
- visible UI fields for age, life stage, and health on cards and lab dashboard
- no breeding UI rewrite yet unless needed for integration

Constraints:
- keep the existing Phaser scene structure
- use placeholder panels and text
- no heavy refactor unless unavoidable
- make the simulation deterministic enough to debug
- explain all new fields and files clearly
