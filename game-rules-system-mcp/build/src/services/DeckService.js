/**
 * DeckService — Pure-logic helpers for card/deck mechanics.
 * No session I/O; all functions operate on plain arrays.
 */
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
 */
export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
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
