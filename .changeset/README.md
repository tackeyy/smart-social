# Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## How to add a changeset

When you make a change that should be released, run:

```bash
npx changeset
```

This will prompt you to:
1. Select which packages have changed (if monorepo)
2. Choose the semver bump type (`major`, `minor`, or `patch`)
3. Write a summary of your changes

The changeset file will be committed with your changes.

## Release process

Releases are automated via GitHub Actions (`release.yml`).

When changesets are merged to `main`:
1. A "Version Packages" PR is automatically created
2. Merging that PR publishes to npm and creates a GitHub Release

## Semver guidelines

- `patch` — bug fixes, documentation updates
- `minor` — new features, non-breaking changes
- `major` — breaking changes
