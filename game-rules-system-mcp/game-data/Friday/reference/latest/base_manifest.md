---
title: base_manifest
type: manifest
tags:
  - friday
  - setup
  - manifest
lastUpdated: '2026-03-08T01:35:05.000Z'
game: Friday
version: latest
---
{
  "decks": [
    { "deckId": "robinsonDeck", "referenceName": "robinson_starting_deck", "shuffle": true },
    { "deckId": "hazardDeck", "referenceName": "hazard_deck", "shuffle": true },
    { "deckId": "agingDeck", "referenceName": "aging_deck", "shuffle": true },
    { "deckId": "pirates", "referenceName": "pirates", "shuffle": true }
  ],
  "state": {
    "robinsonLife": 20,
    "reserveLife": 2,
    "currentStep": "green",
    "stepCards": ["green", "yellow", "red"],
    "hazardDiscard": [],
    "robinsonDiscard": [],
    "activeHazard": null,
    "activeRobinsonCards": []
  }
}
