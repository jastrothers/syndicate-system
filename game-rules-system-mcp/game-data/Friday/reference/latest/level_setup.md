---
title: level_setup
type: script
tags:
  - friday
  - setup
  - macro
lastUpdated: '2026-03-08T01:35:02.000Z'
game: Friday
version: latest
---
const level = inputs.level || 1;
api.log(`Setting up Friday for Level ${level}`);

// Level 1-2: Remove Very Stupid (aging_diff_minus_5)
if (level < 3) {
  state.agingDeck = state.agingDeck.filter(c => c.id !== "aging_diff_minus_5");
}

let agingNormal = state.agingDeck.filter(c => c.type === "normal");
let agingDiff = state.agingDeck.filter(c => c.type === "difficult");

// Stack normals on top of difficult
state.agingDeck = [...agingNormal, ...agingDiff];

if (level >= 2) {
   // Level 2+: draw 1 aging card and shuffle it into robinson starting deck
   const agingCard = state.agingDeck.shift();
   state.robinsonDeck.push(agingCard);
   api.shuffle("robinsonDeck");
}

if (level >= 4) {
   // Level 4: Start with 18 life
   state.robinsonLife = 18;
}

// Select only 2 pirates
state.pirates = state.pirates.slice(0, 2);

return `Initialized Friday Level ${level} complete.`;
