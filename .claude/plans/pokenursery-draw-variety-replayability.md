# PokéNursery Draw Variety & Replayability — Design Ideas

**Context**: After removing the evolution-speed draw engine (v0.2.0), hand size is flat 5
(+ Melody Room / Pikachu only). The user wants more ways to increase card draw through
deliberate purchases — new Bazaar cards, facilities, and evolved abilities — with varied
draw mechanics that improve replayability.

---

## Draw Mechanics from Popular Deckbuilders

### Pattern 1: Reaction Draws ("When X, draw Y")
**Source**: Dominion's Cellar/Watchtower, Legendary's Nick Fury, Aeon's End relics

A card draws when a specific condition is triggered during play. PokéNursery already has
one: **Herbal Compress** (Medicine hybrid: draw 1 when tucked). The other 3 types have
no equivalent.

**Proposed additions — one "when tucked, draw" hybrid per remaining type, each with a
distinct condition rather than identical effects:**

| Card | Type | Cost | Icons | CV | Effect |
|---|---|---|---|---|---|
| **Herbal Compress** | Medicine | 2 | 1 Med + 1 Berry | 1 | When tucked, draw 1 *(existing)* |
| **Lullaby Chime** | Song | 2 | 1 Song + 1 Toy | 1 | When tucked, if this is the 2nd+ Song card you've tucked this Day, draw 1 |
| **Foraging Bundle** | Berry | 2 | 1 Berry + 1 Medicine | 1 | When tucked, discard 1 card from hand and draw 1 (net neutral, but filters) |
| **Wind-Up Toy** | Toy | 2 | 1 Toy + 1 Song | 1 | When tucked to a baby with 3+ icons already accumulated, draw 1 |

Each rewards a different sub-strategy:
- **Lullaby Chime**: rewards Song-type concentration
- **Foraging Bundle**: rewards hand quality awareness (filtering over raw count)
- **Wind-Up Toy**: rewards caring for babies you've already invested in

---

### Pattern 2: Faction/Type Synergy Draws ("If you've played 2+ of X type this Day")
**Source**: Star Realms ally abilities, Legendary team bonuses

Draws trigger based on how many cards of a single type you've used in one turn. Rewards
specialization. The tension: concentrating a type improves chain draw but reduces hand
versatility.

**Proposed — "Synergy" tier Bazaar cards (Cost 2, CV 2, 2 icons of same type):**

| Card | Type | Effect |
|---|---|---|
| **Berry Grove Harvest** | Berry | 2 Berry icons. Synergy: tuck a 2nd Berry card this Day → draw 1 |
| **Medicine Cabinet** | Medicine | 2 Med icons. Synergy: tuck a 2nd Medicine card this Day → draw 1 |
| **Choir Rehearsal** | Song | 2 Song icons. Synergy: tuck a 2nd Song card this Day → draw 1 |
| **Toy Parade** | Toy | 2 Toy icons. Synergy: tuck a 2nd Toy card this Day → draw 1 |

One Synergy card per type, identical structure but each drives a different deck specialization.
In a mono-type deck these chain reliably; in a mixed deck they rarely trigger.

---

### Pattern 3: Burst Draw ("Draw X now, no ongoing effect")
**Source**: Dominion's Smithy (+3 draw), Laboratory (+2 draw), Clank!'s Secret Tome

A high-cost card that spikes your hand size for a single turn. Currently PokéNursery has
no burst draw at all.

**Proposed — "Care Surge" hybrid (Cost 3, CV 1, 2 split icons):**
> **Care Surge** — 1 Berry + 1 Toy. When tucked, draw 2 cards immediately.

High cost (3), low CV (1), modest icons (2 split), but the burst lets you chain into a massive
action turn — e.g., buy premium cards you couldn't otherwise afford, or complete an evolution
in one push. Worth buying when engineering a big evolution Day.

---

### Pattern 4: Filtering ("Look at top X, keep 1" or "Discard for draw")
**Source**: Dominion's Harbinger/Sentry, Aeon's End's Scrying Glass, Harry Potter's Remembrall

You don't draw *more* cards, but you see better ones. The most skill-expressive draw mechanic —
rewards knowing exactly what you need. Currently only Jynx's evolved ability does this.

**Proposed — new "Careful Review" hybrid (Cost 2, CV 1, 1 Med + 1 Song):**
> When tucked, look at the top 2 cards of your draw pile; draw 1 of them now (put the other
> back on top in any order).

**Proposed — new "Sorting Shelf" facility (Cost 2, 1 Rep):**
> During Morning Provisions, look at the top 3 cards of your draw pile before drawing. Draw
> them in any order you choose. (Does not increase draw count — just controls order.)

Sorting Shelf is the cleanest facility addition: no draw inflation, pure skill upgrade.

---

### Pattern 5: Permanent In-Play Cards ("Helpers" / Constructs)
**Source**: Ascension's Constructs (ongoing bonuses from play zone), Thunderstone equipment

Cards that once purchased go into a permanent "Helper Zone" on the nursery board — not your
deck. They provide a daily bonus every turn without cycling. Currently only Facilities do this.

**Proposed — "Helper" card type (new category, 2-3 Helper slots on nursery board):**

When purchased from a separate Helper display (3 face-up), place directly in your Helper Zone
(not your deck). Active every Day until game end.

| Card | Cost | Rep | Effect |
|---|---|---|---|
| **Nurse Joy's Clipboard** | 3 | 0 | Draw +1 card during Morning Provisions each Day |
| **Baby Monitor** | 2 | 0 | Once per Day, when you tuck to a baby with 3+ tucked cards already, draw 1 |
| **Sticker Chart** | 2 | 1 | Once per Day, when a Pokémon evolves, draw 2 cards immediately |
| **Care Journal** | 3 | 1 | Once per Day, when you trigger a Nurture Burst, draw 1 card |

These interact with the Stockroom Depth Bonus (Care Journal + Harmony Bloom on Togetic is a
strong build-around). Most replayability impact of any proposal here — 3 random Helpers in
the display each game creates a different meta every session.

> **Complexity note**: Requires a new board zone and card category. Best suited to a second
> design pass rather than immediate implementation.

---

### Pattern 6: Milestone Draw ("Once your deck has X…")
**Source**: Dominion: Renaissance Projects, Clank! In! Space! achievements, Slay the Spire relics

A one-time facility that permanently unlocks after hitting a deck-size threshold. Directly
reinforces the Stockroom Depth Bonus scoring path.

**Proposed — "Grand Stockroom" facility (Cost 4, 2 Rep):**
> Once you have 10+ non-starting Bazaar cards in your personal deck, draw +1 card at the
> start of each Day permanently.

High cost (4) makes it the most expensive facility. The unlock condition ensures it doesn't
pay off unless you've committed to the purchasing archetype. Thematic: a well-stocked nursery
runs more efficiently.

---

## Replayability Mechanisms (Structural)

The games with the best replayability (Dominion, Star Realms, Aeon's End) achieve it through
**variable setup**, not just card count.

### Variable Market Setup
- **Hybrid Draft**: At setup, deal 3-4 random hybrid cards face-up (instead of all hybrids
  always available). Different combinations each game change which draw synergies exist.
- **Seasonal Market**: Shuffle all 56 Bazaar cards and deal only 40 for the game. Some types
  will be scarcer, forcing adaptation.

### Baby Pokémon Rotation
- Deal only 8 of the 16 Baby Pokémon cards per game (drawn randomly). Different evolved
  abilities active each session creates distinct draw build-arounds. Togetic's Harmony Bloom
  might not appear; Pikachu's draw bonus might be unavailable.

### Evolved Ability Redesign Candidates
Current evolved abilities that could gain a draw component for more variety:

| Pokémon | Current Ability | Draw-variant idea |
|---|---|---|
| **Jigglypuff** | When tucking Song card, also tuck top of draw pile (wild icon) | Simplify to: when tucking a Song card, draw 1 |
| **Clefairy** | 1/Day, treat 1 Song icon as any type | Add: and draw 1 when you use this ability |
| **Marill** | 1/Day, swap 1 hand card with top of draw pile | Already a filtering draw — keep as-is |
| **Chansey** | 1/Day, one spent card has +1 Care Value | Add: if that card's CV reaches 3+, also draw 1 |

---

## Priority Recommendations

**Highest impact, lowest complexity:**
1. **Type-specific reaction hybrids** (Pattern 1) — 3 new cards, large build diversity
2. **Sorting Shelf facility** (Pattern 4) — purchased filtering, rewards skill
3. **Hybrid Draft / Seasonal Market setup variant** — structural, zero new rules

**High impact, medium complexity:**
4. **Synergy tier cards** (Pattern 2) — 4 new cards, enables true mono-type archetypes
5. **Care Surge burst hybrid** (Pattern 3) — 1 card, adds missing "big turn" moment
6. **Grand Stockroom facility** (Pattern 6) — ties into Stockroom Depth scoring path

**High impact, higher complexity (later phase):**
7. **Helper card type + zone** (Pattern 5) — most powerful replayability lever, needs board
   space and new component category

---

## Interaction Notes

- **Lullaby Chime + Chimecho/Togetic**: A Song-heavy deck running Lullaby Chime chains draw
  AND Nurture Burst Rep. Strong but requires specific baby draws (Chingling and Togepi).
- **Foraging Bundle + Spring Cleaning**: Bundle's discard-for-draw is essentially a free
  Spring Clean that gives you a better card. Synergy is healthy — both reward deck quality.
- **Care Surge + Blossom Greenhouse**: Tucking Care Surge (giving burst draw) into a 3-tuck
  Day also triggers Greenhouse's "next purchase costs 1 less." Deliberate combo line.
- **Grand Stockroom + Stockroom Depth Bonus**: Both reward aggressive purchasing. A player
  pursuing both is optimizing the same axis, which is coherent but may make other paths feel
  underpowered — worth watching in playtests.
