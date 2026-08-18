---
name: gitlab-cli
description: GitLab CLI for projects, issues, merge requests, and pipelines.
---

# GitLab CLI

Use this Skill for GitLab operations. The package contains one native Linux
amd64 Artifact and no scripts or external reference files. Authentication must
come from the runtime `GITLAB_TOKEN` environment variable; never put tokens,
credentials, or config files in the package. The default service is GitLab.com;
when `GITLAB_HOST` is set, direct every command at that self-managed instance
instead.

## Exact tool call

Call the declared Artifact named `glab` and pass the CLI arguments as an array:

```text
run_skill_artifact({
  "artifact": "glab",
  "args": ["issue", "view", "123", "--repo", "GROUP/PROJECT"]
})
```

Use the same call shape for every `glab` subcommand. Prefer JSON output when
the command supports it and when the result will be interpreted or summarized.
Use `glab api` with relative paths for GitLab API operations not covered by a
dedicated command. Do not call `run_skill_script`, `call_skill_api`, or an
undeclared executable.

`glab api` always resolves a relative path against an `https://` base URL. When
the bound `GITLAB_HOST` is served over plain `http://`, pass the FULL absolute
URL (including `http://`) to `glab api` instead of a relative path; otherwise
glab builds an `https://` URL and the request fails with
`http: server gave HTTP response to HTTPS client`.

## Common operations

- Issues: `issue list`, `issue view`, `issue create`, `issue note`
- Merge requests: `mr list`, `mr view`, `mr create`, `mr update`
- CI/CD: `ci status`, `ci list`, `ci trace`, `ci retry`
- Projects and releases: `project view`, `release list`
- API: `api <path>`; GitLab API v4 is prepended for relative paths (which
  imply `https://`). When `GITLAB_HOST` is `http://`, pass the full absolute
  URL instead, e.g. `api http://<host>/api/v4/projects?per_page=100`

Confirm the group, project, and target resource before mutations. Do not delete
or retry production resources without explicit user approval.

## Runtime compatibility

Supported platform: Linux amd64 (`x86_64`) only. The Artifact is statically
linked and needs no package manager, repository checkout, loader path, or
download during a Run. SourceLens must reject other OS/CPU combinations rather
than falling back to another binary.
