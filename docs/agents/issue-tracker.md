# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `joesobo/CodeGraphyV4`. Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically inside the clone.

## Skill phrases

- "publish to the issue tracker" means create a GitHub issue.
- "fetch the relevant ticket" means run `gh issue view <number> --comments`.
