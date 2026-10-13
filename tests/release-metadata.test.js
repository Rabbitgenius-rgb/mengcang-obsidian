"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const readJson = (relativePath) => JSON.parse(readFileSync(
  path.join(__dirname, "..", relativePath),
  "utf8"
));

const numericIdentifier = "(?:0|[1-9][0-9]*)";
const prereleaseIdentifier = `(?:${numericIdentifier}|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)`;
const semanticVersion = new RegExp(
  `^${numericIdentifier}\\.${numericIdentifier}\\.${numericIdentifier}` +
  `(?:-${prereleaseIdentifier}(?:\\.${prereleaseIdentifier})*)?` +
  `(?:\\+[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*)?$`
);

function assertVersion(value, label) {
  assert.equal(typeof value, "string", `${label} must be a version string`);
  const match = semanticVersion.exec(value);
  assert.ok(match && match[0] === value, `${label} must be a valid semantic version`);
}

// build-desktop.mjs reads the desktop version from package.json. The Obsidian
// connector instead reports manifest.version; those release lines may differ.
test("desktop package and both lockfile version fields stay aligned", () => {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");

  assertVersion(packageJson.version, "package.json version");
  assertVersion(packageLock.version, "package-lock.json version");
  assertVersion(packageLock.packages?.[""]?.version, "package-lock.json root package version");
  assert.equal(packageLock.version, packageJson.version, "top-level lock version must match the desktop package");
  assert.equal(packageLock.packages[""].version, packageJson.version, "root lock package version must match the desktop package");
});

test("Obsidian plugin release maps to its declared minimum app version", () => {
  const manifest = readJson("manifest.json");
  const versions = readJson("versions.json");

  assertVersion(manifest.version, "manifest version");
  assertVersion(manifest.minAppVersion, "manifest minimum app version");
  assert.ok(versions && typeof versions === "object" && !Array.isArray(versions), "versions.json must be an object");
  for (const [pluginVersion, minimumAppVersion] of Object.entries(versions)) {
    assertVersion(pluginVersion, "versions.json release key");
    assertVersion(minimumAppVersion, `versions.json minimum app version for ${pluginVersion}`);
  }
  assert.ok(Object.hasOwn(versions, manifest.version), "versions.json must include the current plugin release");
  assert.equal(versions[manifest.version], manifest.minAppVersion, "current plugin release must map to manifest.minAppVersion");
});
