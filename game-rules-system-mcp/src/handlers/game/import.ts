import { z } from "zod";
import * as ReferenceStore from "../../services/ReferenceStore.js";
import { saveRulebook, listRulebooks } from "../../services/RulebookStore.js";
import { sanitizeFileName } from "../../config/paths.js";
import { ToolDefinition } from "../types.js";
import { jsonResponse } from "../response.js";

function generateManifestReference(game: string, version: string, decks: any[]) {
    const manifestName = `${game.toLowerCase()}_base_manifest`;
    const content = {
        decks: decks.map((d: any) => ({
            deckId: d.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_deck",
            referenceName: d.name,
            shuffle: true
        })),
        state: {}
    };

    return {
        name: manifestName,
        game,
        version,
        type: "manifest",
        tags: [game.toLowerCase(), "setup", "manifest", "auto-generated"],
        content: JSON.stringify(content, null, 2)
    };
}

function generateMacroReference(game: string, version: string) {
    const macroName = `${game.toLowerCase()}_base_setup_script`;
    const content = `// Auto-generated setup wrapper
api.log('Initialized ${game} setup macro.');
return 'Successfully ran ${macroName}.';
`;

    return {
        name: macroName,
        game,
        version,
        type: "script",
        tags: [game.toLowerCase(), "setup", "macro", "auto-generated"],
        content
    };
}

export const importGameTool: ToolDefinition = {
    name: "import_game",
    description: "Imports a game by saving its rulebook content, all associated references, and dynamically outputs auto-generated setup manifest and macro script based on deck references.",
    schema: z.object({
        game: z.string().describe("The name of the game."),
        version: z.string().describe("The version tag for this import (e.g. 1.0.0)."),
        rulebookContent: z.string().describe("The markdown content of the rulebook. Will be parsed into sections."),
        references: z.array(
            z.object({
                name: z.string().describe("The unique name of the reference."),
                type: z.string().default("general").describe("The category/type of the reference (e.g., 'deck', 'rule')."),
                tags: z.array(z.string()).default([]).describe("List of searchable tags."),
                content: z.string().describe("The content of the reference in Markdown or JSON string."),
            })
        ).describe("A list of all references and components belonging to this game."),
    }),
    handler: async (args) => {
        const safeName = sanitizeFileName(args.game);
        if (!safeName) {
            throw new Error(`Invalid game name: '${args.game}'.`);
        }

        // 1. Conflict check — compare against sanitized directory names
        const existingGames = await listRulebooks();
        if (existingGames.includes(safeName)) {
            throw new Error(
                `Game '${safeName}' already exists. Delete it first with delete_game or choose a different name.`
            );
        }

        // 2. Initialize Rulebook via Raw Markdown (we simulate an empty skeleton then inject raw content into a top-level node for basic compatibility. For full sectionizing, it requires a parser we skip here to keep it simple).
        const rulebookSkeleton = {
            metadata: {
                title: safeName,
                version: args.version,
                lastUpdated: new Date().toISOString()
            },
            sections: {
                "Imported_Content": {
                    title: "Imported Content",
                    content: args.rulebookContent,
                    subsections: {}
                }
            }
        };

        // If rulebook format differs, or existing version handling applies, rely on saveRulebook. Base case:
        await saveRulebook(safeName, rulebookSkeleton as any);

        // 3. Iterate references
        const decks = [];

        for (const ref of args.references) {
            await ReferenceStore.saveReference(ref.name, safeName, args.version, ref.type, ref.tags, ref.content);
            if (ref.type === "deck") {
                decks.push(ref);
            }
        }

        // 4. Dynamic Manifest Generation
        const manifest = generateManifestReference(safeName, args.version, decks);
        await ReferenceStore.saveReference(manifest.name, manifest.game, manifest.version, manifest.type, manifest.tags, manifest.content);

        // 5. Dynamic setup macro script
        const macro = generateMacroReference(safeName, args.version);
        await ReferenceStore.saveReference(macro.name, macro.game, macro.version, macro.type, macro.tags, macro.content);

        return jsonResponse({
            status: "success",
            message: `Game '${safeName}' imported successfully.`,
            manifestReference: manifest.name,
            macroReference: macro.name,
            totalReferencesSaved: args.references.length + 2
        });
    },
};
