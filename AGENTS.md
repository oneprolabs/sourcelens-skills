# Agent Instructions

## Repository purpose

SourceLens Skills is a repository of self-contained agent skills for GitHub, GitLab, Jira, and Sentry operations. Each skill bundles a native Linux amd64 CLI binary as a SourceLens Artifact.

## Repository rules

- Use Chinese for conversations with repository collaborators. Use English for all repository-facing content, including code comments, README files, documentation, commit messages, pull-request text, and issue text.
- Read `README.md` before making repository changes.
- Treat every directory under `skills/` as a complete, installable package.
- Do not alter skill behavior, binaries, or agent metadata (`SKILL.md`, `sourcelens.json`) without an explicit request.
- Keep binary checksums in each skill's `sourcelens.json` in sync with the bundled binary. Never commit unsigned or mismatched binaries.
- Do not add version suffixes to skill directory names. Use Git history and tags for version management.
- Keep repository tooling and documentation outside `skills/`.
- Do not add company-confidential information, credentials, customer data, or private environment details.

## Changes and review

Before handing off a change:

1. Confirm that all skill package files remain present.
2. Check that `SKILL.md` files and `sourcelens.json` were not changed unintentionally.
3. Verify the binary checksum matches `sourcelens.json` (`shasum -a 256 skills/<skill>/bin/linux-amd64/<binary>`).
4. Test the relevant npm command or Node CLI behavior.
5. Review the final Git diff for unrelated changes.

The root `README.md` is the public installation and usage reference. Keep it concise and in English.
