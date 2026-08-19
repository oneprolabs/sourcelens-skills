<div align="center">

# SourceLens Skills

### The SourceLens skills library — installable agent skills for CLI-driven operations and cross-tool orchestration.

[![Agent Skills](https://img.shields.io/badge/agent_skills-5-1F6FEB?style=flat-square)](#skills)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#install)
[![Git](https://img.shields.io/badge/versioned_with-Git-F05032?style=flat-square&logo=git&logoColor=white)](#maintaining)

[Install](#install) · [Explore skills](#skills) · [Maintain](#maintaining)

</div>

---

SourceLens Skills is the skills library for the SourceLens agent runtime. Every directory under `skills/` is a complete, installable skill. Most skills let a SourceLens agent drive a real toolchain through a native Linux amd64 CLI binary bundled as a SourceLens Artifact; some skills are pure orchestration logic with no bundled binary — they compose one or more of the CLI skills into a higher-level workflow.

The skills shipped today:

| Toolchain | CLI | What it covers |
| --- | --- | --- |
| GitHub | `gh` | Repositories, issues, pull requests, releases, and GitHub Actions. |
| GitLab | `glab` | Projects, issues, merge requests, and pipelines on GitLab.com or a self-managed instance. |
| Jira | `jira` | Atlassian Jira: issues, projects, boards, sprints, and releases on Jira Server or Jira Cloud. |
| Sentry | `sentry-cli` | Issues, events, releases, and diagnostics against a Sentry instance. |

This is a starter set, not an exhaustive catalog. New skills land in the same `skills/` directory following the same packaging contract and are picked up automatically by the installer and the release pipeline.

## What is a SourceLens skill?

Every skill is a complete, self-contained package built around one required file:

- `SKILL.md` — the entry point that defines what the skill does and how the agent should use it: which Artifact or wrapper script to invoke (if any), how the agent should authenticate, and when to prefer one command over another.

Skills that bundle a native binary also carry:

- `sourcelens.json` — the artifact manifest: the runtime environment variables the skill binds, plus the bundled binary's OS/arch entrypoints with pinned SHA-256 checksums.
- `bin/linux-amd64/<binary>` — the statically linked CLI binary, committed and checksummed inside the package.

Orchestration skills that only compose other skills (no bundled binary) ship `SKILL.md` alone — omit `sourcelens.json` and `bin/` when there is nothing to declare.

At run time, SourceLens reads the manifest (when present), binds any declared environment, resolves any declared Artifact, and hands control to the skill exactly as its `SKILL.md` describes. Skills never carry credentials, configuration files, or anything derived from untrusted task text.

## Skills

| Skill | Use it when you need to… |
| --- | --- |
| [GitHub CLI](skills/github-cli/) | manage repositories, issues, pull requests, releases, and GitHub Actions. |
| [GitLab CLI](skills/gitlab-cli/) | manage projects, issues, merge requests, and pipelines on GitLab.com or a self-managed instance. |
| [Jira CLI](skills/jira-cli/) | manage issues, projects, boards, sprints, and releases against a Jira Server or Jira Cloud instance. |
| [Sentry CLI](skills/sentry-cli/) | triage issues, manage releases, and run diagnostics against a Sentry instance. |
| [Engineering Report](skills/engineering-report/) | generate a per-person engineering activity report (completed / in-progress / risks / comment) for a period, by composing the GitHub, GitLab, and Jira CLI skills. |

Each skill is a complete directory. Its `SKILL.md` is the entry point; when a skill bundles a binary, the artifact manifest `sourcelens.json` and the binary must remain with it.

## Install

### One command

Requires Node.js 18 or later.

```bash
# Codex
npx --yes github:oneprolabs/sourcelens-skills install --target codex

# Claude Code
npx --yes github:oneprolabs/sourcelens-skills install --target claude
```

Install to any compatible skills directory:

```bash
npx --yes github:oneprolabs/sourcelens-skills install --target-dir /path/to/skills
```

The installer copies every skill under `skills/`. It will not overwrite an existing skill unless you explicitly add `--force`.

### Git checkout

Use a checkout when you want Git-based updates or intend to contribute:

```bash
git clone git@github.com:oneprolabs/sourcelens-skills.git ~/.sourcelens-skills
mkdir -p ~/.agents/skills
ln -s ~/.sourcelens-skills/skills ~/.agents/skills/sourcelens-skills
```

Codex discovers skills from `~/.agents/skills/`. For Claude Code, link or copy the same `skills/` directory under `~/.claude/skills/`. Restart the agent after first installation, then invoke a skill by name or ask for work that matches its description.

## Repository layout

```text
sourcelens-skills/
├── skills/                  # Installable skills; one directory per skill
│   ├── github-cli/
│   ├── gitlab-cli/
│   ├── jira-cli/
│   ├── sentry-cli/
│   └── engineering-report/  # orchestration skill, no bundled binary
├── bin/sourcelens-skills.mjs # Node installer used by npx
├── AGENTS.md                # Instructions for coding agents and maintainers
├── CLAUDE.md -> AGENTS.md   # Shared instructions for Claude-based tooling
└── package.json             # npm package and CLI definition
```

## Release packaging

Pushing a tag (for example `v0.1.0`) triggers a GitHub Actions workflow that packages **every skill under `skills/`** into a versioned zip (`github-cli.zip`, `gitlab-cli.zip`, `jira-cli.zip`, `sentry-cli.zip`, `engineering-report.zip`, …) and attaches them to the corresponding GitHub release. The zips keep the `<skill>/SKILL.md` and, for skills that bundle a binary, the `<skill>/sourcelens.json` and `<skill>/bin/linux-amd64/<binary>` layout expected by SourceLens. Checksum verification (`verify-checksums.mjs`) runs first and skips skills that have no `sourcelens.json` or declare no artifact entrypoints.

## Maintaining

Git is the source of repository history. Keep skill directory names stable and version releases through commits and tags—not through directory-name suffixes.

Adding a skill is just a new directory under `skills/` with a `SKILL.md`. If it bundles a binary, add `sourcelens.json` + the bundled binary (checksummed) too. The installer, checksum verification, and release pipeline pick it up automatically either way.

Before changing a skill, read [AGENTS.md](AGENTS.md). It defines the guardrails for preserving package integrity, keeping binary checksums in sync, and reviewing changes. `CLAUDE.md` points to the same instructions so Codex-style and Claude-style contributors follow one source of truth.

## License

The repository license has not yet been selected. A license must be added by the rights holder before public redistribution. Until then, all rights are reserved.
