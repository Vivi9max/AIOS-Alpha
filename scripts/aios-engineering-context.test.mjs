<CodeBlock language="javascript" editable>
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
buildRepositoryIndex,
inspectRepositoryTarget,
} from "./aios-engineering-context.mjs";
function git(root, args) {
execFileSync("git", args, {
cwd: root,
encoding: "utf8",
stdio: ["ignore", "pipe", "pipe"],
});
}
function write(root, relativePath, content) {
const absolutePath = path.join(root, relativePath);
fs.mkdirSync(path.dirname(absolutePath), {
recursive: true,
});
fs.writeFileSync(absolutePath, content);
}
function createFixture() {
const root = fs.mkdtempSync(
path.join(os.tmpdir(), "aios-engineering-context-"),
);
git(root, ["init"]);
git(root, ["config", "user.name", "AIOS Test"]);
git(root, ["config", "user.email", "aios-test@example.invalid"]);
write(
root,
"tsconfig.json",
JSON.stringify(
{
compilerOptions: {
target: "ES2020",
module: "commonjs",
moduleResolution: "node",
strict: true,
esModuleInterop: true,
skipLibCheck: true,
},
include: ["src/**/*.ts"],
},
null,
2,
),
);
write(
root,
"package.json",
JSON.stringify({
name: "aios-engineering-fixture",
private: true,
}),
);
write(root, ".gitignore", "node_modules/\n");
write(
root,
"src/service.ts",
[
'import { calculate } from "./math";',
"",
"export function service(value: number): number {",
" return calculate(value);",
"}",
"",
].join("\n"),
);
write(
root,
"src/math.ts",
[
"export function calculate(value: number): number {",
" return value * 2;",
"}",
"",
].join("\n"),
);
write(
root,
"src/tests/service.test.ts",
[
'import { service } from "../service";',
"",
"const result: number = service(2);",
"void result;",
"",
].join("\n"),
);
git(root, ["add", "."]);
git(root, ["commit", "-m", "fixture"]);
return root;
}
function cleanup(root) {
fs.rmSync(root, {
recursive: true,
force: true,
});
}
test("snapshot records HEAD, tracked files, and content hashes", () => {
const root = createFixture();
try {
const result = buildRepositoryIndex(root);
assert.equal(result.schemaVersion, 1);
assert.match(result.head, /^[0-9a-f]{40,64}$/i);
assert.equal(result.trackedFileCount, 6);
const service = result.trackedFiles.find(
(item) => item.path === "src/service.ts",
);
assert.ok(service);
assert.match(service.sha256, /^[0-9a-f]{64}$/);
assert.match(service.blobSha, /^[0-9a-f]{40,64}$/i);
} finally {
cleanup(root);
}
});
test("snapshot excludes untracked files", () => {
const root = createFixture();
try {
write(root, "src/untracked.ts", "export const value = 1;\n");
const result = buildRepositoryIndex(root);
assert.equal(
result.trackedFiles.some(
(item) => item.path === "src/untracked.ts",
),
false,
);
} finally {
cleanup(root);
}
});
test("snapshot fails closed when tracked worktree is dirty", () => {
const root = createFixture();
try {
write(
root,
"src/service.ts",
"export function service(): number { return 999; }\n",
);
assert.throws(
() => buildRepositoryIndex(root),
(error) =>
error.code ===
"AIOS_ENGINEERING_TRACKED_WORKTREE_DIRTY",
);
} finally {
cleanup(root);
}
});
test("inspect returns direct dependencies and reverse importers", () => {
const root = createFixture();
try {
const result = inspectRepositoryTarget(
root,
"src/service.ts",
);
assert.equal(result.target, "src/service.ts");
assert.deepEqual(
result.directDependencies,
["src/math.ts"],
);
assert.deepEqual(
result.reverseImporters,
["src/tests/service.test.ts"],
);
assert.ok(
result.likelyTests.includes(
"src/tests/service.test.ts",
),
);
assert.ok(
result.context.includes("export function calculate"),
);
assert.ok(
result.context.includes("export function service"),
);
} finally {
cleanup(root);
}
});
test("inspect rejects path traversal", () => {
const root = createFixture();
try {
assert.throws(
() => inspectRepositoryTarget(root, "../outside.ts"),
(error) =>
error.code ===
"AIOS_ENGINEERING_TARGET_PATH_INVALID",
);
} finally {
cleanup(root);
}
});
test("inspect rejects untracked target files", () => {
const root = createFixture();
try {
write(root, "src/new-file.ts", "export const value = 1;\n");
assert.throws(
() => inspectRepositoryTarget(root, "src/new-file.ts"),
(error) =>
error.code ===
"AIOS_ENGINEERING_TARGET_NOT_TRACKED",
);
} finally {
cleanup(root);
}
});
test("snapshot fails closed for unresolved internal dependencies", () => {
const root = createFixture();
try {
write(
root,
"src/service.ts",
[
'import { missing } from "./does-not-exist";',
"export const value = missing;",
"",
].join("\n"),
);
git(root, ["add", "src/service.ts"]);
git(root, ["commit", "-m", "add unresolved dependency"]);
assert.throws(
() => buildRepositoryIndex(root),
(error) =>
error.code ===
"AIOS_ENGINEERING_INTERNAL_DEPENDENCY_UNRESOLVED",
);
} finally {
cleanup(root);
}
});
test("inspect rejects a dirty worktree even with an existing index", () => {
const root = createFixture();
try {
const index = buildRepositoryIndex(root);
write(
root,
"src/service.ts",
"export function service(): number { return 100; }\n",
);
assert.throws(
() =>
inspectRepositoryTarget(
root,
"src/service.ts",
index,
),
(error) =>
error.code ===
"AIOS_ENGINEERING_TRACKED_WORKTREE_DIRTY",
);
} finally {
cleanup(root);
}
});
test("inspect rejects an index from an older HEAD", () => {
const root = createFixture();
try {
const oldIndex = buildRepositoryIndex(root);
write(
root,
"src/service.ts",
"export function service(): number { return 100; }\n",
);
git(root, ["add", "src/service.ts"]);
git(root, ["commit", "-m", "advance head"]);
assert.throws(
() =>
inspectRepositoryTarget(
root,
"src/service.ts",
oldIndex,
),
(error) =>
error.code ===
"AIOS_ENGINEERING_INDEX_STALE",
);
} finally {
cleanup(root);
}
});
test("inspect fails closed when context exceeds the configured limit", () => {
const root = createFixture();
try {
const largeText = "x".repeat(210000);
write(
root,
"src/service.ts",
export const payload = "$DIL0";\n,
);
git(root, ["add", "src/service.ts"]);
git(root, ["commit", "-m", "large source"]);
assert.throws(
() => inspectRepositoryTarget(root, "src/service.ts"),
(error) =>
error.code ===
"AIOS_ENGINEERING_CONTEXT_TOO_LARGE" ||
error.code ===
"AIOS_ENGINEERING_FILE_TOO_LARGE",
);
} finally {
cleanup(root);
}
});
test("snapshot accepts tracked CSS imports without adding them to the TypeScript graph", () => {
const root = createFixture();
try {
write(
root,
"src/styles.css",
"body { margin: 0; }\n",
);
write(
root,
"src/service.ts",
[
'import "./styles.css?inline";',
'import { calculate } from "./math";',
"",
"export function service(value: number): number {",
" return calculate(value);",
"}",
"",
].join("\n"),
);
git(root, ["add", "src/service.ts", "src/styles.css"]);
git(root, ["commit", "-m", "add tracked CSS asset import"]);
const result = buildRepositoryIndex(root);
assert.ok(
result.trackedFiles.some(
(item) => item.path === "src/styles.css",
),
);
assert.deepEqual(
result.graph.dependencies["src/service.ts"],
["src/math.ts"],
);
assert.equal(
Object.prototype.hasOwnProperty.call(
result.graph.dependencies,
"src/styles.css",
),
false,
);
} finally {
cleanup(root);
}
});
test("snapshot rejects missing CSS assets", () => {
const root = createFixture();
try {
write(
root,
"src/service.ts",
[
'import "./missing.css";',
"export const value = 1;",
"",
].join("\n"),
);
git(root, ["add", "src/service.ts"]);
git(root, ["commit", "-m", "add missing CSS import"]);
assert.throws(
() => buildRepositoryIndex(root),
(error) =>
error.code ===
"AIOS_ENGINEERING_INTERNAL_DEPENDENCY_UNRESOLVED",
);
} finally {
cleanup(root);
}
});
test("snapshot rejects untracked CSS assets", () => {
const root = createFixture();
try {
write(
root,
"src/styles.css",
"body { margin: 0; }\n",
);
write(
root,
"src/service.ts",
[
'import "./styles.css";',
"export const value = 1;",
"",
].join("\n"),
);
git(root, ["add", "src/service.ts"]);
git(root, ["commit", "-m", "add untracked CSS import"]);
assert.throws(
() => buildRepositoryIndex(root),
(error) =>
error.code ===
"AIOS_ENGINEERING_INTERNAL_DEPENDENCY_UNRESOLVED",
);
} finally {
cleanup(root);
}
});
</CodeBlock>
