import { parseMessageForArtifact } from "../lib/artifacts/parser";

// Basic test runner (no external test framework needed — run with npx tsx)
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${e}`);
    failed++;
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toContain(substring: string) {
      if (typeof actual !== "string" || !actual.includes(substring))
        throw new Error(`Expected string to contain "${substring}", got "${actual}"`);
    },
    toBeDefined() {
      if (actual === undefined || actual === null) throw new Error(`Expected value to be defined`);
    },
  };
}

console.log("\nArtifact Parser Tests\n");

// 1. No artifact present
test("returns full string as prose when no artifact tag", () => {
  const result = parseMessageForArtifact("Hello, here is my answer.");
  expect(result.prose).toBe("Hello, here is my answer.");
  expect(result.artifact).toBeNull();
});

// 2. Valid HTML artifact
test("parses a valid html artifact", () => {
  const input = `Here's a game:\n<artifact type="html" title="Pong" id="pong-v1">\n<!DOCTYPE html><html><body>pong</body></html>\n</artifact>\nEnjoy!`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact?.type).toBe("html");
  expect(result.artifact?.title).toBe("Pong");
  expect(result.artifact?.id).toBe("pong-v1");
  expect(result.artifact?.content).toContain("pong");
  expect(result.prose).toContain("Here's a game:");
  expect(result.prose).toContain("Enjoy!");
});

// 3. Valid SVG artifact
test("parses a valid svg artifact", () => {
  const input = `<artifact type="svg" title="Circle">\n<svg><circle cx="50" cy="50" r="40"/></svg>\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact?.type).toBe("svg");
  expect(result.artifact?.content).toContain("<svg>");
});

// 4. Valid code artifact
test("parses a valid code artifact with language", () => {
  const input = `<artifact type="code" language="python" title="Hello">\nprint("hello")\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact?.type).toBe("code");
  expect(result.artifact?.language).toBe("python");
  expect(result.artifact?.content).toBe('print("hello")');
});

// 5. Missing type attribute — should fail validation, return prose only
test("falls back to prose when artifact type is missing", () => {
  const input = `<artifact title="Oops">\nsome content\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact).toBeNull();
  expect(result.prose).toContain("Oops");
});

// 6. Invalid type attribute — should fail validation
test("falls back to prose when artifact type is unrecognized", () => {
  const input = `<artifact type="video" title="Weird">\ncontent\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact).toBeNull();
});

// 7. Response is ONLY an artifact with no surrounding prose
test("handles artifact-only message with empty prose", () => {
  const input = `<artifact type="html" title="Game">\n<!DOCTYPE html><html></html>\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact?.type).toBe("html");
  expect(result.prose).toBe("");
});

// 8. Artifact with special characters in content
test("preserves special characters in artifact content", () => {
  const input = `<artifact type="code" language="js" title="Snippet">\nconst x = a < b ? "&amp;" : "";\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact?.content).toContain("&amp;");
  expect(result.artifact?.content).toContain("a < b");
});

// 9. Markdown artifact type
test("parses a markdown artifact", () => {
  const input = `<artifact type="markdown" title="Report">\n# Heading\n\nParagraph.\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact?.type).toBe("markdown");
  expect(result.artifact?.content).toContain("# Heading");
});

// 10. First artifact wins if there were somehow two (only first is parsed)
test("only parses first artifact tag", () => {
  const input = `<artifact type="html" title="First">\n<p>one</p>\n</artifact>\n<artifact type="html" title="Second">\n<p>two</p>\n</artifact>`;
  const result = parseMessageForArtifact(input);
  expect(result.artifact?.title).toBe("First");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
