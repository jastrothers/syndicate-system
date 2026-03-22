---
description: Ingesting Game Rules into the Reference Library
---

# Ingesting Raw Game Rules into Reference Modules

When a user asks you to "ingest", "break down", or "store" raw game rules, PDFs, or design notes into their Reference Library, follow these E2E steps to ensure maximum compatibility and querying potential.

## 1. Analyze the Context
First, read the provided text or file. Identify the distinct "components" of the game system. Good components are things that can be reused or swapped out (e.g., specific Spells, a generic "Movement" mechanic, standard "Conditions" like "Poisoned", or character "Archetypes").

## 2. Process and Save Iteratively
Do **NOT** save the entire rulebook as one massive reference file. Instead, call the `save_reference` tool multiple times. 
For each distinct component, extract its specific content and save it with:
- `name`: A unique identifier (e.g., `spell_fireball`, `rule_combat_movement`).
- `type`: Categorize it (valid ideas: `rule`, `spell`, `item`, `monster`, `template`, `system`).
- `tags`: Provide an array of highly searchable terms (e.g., `["magic", "aoe", "damage"]`, `["mechanics", "combat"]`).
- `content`: The focused Markdown text of just that specific rule or item.

## 3. Rebuild (Optional)
If the user complains the index isn't finding something and you suspect files were moved manually, run `rebuild_reference_index()`.

## 4. Query and Validate (Optional)
To prove to the user you saved them correctly, you can use the `list_references` tool using the tags you just applied to ensure they show up in the SQLite index!

---
**Example Prompt the User Might Say:**
> "Here's a 3-page design doc I wrote for a sci-fi hacking minigame. Please ingest these rules into my permanent reference library."

**Example Agent Action:**
*Agent reads the doc.*
*Agent calls `save_reference` 5 times:*
1. `name: "hacking_core_loop", type: "system", tags: ["hacking", "rules"]`
2. `name: "program_brute_force", type: "item", tags: ["hacking", "program", "damage"]`
3. ...etc.
