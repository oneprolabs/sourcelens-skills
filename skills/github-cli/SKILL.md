---
name: github-cli
description: GitHub CLI for repositories, issues, pull requests, and Actions.
---

# GitHub CLI

Use this Skill for GitHub operations. The package contains one native Linux
amd64 Artifact and no scripts or external reference files. Authentication must
come from the runtime environment; never put tokens, credentials, or config
files in the package.

## Exact tool call

Call the declared Artifact named `gh` and pass the CLI arguments as an array:

```text
run_skill_artifact({
  "artifact": "gh",
  "args": ["issue", "view", "123", "--repo", "OWNER/REPO"]
})
```

Use the same call shape for every `gh` subcommand. Prefer `--json` with a
small `--jq` projection when the result will be interpreted or summarized.
Use `gh api` only when no dedicated command provides the required operation.
Do not call `run_skill_script`, `call_skill_api`, or an undeclared executable.

## Common operations

- Repository: `repo view`, `repo list`, `repo clone`
- Issues: `issue list`, `issue view`, `issue create`, `issue edit`
- Pull requests: `pr list`, `pr view`, `pr create`, `pr review`, `pr merge`
- Actions: `run list`, `run view`, `run watch`, `workflow list`
- Releases: `release list`, `release view`, `release create`
- API: `api <relative-or-absolute-endpoint>`

Confirm the repository, organization, and target resource before mutations.
Do not delete repositories, issues, releases, or project data without explicit
user approval.

## Runtime compatibility

Supported platform: Linux amd64 (`x86_64`) only. The Artifact is statically
linked and needs no package manager, repository checkout, loader path, or
download during a Run. SourceLens must reject other OS/CPU combinations rather
than falling back to another binary.
