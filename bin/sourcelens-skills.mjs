#!/usr/bin/env node

import { cp, mkdir, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(repositoryRoot, "skills");

function usage() {
  console.log(`Usage:
  sourcelens-skills install --target codex|claude
  sourcelens-skills install --target-dir /path/to/skills

Options:
  --force    Replace existing skill directories
`);
}

function parseArgs(args) {
  const options = { force: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force") options.force = true;
    else if (arg === "--target") options.target = args[++index];
    else if (arg === "--target-dir") options.targetDir = args[++index];
    else if (!options.command) options.command = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function resolveTarget(options) {
  if (options.target === "codex") return path.join(os.homedir(), ".agents", "skills");
  if (options.target === "claude") return path.join(os.homedir(), ".claude", "skills");
  if (options.targetDir) return path.resolve(options.targetDir);
  throw new Error("Choose --target codex|claude or provide --target-dir.");
}

async function install(options) {
  const targetRoot = await resolveTarget(options);
  const skillNames = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  await mkdir(targetRoot, { recursive: true });
  for (const skillName of skillNames) {
    const source = path.join(skillsRoot, skillName);
    const destination = path.join(targetRoot, skillName);
    try {
      await stat(destination);
      if (!options.force) throw new Error(`${destination} already exists; rerun with --force to replace it.`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await cp(source, destination, { recursive: true, force: options.force, errorOnExist: !options.force });
    console.log(`Installed ${skillName} -> ${destination}`);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.command !== "install") {
    usage();
    process.exitCode = options.command ? 1 : 0;
  } else {
    await install(options);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
