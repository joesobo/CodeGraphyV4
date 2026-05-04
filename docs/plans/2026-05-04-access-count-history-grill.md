# Access Count From Git History Touches

## Status

Discussion branch. No implementation yet.

## Task Pick

Pick: expand **Access Count** to include Git history touches.

I picked this ahead of collapsible folder nodes because it strengthens an existing graph sizing mode with data CodeGraphy already collects for the **Timeline View**. Collapsible folder nodes are still valuable, but they are a larger **Collapse Projection** and **Folder Node** interaction design problem and should get their own focused pass.

## Goal

Make **Size by Access Count** highlight files that are repeatedly active in repo history, even before the user opens those files in the current VS Code session.

## Glossary Alignment

These terms already exist in `CONTEXT.md` and should stay canonical:

- **Relationship Graph**: the graph CodeGraphy visualizes.
- **Visible Graph**: the graph shown in the **Graph View** after scope, filters, search, and view settings.
- **Timeline View**: where users inspect graph changes across git history.
- **Timeline Snapshot**: graph state for a specific commit.
- **Graph Revision**: the git revision whose files are used for the graph being shown.
- **Graph Cache**: repo-local `.codegraphy/graph.lbug` data.

Working terms for this plan:

- **Editor visit count**: the existing current-session/local visit source stored as `codegraphy.fileVisits`.
- **Git history touch count**: a derived count of how often a file appears as added, modified, or renamed while CodeGraphy indexes git history.
- **Access Count**: the node metric used by the existing **Size by Access Count** mode.

## Recommendation Before Grilling

Start with the smallest user-visible change:

- Keep the existing **Size by Access Count** control.
- Keep `accessCount` as the node field.
- Sum editor visits and cached Git history touches into that value.
- Do not add a new UI control in the first slice.
- Do not run new git-history commands during normal graph refresh; only reuse valid data produced by Timeline indexing.

## Grill Log

### Question 1: Should Git history touches be folded into `accessCount`, or should they become a separate sizing mode?

Recommendation: fold them into `accessCount` for the first slice.

Reasoning: A user choosing **Size by Access Count** is probably asking, "which files are active enough to deserve visual weight?" Editor visits are one signal, but Git history touches are another strong activity signal. A separate sizing mode adds UI surface before we know users need to distinguish "I opened this" from "the repo changed this."

Decision: fold Git history touches into existing `accessCount`. Do not add a separate sizing mode in this slice.

### Question 2: If folded in, should there be a visible way to explain the source breakdown later?

Recommendation: keep the first slice quiet in the graph controls, but preserve the source split internally so a later tooltip/details panel can explain it.

Reasoning: the node sizing mode should stay simple. However, if users notice a file is large even though they have not opened it, CodeGraphy should eventually be able to say something like "Access Count: 12, from 2 editor visits and 10 Git history touches." That means the implementation should not throw away the source breakdown too early, even though the graph node still exposes one combined `accessCount`.

Pending user decision.

## Open Questions

1. Should there be a visible way to explain the source breakdown later?
3. Should touch counts include only files present as graphable **File Nodes**, or any path from git history?
4. How should renames count?
5. Should current **Timeline Snapshots** show cumulative touch counts as of that commit, or only the final cached touch count?
6. What invalidates the cached touch count?
7. Does this need a new user-facing setting or can the existing sizing mode carry it?
