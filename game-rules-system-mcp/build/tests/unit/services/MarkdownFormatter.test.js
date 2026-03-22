import { describe, it } from "node:test";
import assert from "node:assert";
import { extractStructure, generateMarkdown } from "../../../src/services/MarkdownFormatter.js";
describe("MarkdownFormatter Units", () => {
    const sampleSections = {
        setup: {
            title: "Game Setup",
            content: "Place the board in the middle.",
            examples: ["Deal 5 cards to each player."],
            subsections: {
                components: {
                    title: "Components",
                    content: "1 Board, 50 Cards, 2 Dice",
                }
            }
        },
        turns: {
            title: "Taking Turns",
            content: "Players take turns clockwise."
        }
    };
    describe("extractStructure", () => {
        it("should return a nested hierarchical map of titles and sub-titles without content", () => {
            const structure = extractStructure(sampleSections);
            assert.deepStrictEqual(structure, {
                setup: {
                    title: "Game Setup",
                    subsections: {
                        components: {
                            title: "Components"
                        }
                    }
                },
                turns: {
                    title: "Taking Turns"
                }
            });
        });
        it("should handle empty dictionaries", () => {
            const structure = extractStructure({});
            assert.deepStrictEqual(structure, {});
        });
    });
    describe("generateMarkdown", () => {
        it("should emit appropriately leveled headings from sections", () => {
            const md = generateMarkdown(sampleSections, 1);
            // Expected structure assertions
            assert.ok(md.includes("# Game Setup"));
            assert.ok(md.includes("Place the board in the middle."));
            assert.ok(md.includes("**Examples:**\n- Deal 5 cards to each player."));
            assert.ok(md.includes("## Components"));
            assert.ok(md.includes("1 Board, 50 Cards, 2 Dice"));
            assert.ok(md.includes("# Taking Turns"));
            assert.ok(md.includes("Players take turns clockwise."));
        });
        it("should cap heading prefixes to a maximum of 6 (# symbols)", () => {
            const deepSections = {
                deep: {
                    title: "Deep Section"
                }
            };
            const md = generateMarkdown(deepSections, 10);
            assert.ok(md.includes("###### Deep Section"));
        });
        it("should omit content or examples if they are not provided", () => {
            const minimalSection = {
                minimal: { title: "Minimal" }
            };
            const md = generateMarkdown(minimalSection, 2);
            assert.strictEqual(md, "## Minimal\n\n");
        });
    });
});
