/**
 * DeckService — Pure-logic helpers for card/deck mechanics.
 * No session I/O; all functions operate on plain arrays.
 */
/**
 * Mulberry32 seeded PRNG — deterministic, fast, good distribution.
 * Returns a function that produces values in [0, 1).
 */
function createPrng(seed) {
    let s = seed | 0;
    return () => {
        s += 0x6d2b79f5;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * Returns true if `item` satisfies the given filter clause.
 */
export function matchesFilter(item, filter) {
    if (item == null || typeof item !== "object")
        return false;
    const record = item;
    const fieldValue = record[filter.key];
    switch (filter.op) {
        case "eq":
            return fieldValue === filter.value;
        case "ne":
            return fieldValue !== filter.value;
        case "gt":
            return typeof fieldValue === "number" && fieldValue > filter.value;
        case "lt":
            return typeof fieldValue === "number" && fieldValue < filter.value;
        case "gte":
            return typeof fieldValue === "number" && fieldValue >= filter.value;
        case "lte":
            return typeof fieldValue === "number" && fieldValue <= filter.value;
        case "contains":
            if (typeof fieldValue === "string") {
                return fieldValue.includes(filter.value);
            }
            if (Array.isArray(fieldValue)) {
                return fieldValue.includes(filter.value);
            }
            return false;
        default:
            return false;
    }
}
/**
 * Validates that a filter clause uses a numeric operator with a numeric value.
 * Throws a descriptive error if the operator requires a number but value is not.
 */
export function validateFilterClause(filter) {
    const numericOps = ["gt", "lt", "gte", "lte"];
    if (numericOps.includes(filter.op) && typeof filter.value !== "number") {
        throw new Error(`Filter operator '${filter.op}' requires a numeric value, got ${typeof filter.value}.`);
    }
}
/**
 * Expands a card template array into a flat deck array.
 * Each template entry has a `card` (object or scalar) and a `count`.
 * Object cards receive a unique `id` field via crypto.randomUUID().
 */
export function expandCardTemplates(cards) {
    const deck = [];
    for (const entry of cards) {
        const count = entry.count || 1;
        for (let i = 0; i < count; i++) {
            deck.push(typeof entry.card === "object" && entry.card !== null
                ? { id: crypto.randomUUID(), ...entry.card }
                : entry.card);
        }
    }
    return deck;
}
/**
 * Look at N cards from the top or bottom of a deck without mutating it.
 */
export function peekCards(arr, count, from = "top") {
    const n = Math.min(count, arr.length);
    if (n <= 0)
        return [];
    if (from === "top") {
        return arr.slice(0, n);
    }
    return arr.slice(-n);
}
/**
 * Search an array for items matching a filter clause.
 * Returns matching items with their original indices.
 */
export function searchArray(arr, filter) {
    const results = [];
    for (let i = 0; i < arr.length; i++) {
        if (matchesFilter(arr[i], filter)) {
            results.push({ index: i, item: arr[i] });
        }
    }
    return results;
}
/**
 * Insert items into an array at a specific position.
 * Mutates the array in place and returns it.
 *
 * - `"top"` → prepend (index 0)
 * - `"bottom"` → append
 * - number → splice at that index
 */
export function insertIntoArray(arr, items, position) {
    if (position === "top") {
        arr.unshift(...items);
    }
    else if (position === "bottom") {
        arr.push(...items);
    }
    else {
        const idx = Math.max(0, Math.min(position, arr.length));
        arr.splice(idx, 0, ...items);
    }
    return arr;
}
/**
 * Fisher-Yates shuffle. Mutates the array in place.
 * Pass an integer `seed` for deterministic/reproducible shuffles.
 */
export function shuffleArray(arr, seed) {
    const random = seed !== undefined ? createPrng(seed) : () => Math.random();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
/**
 * Draw `count` cards from `deck`, auto-reshuffling `recycleSource` into
 * `deck` when the deck is empty. Both arrays are mutated in place.
 *
 * Returns the drawn cards and whether a reshuffle occurred.
 */
export function drawWithReshuffle(deck, recycleSource, count) {
    const drawn = [];
    let reshuffled = false;
    for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
            if (recycleSource.length === 0) {
                // Nothing left to draw from
                break;
            }
            // Shuffle recycleSource into deck
            deck.push(...recycleSource.splice(0, recycleSource.length));
            shuffleArray(deck);
            reshuffled = true;
        }
        drawn.push(deck.shift());
    }
    return { drawn, reshuffled };
}
