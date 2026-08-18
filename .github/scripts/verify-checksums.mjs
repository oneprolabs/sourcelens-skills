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
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  const entrypoints = Object.values(manifest.artifacts ?? {}).flatMap(
    (artifact) => artifact.entrypoints ?? []
  );

  if (entrypoints.length === 0) {
    throw new Error(`${skillName}: no artifact entrypoints declared in sourcelens.json`);
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
