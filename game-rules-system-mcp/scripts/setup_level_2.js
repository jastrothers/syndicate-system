import fs from 'fs';
import path from 'path';

try {
  const SESSION_DIR = 'C:/Users/Julian/git/heist_game_system/game-rules-system-mcp/game-data/sessions';
  const SESSION_ID = 'b82ec445-8e66-423a-805d-cb542447c215';
  const sessionPath = path.join(SESSION_DIR, `${SESSION_ID}.json`);

  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

  // Life points
  session.state.robinsonLife = 20;
  session.state.reserveLife = 2;

  // Steps
  session.state.currentStep = 'green';
  session.state.stepCards = ['green', 'yellow', 'red'];

  // Hazard discard, etc
  session.state.hazardDiscard = [];
  session.state.robinsonDiscard = [];
  session.state.activeHazard = null;
  session.state.activeRobinsonCards = [];

  // Base Robinson Cards for template
  const startingCards = [
    { card: { id: "robinson_2", name: "Robinson (2)", fight: 2, cost: 1 }, count: 1 },
    { card: { id: "robinson_1", name: "Robinson (1)", fight: 1, cost: 1 }, count: 3 },
    { card: { id: "robinson_0", name: "Robinson (0)", fight: 0, cost: 1 }, count: 8 },
    { card: { id: "robinson_0_life2", name: "Robinson (0, +2 Life)", fight: 0, ability: "life+2", cost: 1 }, count: 1 },
    { card: { id: "robinson_minus_1", name: "Robinson (-1)", fight: -1, cost: 1 }, count: 5 }
  ];

  session.state.robinsonDeck = [];
  for (const entry of startingCards) {
    for (let i = 0; i < entry.count; i++) {
      session.state.robinsonDeck.push({
        ...entry.card,
        instanceId: `rob_${Math.random().toString(36).substr(2, 9)}`
      });
    }
  }

  // Hazards
  const hazards = [
    { id: "hazard_1", free_cards: 1, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "below_pile", cost: 1 },
    { id: "hazard_2_1", free_cards: 2, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "+2_cards", cost: 1 },
    { id: "hazard_2_2", free_cards: 2, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "+2_cards", cost: 1 },
    { id: "hazard_3", free_cards: 1, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "copy", cost: 1 },
    { id: "hazard_4", free_cards: 1, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "destroy", cost: 1 },
    { id: "hazard_5_1", free_cards: 2, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "exchange+2", cost: 1 },
    { id: "hazard_5_2", free_cards: 2, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "exchange+2", cost: 1 },
    { id: "hazard_6_1", free_cards: 2, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "life+1", cost: 1 },
    { id: "hazard_6_2", free_cards: 2, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "life+1", cost: 1 },
    { id: "hazard_7", free_cards: 1, green: 0, yellow: 1, red: 3, knowledge_fight: 0, knowledge_ability: "step-1", cost: 1 },
    { id: "hazard_8", free_cards: 1, green: 1, yellow: 3, red: 6, knowledge_fight: 1, knowledge_ability: "below_pile", cost: 1 },
    { id: "hazard_9", free_cards: 1, green: 1, yellow: 3, red: 6, knowledge_fight: 1, knowledge_ability: "copy", cost: 1 },
    { id: "hazard_10", free_cards: 1, green: 1, yellow: 3, red: 6, knowledge_fight: 1, knowledge_ability: "destroy", cost: 1 },
    { id: "hazard_11", free_cards: 1, green: 1, yellow: 3, red: 6, knowledge_fight: 1, knowledge_ability: "double", cost: 1 },
    { id: "hazard_12_1", free_cards: 2, green: 1, yellow: 3, red: 6, knowledge_fight: 1, knowledge_ability: "life+1", cost: 1 },
    { id: "hazard_12_2", free_cards: 2, green: 1, yellow: 3, red: 6, knowledge_fight: 1, knowledge_ability: "life+1", cost: 1 },
    { id: "hazard_13_1", free_cards: 2, green: 1, yellow: 3, red: 6, knowledge_fight: 2, cost: 1 },
    { id: "hazard_13_2", free_cards: 2, green: 1, yellow: 3, red: 6, knowledge_fight: 2, cost: 1 },
    { id: "hazard_14", free_cards: 1, green: 2, yellow: 5, red: 8, knowledge_fight: 2, knowledge_ability: "+1_card", cost: 1 },
    { id: "hazard_15", free_cards: 1, green: 2, yellow: 5, red: 8, knowledge_fight: 2, knowledge_ability: "destroy", cost: 1 },
    { id: "hazard_16", free_cards: 1, green: 2, yellow: 5, red: 8, knowledge_fight: 2, knowledge_ability: "double", cost: 1 },
    { id: "hazard_17", free_cards: 1, green: 2, yellow: 5, red: 8, knowledge_fight: 2, knowledge_ability: "exchange", cost: 1 },
    { id: "hazard_18", free_cards: 1, green: 2, yellow: 5, red: 8, knowledge_fight: 2, knowledge_ability: "life+1", cost: 1 },
    { id: "hazard_19", free_cards: 2, green: 2, yellow: 5, red: 8, knowledge_fight: 2, knowledge_ability: "sort_3", cost: 1 },
    { id: "hazard_20", free_cards: 1, green: 4, yellow: 7, red: 11, knowledge_fight: 3, knowledge_ability: "+1_card", cost: 1 },
    { id: "hazard_21", free_cards: 1, green: 4, yellow: 7, red: 11, knowledge_fight: 3, knowledge_ability: "destroy", cost: 1 },
    { id: "hazard_22", free_cards: 1, green: 4, yellow: 7, red: 11, knowledge_fight: 3, knowledge_ability: "exchange", cost: 1 },
    { id: "hazard_23", free_cards: 2, green: 4, yellow: 7, red: 11, knowledge_fight: 3, knowledge_ability: "sort_3", cost: 1 },
    { id: "hazard_24_1", free_cards: 2, green: 5, yellow: 9, red: 14, knowledge_fight: 4, cost: 1 },
    { id: "hazard_24_2", free_cards: 2, green: 5, yellow: 9, red: 14, knowledge_fight: 4, cost: 1 }
  ];
  session.state.hazardDeck = hazards;

  // Normal Aging Deck
  const agingNormal = [
    { id: "aging_highest_0_1", name: "Aging (Highest Card = 0)", fight: 0, ability: "highest_card=0", type: "normal", cost: 2 },
    { id: "aging_highest_0_2", name: "Aging (Highest Card = 0)", fight: 0, ability: "highest_card=0", type: "normal", cost: 2 },
    { id: "aging_life_minus_1", name: "Aging (-1 Life)", fight: 0, ability: "life-1", type: "normal", cost: 2 },
    { id: "aging_stop", name: "Aging (Stop)", fight: 0, ability: "stop", type: "normal", cost: 2 },
    { id: "aging_minus_1", name: "Aging (-1)", fight: -1, type: "normal", cost: 2 },
    { id: "aging_minus_2_1", name: "Aging (-2)", fight: -2, type: "normal", cost: 2 },
    { id: "aging_minus_2_2", name: "Aging (-2)", fight: -2, type: "normal", cost: 2 },
    { id: "aging_minus_3", name: "Aging (-3)", fight: -3, type: "normal", cost: 2 }
  ];
  const agingDiff = [
    { id: "aging_diff_life_minus_2", name: "Aging (-2 Life)", fight: 0, ability: "life-2", type: "difficult", cost: 2 },
    { id: "aging_diff_minus_4", name: "Aging (-4)", fight: -4, type: "difficult", cost: 2 }
  ];

  const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  shuffle(session.state.robinsonDeck);
  shuffle(session.state.hazardDeck);
  shuffle(agingNormal);
  shuffle(agingDiff);

  // LEVEL 2 RULE: "draw a face-down aging card (from the newly formed aging deck) and shuffle it into the 18 Robinson starting cards"
  session.state.agingDeck = [...agingNormal, ...agingDiff];
  const agingCardToInject = session.state.agingDeck.shift(); // take the top normal card
  session.state.robinsonDeck.push(agingCardToInject);

  // reshuffle robinson to hide aging card
  shuffle(session.state.robinsonDeck);

  // Pirates
  const allPirates = [
    { id: "pirate_normal_1", hazard: 20 },
    { id: "pirate_normal_2", hazard: 25 },
    { id: "pirate_normal_3", hazard: 30 },
    { id: "pirate_normal_4", hazard: 35 },
    { id: "pirate_normal_5", hazard: 40 },
    { id: "pirate_ability_1", hazard: 22 },
    { id: "pirate_ability_2", hazard: 15 },
    { id: "pirate_ability_3", hazard: 35 },
    { id: "pirate_ability_4", hazard: "dynamic" },
    { id: "pirate_ability_5", hazard: 16 }
  ];
  shuffle(allPirates);
  session.state.pirates = [allPirates[0], allPirates[1]];

  session.ledger.push({
    timestamp: new Date().toISOString(),
    actionType: "setup_game_level_2",
    actor: "System",
    data: { status: "initialized", injectedAgingCard: agingCardToInject.id }
  });

  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
  console.log("Game state successfully initialized to Level 2.");
} catch (err) {
  fs.writeFileSync('C:/Users/Julian/git/heist_game_system/game-rules-system-mcp/scripts/err.log', err.stack);
}
