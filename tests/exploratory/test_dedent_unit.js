import { serializeToMarkdown } from '../../src/shared/serializer.js';

// We can test the helper functions directly by evaluating the file or copying them
// Let's import the actual functions if exported, or recreate them to test logic.
// In our src/shared/serializer.ts, we added:
// function dedentCode(text: string)
// function dedentDiff(text: string)

// Let's test the serialization of code blocks through serializeToMarkdown.
import assert from 'assert';

const testCodeBlock = {
  type: "code-block",
  language: "typescript",
  text: "    class Foo {\n        bar() {}\n    }"
};

const testDiffBlock = {
  type: "code-block",
  language: "diff",
  text: "diff --git a/file b/file\n# File: file\n@@ -1,3 +1,3 @@\n+                  fun getBaseUrl(): String {\n-                  fun getOldUrl(): String {\n                   fun shared(): String {"
};

console.log("Running serialization tests...");

const codeRes = serializeToMarkdown(testCodeBlock);
console.log("Code Block Output:\n" + codeRes);
assert.ok(codeRes.includes("class Foo {\n    bar() {}\n}"));

const diffRes = serializeToMarkdown(testDiffBlock);
console.log("Diff Block Output:\n" + diffRes);
assert.ok(diffRes.includes("+fun getBaseUrl(): String {\n-fun getOldUrl(): String {\n fun shared(): String {"));

const testCommentThread = {
  type: "comment-thread",
  metadata: {
    filePath: "src/shared/serializer.ts"
  },
  children: [
    {
      type: "comment",
      text: "Nice job",
      metadata: {
        author: "reviewer"
      }
    }
  ]
};

const threadRes = serializeToMarkdown(testCommentThread);
console.log("Thread Block Output:\n" + threadRes);
assert.ok(threadRes.includes("### File: [src/shared/serializer.ts](./src/shared/serializer.ts)"));

console.log("All serialization tests passed successfully!");
