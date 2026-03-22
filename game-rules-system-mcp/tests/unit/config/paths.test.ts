import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sanitizeFileName,
  sanitizeVersionTag,
  getRulebookDir,
  getRulebookPath,
  getLegacyRulebookPath,
  getRulebookMdPath,
  getPlaytestLogPath,
  getSessionPath,
  getReferenceFilePath,
} from "../../../src/config/paths.js";

describe("sanitizeFileName", () => {
  it("strips characters that are not alphanumeric, dash, or underscore", () => {
    assert.equal(sanitizeFileName("hello world!"), "helloworld");
  });

  it("allows alphanumeric, dashes, and underscores through unchanged", () => {
    assert.equal(sanitizeFileName("heist_game-v2"), "heist_game-v2");
  });

  it("returns empty string for fully-invalid input", () => {
    assert.equal(sanitizeFileName("!@#$%"), "");
  });
});

describe("sanitizeVersionTag", () => {
  it("allows dots and dashes in addition to alphanumerics", () => {
    assert.equal(sanitizeVersionTag("1.0.0-alpha"), "1.0.0-alpha");
  });

  it("strips characters not allowed in version tags", () => {
    assert.equal(sanitizeVersionTag("1.0 beta!"), "1.0beta");
  });
});

describe("getRulebookDir", () => {
  it("returns a path ending with the rulebooks directory", () => {
    const dir = getRulebookDir("heist");
    assert.ok(dir.endsWith("rulebooks"), `Expected path to end with 'rulebooks', got: ${dir}`);
  });

  it("falls back to 'rulebook' when name sanitizes to an empty string", () => {
    const dir = getRulebookDir("!@#$%^&*()");
    assert.ok(dir.endsWith("rulebook"), `Expected fallback 'rulebook', got: ${dir}`);
  });
});

describe("getRulebookPath", () => {
  it("returns a path ending in 'latest.json' when no version is given", () => {
    const p = getRulebookPath("heist");
    assert.ok(p.endsWith("latest.json"), `Expected 'latest.json', got: ${p}`);
  });

  it("returns a versioned path when a version tag is provided", () => {
    const p = getRulebookPath("heist", "1.0.0");
    assert.ok(p.endsWith("v1.0.0.json"), `Expected 'v1.0.0.json', got: ${p}`);
  });
});

describe("getLegacyRulebookPath", () => {
  it("returns a flat path directly under DATA_DIR", () => {
    const p = getLegacyRulebookPath("heist");
    assert.ok(p.endsWith("heist.json"), `Expected 'heist.json', got: ${p}`);
  });
});

describe("getRulebookMdPath", () => {
  it("returns a path ending in 'latest.md' with no version", () => {
    const p = getRulebookMdPath("heist");
    assert.ok(p.endsWith("latest.md"), `Expected 'latest.md', got: ${p}`);
  });

  it("returns a versioned .md path when a version tag is given", () => {
    const p = getRulebookMdPath("heist", "2.0.0");
    assert.ok(p.endsWith("v2.0.0.md"), `Expected 'v2.0.0.md', got: ${p}`);
  });
});

describe("getPlaytestLogPath", () => {
  it("returns a path ending in 'playtest_logs.md'", () => {
    const p = getPlaytestLogPath("heist");
    assert.ok(p.endsWith("playtest_logs.md"), `Expected 'playtest_logs.md', got: ${p}`);
  });
});

describe("getSessionPath", () => {
  it("returns a .json path containing the session ID", () => {
    const p = getSessionPath("abc-123");
    assert.ok(p.endsWith("abc-123.json"), `Expected 'abc-123.json', got: ${p}`);
  });
});

describe("getReferenceFilePath", () => {
  it("returns an .md path in the reference directory", () => {
    const p = getReferenceFilePath("standard-rules");
    assert.ok(p.endsWith("standard-rules.md"), `Expected 'standard-rules.md', got: ${p}`);
  });

  it("falls back to 'unnamed.md' for invalid names", () => {
    const p = getReferenceFilePath("!!!!");
    assert.ok(p.endsWith("unnamed.md"), `Expected 'unnamed.md', got: ${p}`);
  });
});
