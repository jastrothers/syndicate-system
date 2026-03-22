import { z } from "zod";
import { getSession, saveSession } from "../../services/SessionStore.js";
import { shuffleArray } from "../../services/DeckService.js";
import { ToolDefinition } from "../types.js";


export const drawFromDeckTool: ToolDefinition = {
  name: "draw_from_deck",
  description: "Moves a set number of entities from a named deck array in the state into a target hand array.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
    deckId: z.string().describe("State property key mapping to the deck array."),
    targetHandId: z.string().describe("State property key mapping to the hand array."),
    count: z.number().int().positive().describe("Number of items to draw."),
    actor: z.string().describe("The player drawing."),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);
    if (!Array.isArray(session.state[args.deckId])) session.state[args.deckId] = [];
    if (!Array.isArray(session.state[args.targetHandId])) session.state[args.targetHandId] = [];

    const drawn = session.state[args.deckId].splice(0, args.count);
    session.state[args.targetHandId].push(...drawn);

    session.ledger.push({
      timestamp: new Date().toISOString(),
      actionType: "draw_from_deck",
      actor: args.actor,
      data: { deckId: args.deckId, handId: args.targetHandId, count: args.count, drawn },
    });
    await saveSession(args.sessionId, session);

    return {
      content: [{ type: "text", text: `Drawn ${drawn.length} items.` }],
    };
  },
};

export const shuffleDeckTool: ToolDefinition = {
  name: "shuffle_deck",
  description: "Shuffles the array identified by deckId inside the game state.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
    deckId: z.string().describe("State property key mapping to the deck array."),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);
    if (!Array.isArray(session.state[args.deckId])) session.state[args.deckId] = [];

    shuffleArray(session.state[args.deckId]);

    session.ledger.push({
      timestamp: new Date().toISOString(),
      actionType: "shuffle_deck",
      actor: "System",
      data: { deckId: args.deckId },
    });
    await saveSession(args.sessionId, session);

    return {
      content: [{ type: "text", text: `Deck ${args.deckId} shuffled.` }],
    };
  },
};

export const moveEntityTool: ToolDefinition = {
  name: "move_entity",
  description: "Plucks an entity with the given id from the array identified by sourceId and places it in targetId array.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
    entityId: z.string().describe("The unique ID (if objects) or string scalar of the item being moved."),
    sourceId: z.string().describe("State property pointing to the source array."),
    targetId: z.string().describe("State property pointing to the target array."),
    actor: z.string(),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);
    if (!Array.isArray(session.state[args.sourceId])) session.state[args.sourceId] = [];
    if (!Array.isArray(session.state[args.targetId])) session.state[args.targetId] = [];

    const srcArray = session.state[args.sourceId];
    const targetArray = session.state[args.targetId];

    const idx = srcArray.findIndex((item: any) =>
      item === args.entityId || (item && (item.id === args.entityId || item.name === args.entityId))
    );

    if (idx === -1) {
      throw new Error(`Entity ${args.entityId} not found in ${args.sourceId}`);
    }

    const [movedItem] = srcArray.splice(idx, 1);
    targetArray.push(movedItem);

    session.ledger.push({
      timestamp: new Date().toISOString(),
      actionType: "move_entity",
      actor: args.actor,
      data: { entityId: args.entityId, sourceId: args.sourceId, targetId: args.targetId, item: movedItem },
    });
    await saveSession(args.sessionId, session);

    return {
      content: [{ type: "text", text: `Moved entity successfully.` }],
    };
  },
};

export const sessionEntitiesTools = [
  drawFromDeckTool,
  shuffleDeckTool,
  moveEntityTool,
];
