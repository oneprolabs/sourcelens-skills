<div align="center">

# SourceLens Skills

### Installable CLI skills for GitHub, GitLab, and Sentry operations.

[![Agent Skills](https://img.shields.io/badge/agent_skills-3-1F6FEB?style=flat-square)](#skills)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#install)
[![Git](https://img.shields.io/badge/versioned_with-Git-F05032?style=flat-square&logo=git&logoColor=white)](#maintaining)

[Install](#install) · [Explore skills](#skills) · [Maintain](#maintaining)

</div>

---

SourceLens Skills is a focused collection of installable agent skills that wrap native Linux amd64 CLI binaries as SourceLens Artifacts. Each skill lets an agent drive a real toolchain directly: GitHub via `gh`, GitLab via `glab`, and Sentry via `sentry-cli`.

## Why SourceLens Skills?

| GitHub | GitLab | Sentry |
| :--- | :--- | :--- |
| Repositories, issues, PRs, and Actions. | Projects, issues, MRs, and pipelines. | Issues, events, releases, and diagnostics. |

Every skill is a complete, self-contained package. Its `SKILL.md` defines the tool-calling contract, `sourcelens.json` declares the runtime environment and the bundled binary artifact, and the binary itself is committed and checksummed in the package.

## Skills

| Skill | Use it when you need to… |
| --- | --- |
| [GitHub CLI](skills/github-cli/) | manage repositories, issues, pull requests, releases, and GitHub Actions. |
| [GitLab CLI](skills/gitlab-cli/) | manage projects, issues, merge requests, and pipelines on GitLab.com or a self-managed instance. |
| [Sentry CLI](skills/sentry-cli/) | triage issues, manage releases, and run diagnostics against a Sentry instance. |

Each skill is a complete directory. Its `SKILL.md` is the entry point; the artifact manifest `sourcelens.json` and the bundled binary must remain with it.

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

The installer copies all three skills. It will not overwrite an existing skill unless you explicitly add `--force`.

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
│   └── sentry-cli/
├── bin/sourcelens-skills.mjs # Node installer used by npx
├── AGENTS.md                # Instructions for coding agents and maintainers
├── CLAUDE.md -> AGENTS.md   # Shared instructions for Claude-based tooling
└── package.json             # npm package and CLI definition
```

## Release packaging

Pushing a tag (for example `v0.1.0`) triggers a GitHub Actions workflow that packages each skill into a versioned zip (`github-cli.zip`, `gitlab-cli.zip`, `sentry-cli.zip`) and attaches them to the corresponding GitHub release. The zips keep the `<skill>/SKILL.md`, `<skill>/sourcelens.json`, and `<skill>/bin/linux-amd64/<binary>` layout expected by SourceLens.

## Maintaining

Git is the source of repository history. Keep skill directory names stable and version releases through commits and tags—not through directory-name suffixes.

Before changing a skill, read [AGENTS.md](AGENTS.md). It defines the guardrails for preserving package integrity, keeping binary checksums in sync, and reviewing changes. `CLAUDE.md` points to the same instructions so Codex-style and Claude-style contributors follow one source of truth.

## License

The repository license has not yet been selected. A license must be added by the rights holder before public redistribution. Until then, all rights are reserved.
