# ART_GUIDE.md

## Visual goal
A readable sci-fi lab prototype with card-based unit presentation.
The look should feel like:

- alien genetics lab
- military breeding program
- clean interface
- prototype-first

## Prototype style rules

- use simple shapes, panels, borders, and text
- use card-like containers for soldiers
- use clean contrast and readable labels
- keep visual hierarchy obvious
- prefer a dark sci-fi background with lighter panels

## What to avoid

- freeform world exploration presentation
- detailed painted art requirements
- noisy particle-heavy scenes
- tiny unreadable stat text
- decorative clutter that hides the gameplay

## Card rules

Each soldier card should be easy to scan.
At minimum, it should surface:

- unit name or ID
- generation
- role summary
- core stats
- visible genes or a compact gene summary
- defect warning if present
- selection state if chosen for breeding or battle

## Battle presentation rules

Battle can be abstract.
It should still look like a confrontation between cards.
Simple approaches are fine:

- two rows of cards facing each other
- attack highlights
- damage text
- defeated cards dimming or fading out

## Animation expectations

Keep animation lightweight:

- card highlight on hover / select
- offspring reveal flip or glow
- attack flash
- defeat fade or shake

Do not spend the first implementation pass on advanced animation systems.
