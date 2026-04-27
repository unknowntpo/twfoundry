# Git worktree layout

TWFoundry uses git worktrees for parallel agent and feature work.

## Layout

Keep a plain container directory for the project, and put the anchor checkout in `main/`:

```text
/Users/unknowntpo/repo/unknowntpo/twfoundry/main
```

Create new worktrees as siblings of `main/` inside the same plain container:

```text
/Users/unknowntpo/repo/unknowntpo/twfoundry/<slug>
```

Use the same slug for the directory and branch suffix when practical:

```text
define-backend-platform-contracts
codex/define-backend-platform-contracts
```

Do not use repo-internal `worktrees/` directories or sibling directories named `twfoundry-<slug>`. The parent directory itself is the project container.

## Aliases

The local workflow expects these git aliases to exist:

```sh
git wtclone <plain-dir> <repo-url> [branch]
git wtinit <repo-url> [branch]
git wtnew <worktree-dir> <branch> [base]
git wts
git wtls
git wtrm <worktree-dir>
git wtclean
git wtroot
```

Bootstrap a new repo into this layout:

```sh
git wtclone twfoundry git@github.com:unknowntpo/twfoundry.git
cd twfoundry
```

This creates:

```text
twfoundry/
  main/
```

If the plain container directory already exists, run this from inside it:

```sh
git wtinit git@github.com:unknowntpo/twfoundry.git
```

Create a Codex worktree from the anchor repo:

```sh
git wtnew <slug> codex/<slug>
```

Create a feature worktree from an explicit base:

```sh
git wtnew <slug> feat/<slug> origin/main
```

List worktrees and dirty state:

```sh
git wts
```

Remove a clean worktree:

```sh
git wtrm <slug>
```

Prune stale worktree metadata and remote refs:

```sh
git wtclean
```

## Target state

All active TWFoundry worktrees should appear under the plain `twfoundry/` container when running `git worktree list`, with `main/` as the anchor checkout.
