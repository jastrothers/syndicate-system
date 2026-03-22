export function parseAndRoll(notation) {
    const match = notation.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
    if (!match) {
        throw new Error("Invalid dice notation. Use format like '2d6' or '1d20+5'");
    }
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;
    let total = modifier;
    const rolls = [];
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
    }
    return { rolls, modifier, total };
}
