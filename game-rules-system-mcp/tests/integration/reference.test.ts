import test from "node:test";
import assert from "node:assert";
import { setupTestServer } from "./setup.js";

test("Reference System Integration Tests", async (t) => {
  const { client, cleanup } = await setupTestServer("reference");
  t.after(cleanup);

  await t.test("Save Reference", async () => {
    const result: any = await client.callTool({
      name: "save_reference",
      arguments: {
        name: "test_advantage",
        type: "rule",
        tags: ["combat", "dice"],
        content: "Roll twice, take the higher result."
      }
    });
    assert.strictEqual(result.isError, undefined);
    assert.ok((result.content[0] as any).text.includes("Successfully saved reference: test_advantage"));
  });

  await t.test("Get Reference", async () => {
    const result: any = await client.callTool({
      name: "get_reference",
      arguments: {
        name: "test_advantage",
      }
    });
    assert.strictEqual(result.isError, undefined);
    const ref = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(ref.name, "test_advantage");
    assert.strictEqual(ref.type, "rule");
    assert.strictEqual(ref.content, "Roll twice, take the higher result.");
    assert.deepStrictEqual(ref.tags, ["combat", "dice"]);
  });

  await t.test("List References", async () => {
    const result: any = await client.callTool({
      name: "list_references",
      arguments: {
        tags: ["combat"]
      }
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.count, 1);
    assert.strictEqual(data.items[0].name, "test_advantage");
  });

  await t.test("Rebuild Index", async () => {
    const result: any = await client.callTool({
      name: "rebuild_reference_index",
      arguments: {}
    });
    assert.strictEqual(result.isError, undefined);
    assert.ok((result.content[0] as any).text.includes("Successfully rebuilt"));
    
    // Check that it's still available
    const getResult: any = await client.callTool({
      name: "get_reference",
      arguments: { name: "test_advantage" }
    });
    const ref = JSON.parse((getResult.content[0] as any).text);
    assert.strictEqual(ref.name, "test_advantage");
  });
});
