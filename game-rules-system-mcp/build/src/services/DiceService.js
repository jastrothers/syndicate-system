const MAX_DICE_COUNT = 1000;
const MAX_DICE_SIDES = 10000;
/**
 * Mulberry32 seeded PRNG for reproducible dice rolls.
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
 * Parse dice notation (e.g. "2d6+5") and roll.
 * Pass an integer `seed` for deterministic/reproducible rolls.
 */
export function parseAndRoll(notation, seed) {
    const match = notation.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
    if (!match) {
        throw new Error("Invalid dice notation. Use format like '2d6' or '1d20+5'");
    }
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;
    if (count > MAX_DICE_COUNT) {
        throw new Error(`Dice count ${count} exceeds maximum of ${MAX_DICE_COUNT}.`);
    }
    if (sides > MAX_DICE_SIDES) {
        throw new Error(`Dice sides ${sides} exceeds maximum of ${MAX_DICE_SIDES}.`);
    }
    if (count < 1 || sides < 1) {
        throw new Error("Dice count and sides must be at least 1.");
    }
    const random = seed !== undefined ? createPrng(seed) : () => Math.random();
    let total = modifier;
    const rolls = [];
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(random() * sides) + 1;
        rolls.push(roll);
        total += roll;
    }
    return { rolls, modifier, total };
}
