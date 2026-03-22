import test from "node:test";
import assert from "node:assert";
import { setupTestServer } from "./setup.js";

test("Versioning Integration Tests", async (t) => {
  const { client, cleanup } = await setupTestServer("versioning");
  t.after(cleanup);

  // Setup initial rulebook state
  await client.callTool({
    name: "update_rule",
    arguments: {
      rulebookName: "heist",
      path: "setup.board",
      title: "Board Setup",
      content: "Set up the heist board.",
    },
  });

  await t.test("Create version snapshot", async () => {
    const result: any = await client.callTool({
      name: "create_version",
      arguments: {
        rulebookName: "heist",
        versionTag: "1.0.0",
        description: "Initial release of the heist game rules",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.ok(data.message.includes("Successfully created version"));
    assert.strictEqual(data.version.versionTag, "1.0.0");
    assert.strictEqual(data.version.description, "Initial release of the heist game rules");
  });

  await t.test("List versions", async () => {
    // Modify the rulebook and create another version
    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: "heist",
        path: "gameplay.turns",
        title: "Turn Structure",
        content: "Players take turns clockwise.",
      },
    });

    await client.callTool({
      name: "create_version",
      arguments: {
        rulebookName: "heist",
        versionTag: "1.1.0",
        description: "Added turn structure",
      },
    });

    const result: any = await client.callTool({
      name: "list_versions",
      arguments: { rulebookName: "heist" },
    });
    assert.strictEqual(result.isError, undefined);

    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.rulebookName, "heist");
    assert.ok(data.latest, "Should have a latest entry");
    assert.strictEqual(data.versions.length, 2);
    const tags = data.versions.map((v: any) => v.versionTag);
    assert.ok(tags.includes("1.0.0"));
    assert.ok(tags.includes("1.1.0"));
  });

  await t.test("Duplicate version tag rejected", async () => {
    const result: any = await client.callTool({
      name: "create_version",
      arguments: {
        rulebookName: "heist",
        versionTag: "1.0.0",
      },
    });
    assert.strictEqual(result.isError, true);
    assert.ok((result.content[0] as any).text.includes("already exists"));
  });

  await t.test("Read specific version", async () => {
    const result: any = await client.callTool({
      name: "get_rulebook_structure",
      arguments: {
        rulebookName: "heist",
        rulebookVersion: "1.0.0",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    // v1.0.0 should NOT have the "gameplay" section (was added after)
    assert.ok(!data.structure.gameplay, "v1.0.0 should not have 'gameplay' section");
    assert.ok(data.structure.setup, "v1.0.0 should have 'setup' section");
  });

  await t.test("Compare versions of same game", async () => {
    const result: any = await client.callTool({
      name: "compare_rulebooks",
      arguments: {
        baseRulebook: "heist",
        baseVersion: "1.0.0",
        targetRulebook: "heist",
        targetVersion: "1.1.0",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const comparison = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(comparison.baseRulebook.versionTag, "1.0.0");
    assert.strictEqual(comparison.targetRulebook.versionTag, "1.1.0");
    // Target should have the gameplay section that base lacks
    assert.ok(comparison.differences.targetStructure.gameplay, "Target v1.1.0 should have 'gameplay'");
    assert.ok(!comparison.differences.baseStructure.gameplay, "Base v1.0.0 should not have 'gameplay'");
  });
});
