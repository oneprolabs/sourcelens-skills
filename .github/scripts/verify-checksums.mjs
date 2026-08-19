#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillsRoot = path.join(repositoryRoot, "skills");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function verifySkill(skillName) {
  const skillDir = path.join(skillsRoot, skillName);
  const manifestPath = path.join(skillDir, "sourcelens.json");

  // Not every skill bundles a native binary — some are pure Markdown
  // orchestration skills with no sourcelens.json at all. Skip verification
  // rather than failing the release for skills with nothing to check.
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`Skipped ${skillName}: no sourcelens.json (no bundled artifacts).`);
      return;
    }
    throw error;
  }

  const entrypoints = Object.values(manifest.artifacts ?? {}).flatMap(
    (artifact) => artifact.entrypoints ?? []
  );

  if (entrypoints.length === 0) {
    console.log(`Skipped ${skillName}: sourcelens.json declares no artifact entrypoints.`);
    return;
  }

  for (const entrypoint of entrypoints) {
    const binaryPath = path.join(skillDir, entrypoint.path);
    await stat(binaryPath);
    const actual = sha256(await readFile(binaryPath));
    if (actual !== entrypoint.sha256) {
      throw new Error(
        `${skillName}: checksum mismatch for ${entrypoint.path} (expected ${entrypoint.sha256}, got ${actual})`
      );
    }
    console.log(`Verified ${skillName}/${entrypoint.path}`);
  }
}

try {
  const skillNames = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const skillName of skillNames) {
    await verifySkill(skillName);
  }
  console.log(`All ${skillNames.length} skills verified.`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
