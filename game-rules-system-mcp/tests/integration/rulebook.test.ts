import test from "node:test";
import assert from "node:assert";
import { setupTestServer } from "./setup.js";

test("General & Rulebook Integration Tests", async (t) => {
  const { client, cleanup } = await setupTestServer("rulebook");
  t.after(cleanup);

  await t.test("List tools", async () => {
    const toolsResult = await client.listTools();
    assert.ok(toolsResult.tools.length > 0, "Server should expose tools");
    
    const toolNames = toolsResult.tools.map((tm) => tm.name);
    assert.ok(toolNames.includes("update_rule"));
    assert.ok(toolNames.includes("create_session"));
    assert.ok(toolNames.includes("search_zone"));
  });

  await t.test("Update rule (Create new)", async () => {
    const result: any = await client.callTool({
      name: "update_rule",
      arguments: {
        path: "test_section.subsection",
        title: "Test Subsection",
        content: "This is a test rule.",
        examples: ["Example 1", "Example 2"],
      },
    });
    assert.strictEqual(result.isError, undefined, result.content?.[0]?.text);
    assert.strictEqual(result.content[0].type, "text");
    assert.ok((result.content[0] as any).text.includes("Successfully updated rule section"));
  });

  await t.test("Read rule section", async () => {
    const result: any = await client.callTool({
      name: "read_rule_section",
      arguments: {
        path: "test_section.subsection",
      },
    });
    
    assert.strictEqual(result.isError, undefined, "Tool call should not result in an error");
    const jsonStr = (result.content[0] as any).text;
    const ruleData = JSON.parse(jsonStr);
    
    assert.strictEqual(ruleData.title, "Test Subsection");
    assert.strictEqual(ruleData.content, "This is a test rule.");
    assert.deepStrictEqual(ruleData.examples, ["Example 1", "Example 2"]);
  });

  await t.test("Get rulebook structure", async () => {
    const result: any = await client.callTool({
      name: "get_rulebook_structure",
      arguments: {},
    });
    
    assert.strictEqual(result.isError, undefined);
    const jsonStr = (result.content[0] as any).text;
    const data = JSON.parse(jsonStr);
    
    assert.ok(data.structure.test_section, "Structure should contain 'test_section'");
    assert.ok(data.structure.test_section.subsections.subsection, "Structure should contain nested 'subsection'");
  });

  await t.test("Compile markdown rulebook", async () => {
    const result: any = await client.callTool({
      name: "compile_markdown_rulebook",
      arguments: {},
    });
    assert.strictEqual(result.isError, undefined);
    assert.ok((result.content[0] as any).text.includes("Successfully compiled Markdown rulebook"));
  });

  await t.test("Delete rule", async () => {
    const result: any = await client.callTool({
      name: "delete_rule",
      arguments: {
        path: "test_section",
      },
    });
    assert.strictEqual(result.isError, undefined);
    assert.ok((result.content[0] as any).text.includes("Successfully deleted rule section"));
  });
  
  await t.test("Read deleted rule section (Expect Error)", async () => {
    const result: any = await client.callTool({
      name: "read_rule_section",
      arguments: {
        path: "test_section",
      },
    });
    
    assert.strictEqual(result.isError, true, "Tool call should result in an error because section was deleted");
    assert.ok((result.content[0] as any).text.includes("not found"));
  });

  await t.test("Multi-Rulebook: Update rule in custom rulebook", async () => {
    const result: any = await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: "heist",
        path: "setup.board",
        title: "Board Setup",
        content: "Set up the heist board.",
      },
    });
    assert.strictEqual(result.isError, undefined);
    assert.ok((result.content[0] as any).text.includes("in rulebook: heist"));
  });

  await t.test("Multi-Rulebook: List rulebooks", async () => {
    const result: any = await client.callTool({
      name: "list_rulebooks",
      arguments: {},
    });
    assert.strictEqual(result.isError, undefined);
    
    const jsonStr = (result.content[0] as any).text;
    const data = JSON.parse(jsonStr);
    assert.ok(data.rulebooks["heist"], "Rulebooks should include 'heist'");
    assert.ok(data.rulebooks["rulebook"], "Rulebooks should include default 'rulebook'");
  });

  await t.test("Multi-Rulebook: Read from custom rulebook", async () => {
    const result: any = await client.callTool({
      name: "read_rule_section",
      arguments: {
        rulebookName: "heist",
        path: "setup.board",
      },
    });
    assert.strictEqual(result.isError, undefined);
    
    const jsonStr = (result.content[0] as any).text;
    const ruleData = JSON.parse(jsonStr);
    assert.strictEqual(ruleData.title, "Board Setup");
  });

  await t.test("Full Rulebook Display", async () => {
    const result: any = await client.callTool({
      name: "get_full_rulebook_markdown",
      arguments: {} 
    });
    if (result.isError) console.error(result.content[0].text);
    assert.strictEqual(result.isError, undefined);
    assert.ok((result.content[0] as any).text.includes("# Untitled Board Game"));
  });
});
