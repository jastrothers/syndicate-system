import { z } from "zod";
import * as vm from "node:vm";
import { getSession, saveSession } from "../../services/SessionStore.js";
import { getReference } from "../../services/ReferenceStore.js";
import { shuffleArray, expandCardTemplates } from "../../services/DeckService.js";
// Helper function to process decks internally inside macro to avoid circular handler imports
async function instantiateDeckFromReference(session, deckId, referenceName, game, version, shuffle = true) {
    const ref = await getReference(referenceName, game, version);
    if (!ref)
        throw new Error(`Reference '${referenceName}' not found.`);
    let cards;
    try {
        cards = JSON.parse(ref.content);
        if (!Array.isArray(cards))
            throw new Error();
    }
    catch (e) {
        throw new Error(`Failed to parse reference '${referenceName}' content as JSON card array.`);
    }
    const deck = expandCardTemplates(cards);
    if (shuffle)
        shuffleArray(deck);
    session.state[deckId] = deck;
    session.ledger.push({
        timestamp: new Date().toISOString(),
        actionType: "create_deck_from_reference (macro)",
        actor: "System",
        data: { deckId, referenceName, totalCards: deck.length, uniqueCards: cards.length, shuffled: shuffle },
    });
}
export const evaluateGameStateTool = {
    name: "evaluate_game_state",
    description: "Evaluates a JavaScript expression against the current game state to compute derivations or perform math. The game state is available as the `state` variable.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        expression: z.string().describe("A real JavaScript expression string to evaluate. Must return a JSON-serializable value (e.g. 'state.lifePoints - state.robinsonHand.reduce((s, c) => s + c.value, 0)')."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        // Create a new context passing only the state
        const context = vm.createContext({
            state: JSON.parse(JSON.stringify(session.state)), // deep clone for safety
        });
        try {
            const result = vm.runInContext(args.expression, context, {
                timeout: 1000,
            });
            return {
                content: [{ type: "text", text: JSON.stringify({ result }, null, 2) }],
            };
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            throw new Error(`Failed to evaluate expression: ${errorMessage}`);
        }
    },
};
export const setupGameFromManifestTool = {
    name: "setup_game_from_manifest",
    description: "Looks up a saved reference containing a JSON manifest and batch-processes deck generation and state updates in a single call.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        manifestReferenceName: z.string().describe("The name of the reference containing the setup manifest."),
        game: z.string().optional().describe("Optional game context constraint."),
        version: z.string().optional().describe("Optional version context constraint."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const ref = await getReference(args.manifestReferenceName, args.game, args.version);
        if (!ref) {
            throw new Error(`Reference '${args.manifestReferenceName}' not found.`);
        }
        let manifest;
        try {
            manifest = JSON.parse(ref.content);
        }
        catch (e) {
            throw new Error(`Failed to parse manifest reference '${args.manifestReferenceName}' as JSON.`);
        }
        if (manifest.decks && Array.isArray(manifest.decks)) {
            for (const deckReq of manifest.decks) {
                if (deckReq.deckId && deckReq.referenceName) {
                    await instantiateDeckFromReference(session, deckReq.deckId, deckReq.referenceName, args.game, args.version, deckReq.shuffle !== false);
                }
            }
        }
        if (manifest.state && typeof manifest.state === "object") {
            session.state = { ...session.state, ...manifest.state };
            session.ledger.push({
                timestamp: new Date().toISOString(),
                actionType: "update_game_state (macro)",
                actor: "System",
                data: { keysUpdated: Object.keys(manifest.state) },
            });
        }
        await saveSession(args.sessionId, session);
        const decksCreated = manifest.decks?.filter((d) => d.deckId && d.referenceName).map((d) => d.deckId) || [];
        const stateKeysUpdated = manifest.state ? Object.keys(manifest.state) : [];
        return {
            content: [{ type: "text", text: JSON.stringify({ decksCreated, stateKeysUpdated }, null, 2) }],
        };
    }
};
export const executeMacroActionTool = {
    name: "execute_macro_action",
    description: "Executes a Javascript snippet from a reference inside a sandbox with write-access to the game state. Useful for executing complex turn logic. Sandbox globals: `state` (mutable game state), `ledger` (action log array), `inputs` (the inputs param). Helper API: `api.draw(deckId, handId, count)` → drawn cards array, `api.move(entityId, sourceId, targetId)` → boolean, `api.shuffle(deckId)` → void, `api.log(msg)` → console log. Timeout: 2 seconds.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        macroScriptReferenceName: z.string().describe("The name of the reference containing the Javascript macro code."),
        game: z.string().optional().describe("Optional game context constraint."),
        version: z.string().optional().describe("Optional version context constraint."),
        inputs: z.record(z.string(), z.unknown()).optional().describe("Optional JSON record of inputs to pass into the script as `inputs`."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const ref = await getReference(args.macroScriptReferenceName, args.game, args.version);
        if (!ref) {
            throw new Error(`Reference '${args.macroScriptReferenceName}' not found.`);
        }
        const scriptCode = ref.content;
        let modified = false;
        const context = vm.createContext({
            state: session.state, // Direct mutable reference
            ledger: session.ledger, // Allow custom action logging
            inputs: args.inputs || {},
            api: {
                draw: (deckId, handId, count) => {
                    if (!Array.isArray(session.state[deckId]))
                        session.state[deckId] = [];
                    if (!Array.isArray(session.state[handId]))
                        session.state[handId] = [];
                    const deck = session.state[deckId];
                    const hand = session.state[handId];
                    const drawn = deck.splice(0, count);
                    hand.push(...drawn);
                    modified = true;
                    return drawn;
                },
                move: (entityId, sourceId, targetId) => {
                    if (!Array.isArray(session.state[sourceId]))
                        return false;
                    if (!Array.isArray(session.state[targetId]))
                        session.state[targetId] = [];
                    const source = session.state[sourceId];
                    const target = session.state[targetId];
                    const index = source.findIndex((i) => i === entityId || (i && i.id === entityId) || (i && i.name === entityId));
                    if (index !== -1) {
                        target.push(source.splice(index, 1)[0]);
                        modified = true;
                        return true;
                    }
                    return false;
                },
                shuffle: (deckId) => {
                    if (!Array.isArray(session.state[deckId]))
                        return;
                    shuffleArray(session.state[deckId]);
                    modified = true;
                },
                log: (msg) => {
                    console.log(`[Macro Log] ${msg}`);
                }
            }
        });
        try {
            const result = vm.runInContext(`(function() { ${scriptCode} \n})()`, context, {
                timeout: 2000,
            });
            if (modified) {
                session.ledger.push({
                    timestamp: new Date().toISOString(),
                    actionType: "execute_macro_action",
                    actor: "System",
                    data: { script: args.macroScriptReferenceName, inputs: args.inputs, result },
                });
            }
            // Always save the session as macros usually mutate state directly
            await saveSession(args.sessionId, session);
            return {
                content: [{ type: "text", text: JSON.stringify({ result, modifiedState: true }, null, 2) }],
            };
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            throw new Error(`Failed to execute macro script: ${errorMessage}`);
        }
    }
};
export const macroTools = [evaluateGameStateTool, setupGameFromManifestTool, executeMacroActionTool];
