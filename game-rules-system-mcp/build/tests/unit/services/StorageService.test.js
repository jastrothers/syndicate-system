import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as StorageService from "../../../src/services/StorageService.js";
const TEST_DIR = path.join(process.cwd(), "temp-test-storage");
const TEST_FILE = path.join(TEST_DIR, "test-file.json");
describe("StorageService", () => {
    beforeEach(async () => {
        await fs.mkdir(TEST_DIR, { recursive: true });
    });
    afterEach(async () => {
        try {
            await fs.rm(TEST_DIR, { recursive: true, force: true });
        }
        catch {
            // Ignore
        }
    });
    it("should ensure a directory exists", async () => {
        const subDir = path.join(TEST_DIR, "subdir");
        await StorageService.ensureDirectory(subDir);
        const stats = await fs.stat(subDir);
        assert.ok(stats.isDirectory());
    });
    it("should write and read a JSON file with locking", async () => {
        const data = { foo: "bar" };
        await StorageService.saveJson(TEST_FILE, data);
        const read = await StorageService.readJson(TEST_FILE);
        assert.deepStrictEqual(read, data);
    });
    it("should throw error when reading non-existent file without default", async () => {
        await assert.rejects(StorageService.readJson(path.join(TEST_DIR, "missing.json")), /ENOENT/);
    });
    it("should return default value when reading non-existent file with default", async () => {
        const defaultValue = { default: true };
        const read = await StorageService.readJson(path.join(TEST_DIR, "missing.json"), defaultValue);
        assert.deepStrictEqual(read, defaultValue);
    });
});
