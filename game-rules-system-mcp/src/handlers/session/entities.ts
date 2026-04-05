import { z } from "zod";
import { getSession, saveSession } from "../../services/SessionStore.js";
import { shuffleArray, insertIntoArray } from "../../services/DeckService.js";
import { ToolDefinition } from "../types.js";
import { jsonResponse } from "../response.js";

export const zoneActionTool: ToolDefinition = {
  name: "zone_action",
  description:
    "Performs a mutating action on session state arrays. action='draw' moves N entities from a deck to a hand; action='shuffle' shuffles an array in place; action='move' plucks a specific entity from one array to another; action='insert' places cards at top/bottom/index of a deck.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
    action: z.enum(["draw", "shuffle", "move", "insert"]).describe("The mutating operation to perform."),
    // draw params
    deckId: z.string().optional().describe("(draw/shuffle/insert) State property key of the deck array."),
    targetHandId: z.string().optional().describe("(draw) State property key of the target hand array."),
    count: z.number().int().positive().optional().describe("(draw) Number of items to draw."),
    // move params
    entityId: z.string().optional().describe("(move) Unique ID, name, or scalar value of the entity to move."),
    sourceId: z.string().optional().describe("(move) State property pointing to the source array."),
    targetId: z.string().optional().describe("(move) State property pointing to the target array."),
    // insert params
    cards: z.array(z.record(z.unknown())).optional().describe("(insert) Card objects to insert."),
    position: z
      .union([z.enum(["top", "bottom"]), z.number().int().min(0)])
      .optional()
      .describe('(insert) Where to insert: "top", "bottom", or a numeric index.'),
    // shared
    actor: z.string().optional().describe("The actor performing the action. Required for 'draw' and 'move'; optional for 'shuffle' and 'insert' (defaults to 'System')."),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);

    if (args.action === "draw") {
      if (!args.deckId || !args.targetHandId || !args.count) {
        throw new Error("action='draw' requires deckId, targetHandId, and count.");
      }
      if (!args.actor) {
        throw new Error("action='draw' requires actor.");
      }
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

      return jsonResponse({ drawn, deckRemaining: session.state[args.deckId].length, handSize: session.state[args.targetHandId].length });
    }

    if (args.action === "shuffle") {
      if (!args.deckId) throw new Error("action='shuffle' requires deckId.");
      if (!Array.isArray(session.state[args.deckId])) session.state[args.deckId] = [];

      shuffleArray(session.state[args.deckId]);

      session.ledger.push({
        timestamp: new Date().toISOString(),
        actionType: "shuffle_deck",
        actor: args.actor ?? "System",
        data: { deckId: args.deckId },
      });
      await saveSession(args.sessionId, session);

      return jsonResponse({ deckId: args.deckId, size: session.state[args.deckId].length });
    }

    if (args.action === "move") {
      if (!args.entityId || !args.sourceId || !args.targetId) {
        throw new Error("action='move' requires entityId, sourceId, and targetId.");
      }
      if (!args.actor) {
        throw new Error("action='move' requires actor.");
      }
      if (!Array.isArray(session.state[args.sourceId])) session.state[args.sourceId] = [];
      if (!Array.isArray(session.state[args.targetId])) session.state[args.targetId] = [];

      const srcArray = session.state[args.sourceId];
      const targetArray = session.state[args.targetId];

      if (srcArray.length === 0) {
        throw new Error(`Source zone '${args.sourceId}' is empty — cannot find entity '${args.entityId}'.`);
      }

      const idx = srcArray.findIndex((item: any) =>
        item === args.entityId || (item && (item.id === args.entityId || item.name === args.entityId))
      );

      if (idx === -1) {
        throw new Error(`Entity '${args.entityId}' not found in '${args.sourceId}' (${srcArray.length} items). Entity matching checks id, name, and scalar equality.`);
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

      return jsonResponse({ movedItem, sourceRemaining: srcArray.length, targetSize: targetArray.length });
    }

    // insert
    if (!args.deckId || !args.cards || args.position === undefined) {
      throw new Error("action='insert' requires deckId, cards, and position.");
    }
    if (!Array.isArray(session.state[args.deckId])) session.state[args.deckId] = [];

    insertIntoArray(session.state[args.deckId], args.cards, args.position);

    session.ledger.push({
      timestamp: new Date().toISOString(),
      actionType: "insert_into_deck",
      actor: args.actor ?? "System",
      data: { deckId: args.deckId, count: args.cards.length, position: args.position },
    });
    await saveSession(args.sessionId, session);

    return jsonResponse({
      inserted: args.cards.length,
      deckSize: session.state[args.deckId].length,
      deckId: args.deckId,
      position: args.position,
    });
  },
};

export const sessionEntitiesTools = [
  zoneActionTool,
];
