---
trigger: always_on
globs: game-rules-system-mcp/**
---

# MCP Data & Script Consistency Rules

This project relies on a tight coupling between JSON data (rulebooks), Markdown representations (compiled rulebooks and references), and external scripts (playtest simulations). Follow these rules to ensure system-wide integrity.

## 1. Rulebook Updates

- **JSON First**: Always modify the JSON rulebook in `game-data/[game]/rulebooks/latest.json`.
- **Sync Markdown**: After any change to the JSON rulebook, you MUST call the `compile_markdown_rulebook` tool. This ensures the human-readable Markdown and the Game Viewer stay in sync.
- **Atomic Edits**: Use `update_rule` for granular changes rather than overwriting the entire JSON file manually to preserve structure and constraints.

## 2. Reference Library Updates

- **Markdown Authority**: References are stored as Markdown with frontmatter.
- **Index Rebuild**: After adding, modifying, or deleting a reference file in `game-data/[game]/reference/[version]/`, you MUST call the `rebuild_reference_index` tool. The system relies on a SQLite index for performant fallback querying.
- **Tombstoning**: To delete a reference, set `deleted: true` in its frontmatter via `save_reference(..., deleted: true)` rather than hard-deleting the file, unless a cleanup is explicitly requested.

## 3. Script & Helper Maintenance

- **Schema Awareness**: When modifying `src/types/index.ts` or game data schemas, audit all scripts in `/scripts` and the root directory (e.g., `playtest_syndicate.mjs`, `cleanup.js`).
- **Path Logic**: Use the helper functions in `src/config/paths.ts` for all file path resolutions. Never hardcode `game-data` paths in new code.
- **Sanitization**: Ensure all game names and version tags are passed through `sanitizeFileName` and `sanitizeVersionTag`.

## 4. Versioning & Snapshots

- **Snapshot Before Overhaul**: Call `create_version` before performing major mechanical changes or restructuring a rulebook. This creates a permanent recovery point.
- **Reference Versioning**: When releasing a new rulebook version, ensure a corresponding version folder exists in `game-data/[game]/reference/v[version]/` if references have diverged from `latest`.

## 5. Antigravity IDE Integration

- **Context Loading**: Always load the `latest.json` of the relevant game when beginning work on mechanics.
- **Verification Loop**: After data changes, run the relevant playtest script or a validation macro to ensure the "closed-loop" integrity of the system.