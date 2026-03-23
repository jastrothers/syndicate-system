import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getDesignerProfilePath, getDecisionLogPath, getGameDir } from "../../../src/config/paths.js";
import { processDecision, synthesizeNovaResponse } from "../../../src/services/NovaService.js";
import { getProfile } from "../../../src/services/ProfileService.js";
describe("NovaService Units", () => {
    const testGame = "nova-test-game-" + Date.now();
    const testSessionId = "test-session-id";
    const profilePath = getDesignerProfilePath();
    before(async () => {
        // Ensure game dir exists for decision log
        const gameDir = getGameDir(testGame);
        await fs.mkdir(gameDir, { recursive: true });
        // Clear profile
        try {
            await fs.unlink(profilePath);
        }
        catch { }
    });
    after(async () => {
        const gameDir = getGameDir(testGame);
        try {
            await fs.rm(gameDir, { recursive: true, force: true });
        }
        catch { }
        try {
            await fs.unlink(profilePath);
        }
        catch { }
    });
    it("processDecision records entry in decision log", async () => {
        await processDecision(testGame, testSessionId, 1, "accept", "Loved this mechanic", ["deckbuilding"]);
        const logPath = getDecisionLogPath(testGame);
        const raw = await fs.readFile(logPath, "utf-8");
        const log = JSON.parse(raw);
        assert.strictEqual(log.decisions.length, 1);
        assert.strictEqual(log.decisions[0].decision, "accept");
        assert.strictEqual(log.decisions[0].stepId, 1);
        assert.deepStrictEqual(log.decisions[0].impactedMechanisms, ["deckbuilding"]);
    });
    it("processDecision updates profile positively on accept", async () => {
        try {
            await fs.unlink(profilePath);
        }
        catch { }
        await processDecision(testGame, testSessionId, 2, "accept", "Great", ["deckbuilding"]);
        const profile = await getProfile();
        assert.ok((profile.affinities["deckbuilding"] ?? 0) > 0, "Accept should increase affinity");
    });
    it("processDecision updates profile negatively on reject", async () => {
        try {
            await fs.unlink(profilePath);
        }
        catch { }
        await processDecision(testGame, testSessionId, 3, "reject", "Disliked", ["roll-and-move"]);
        const profile = await getProfile();
        assert.ok((profile.affinities["roll-and-move"] ?? 0) < 0, "Reject should decrease affinity");
    });
    it("processDecision does not update profile on defer", async () => {
        try {
            await fs.unlink(profilePath);
        }
        catch { }
        await processDecision(testGame, testSessionId, 4, "defer", "Not sure", ["auction"]);
        const profile = await getProfile();
        // Profile should still be the default (empty affinities) since defer doesn't update
        assert.strictEqual(profile.affinities["auction"], undefined);
    });
    it("synthesizeNovaResponse returns correct shape with trace block", () => {
        const step = {
            stepNumber: 1,
            persona: "MechanicsArchitect",
            output: "Full design output text",
            summary: "Designed a deckbuilding core",
            timestamp: new Date().toISOString(),
            trace: {
                observation: "Player engagement was high",
                data: { avgTurns: 12 },
                mechanism: "deckbuilding",
                impact: "Creates variable power curves",
            },
        };
        const response = synthesizeNovaResponse(step);
        assert.ok(response.conclusion, "Should have conclusion");
        assert.ok(response.reasoning, "Should have reasoning");
        assert.ok(Array.isArray(response.options), "Should have options array");
        assert.strictEqual(response.options.length, 3);
        const levels = response.options.map(o => o.level);
        assert.ok(levels.includes("Values"), "Should have Values option");
        assert.ok(levels.includes("Structure"), "Should have Structure option");
        assert.ok(levels.includes("Tuning"), "Should have Tuning option");
        // Reasoning should reference trace fields
        assert.ok(response.reasoning.includes("Player engagement was high"), "Reasoning should include observation");
    });
    it("synthesizeNovaResponse handles missing trace gracefully", () => {
        const step = {
            stepNumber: 2,
            persona: "ThemeWeaver",
            output: "The game is set in a cyberpunk city",
            summary: "Applied cyberpunk theme",
            timestamp: new Date().toISOString(),
        };
        const response = synthesizeNovaResponse(step);
        assert.ok(response.conclusion === step.summary);
        assert.ok(response.reasoning === step.output, "Without trace, reasoning should fall back to full output");
    });
});
