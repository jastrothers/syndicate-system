import fs from 'fs';
import path from 'path';

const SESSION_DIR = 'C:/Users/Julian/git/heist_game_system/game-rules-system-mcp/game-data/sessions';
const SESSION_ID = 'b2715921-e9a9-408b-b6ad-1940b57c8b60';
const sessionPath = path.join(SESSION_DIR, `${SESSION_ID}.json`);

const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

// Life points
session.state.robinsonLife = 20;
session.state.reserveLife = 2;

// Steps
session.state.currentStep = 'green';
session.state.stepCards = ['green', 'yellow', 'red'];

// Hazard discard
session.state.hazardDiscard = [];
// Robinson discard
session.state.robinsonDiscard = [];
// Active Hazard
session.state.activeHazard = null;
// Active Robinson Cards
session.state.activeRobinsonCards = [];

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

// Difficult Aging Deck
const agingDiff = [
  { id: "aging_diff_life_minus_2", name: "Aging (-2 Life)", fight: 0, ability: "life-2", type: "difficult", cost: 2 },
  { id: "aging_diff_minus_4", name: "Aging (-4)", fight: -4, type: "difficult", cost: 2 }
];

// Shuffle arrays
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

shuffle(agingNormal);
shuffle(agingDiff);

session.state.agingDeck = [...agingNormal, ...agingDiff];

// Pirates
const allPirates = [
  { id: "pirate_normal_1", name: "Pirate", hazard: 20, free_cards: 4, type: "pirate", ability: "none" },
  { id: "pirate_normal_2", name: "Pirate", hazard: 25, free_cards: 5, type: "pirate", ability: "none" },
  { id: "pirate_normal_3", name: "Pirate", hazard: 30, free_cards: 6, type: "pirate", ability: "none" },
  { id: "pirate_normal_4", name: "Pirate", hazard: 35, free_cards: 7, type: "pirate", ability: "none" },
  { id: "pirate_normal_5", name: "Pirate", hazard: 40, free_cards: 8, type: "pirate", ability: "none" },
  { id: "pirate_ability_1", name: "Pirate", hazard: 22, free_cards: 5, type: "pirate", ability: "additional_cards_cost_2" },
  { id: "pirate_ability_2", name: "Pirate", hazard: 15, free_cards: 6, type: "pirate", ability: "half_fighting_cards" },
  { id: "pirate_ability_3", name: "Pirate", hazard: 35, free_cards: 5, type: "pirate", ability: "each_card_plus_1" },
  { id: "pirate_ability_4", name: "Pirate", hazard: "dynamic", free_cards: "dynamic", type: "pirate", ability: "remaining_hazards" },
  { id: "pirate_ability_5", name: "Pirate", hazard: 16, free_cards: 5, type: "pirate", ability: "aging_cards_plus_2" }
];
shuffle(allPirates);
session.state.pirates = [allPirates[0], allPirates[1]];
session.state.activePirateIndex = 0;

session.ledger.push({
  timestamp: new Date().toISOString(),
  actionType: "setup_game_level_1",
  actor: "System",
  data: { status: "initialized" }
});

fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
console.log("Game state successfully initialized to Level 1.");
