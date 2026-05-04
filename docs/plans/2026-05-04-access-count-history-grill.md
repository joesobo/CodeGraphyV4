# Size By Churn From Git History Touches

## Status

Implementation in progress on `codex/access-count-history-grill` with PR tracking in GitHub.

Core decisions are resolved. The branch now computes Git history touch counts during Timeline indexing, writes cumulative churn onto **Timeline Snapshots**, persists the latest churn for current graphs, hides **Size by Churn** until Git history has been indexed, migrates old `access-count` settings to `churn`, and removes editor visit tracking from graph sizing/file info/tooltips.

## Task Pick

Pick: replace **Size by Access Count** with **Size by Churn** based on Git history touches.

I picked this ahead of collapsible folder nodes because it strengthens an existing graph sizing mode with data CodeGraphy already collects for the **Timeline View**. Collapsible folder nodes are still valuable, but they are a larger **Collapse Projection** and **Folder Node** interaction design problem and should get their own focused pass.

## Goal

Make **Size by Churn** highlight files that are repeatedly active in repo history.

## Product Pivot

After Question 1, the direction shifted: editor visits may not be the right primary signal. The more valuable graph read may be "which files have high churn across repo history?"

Under this framing, the sizing mode would stop mixing editor visits with history. Instead, it would use Git history touches only:

- A file touched in more commits should render larger.
- A file touched in fewer commits should render smaller.
- The scale should use the repo's observed min and max history-touch counts so node size expresses relative churn.
- Example: if the indexed history has 10 commits and `a.ts` appears in 5 changed commits, `a.ts` should land around the middle of the size range.
- A file touched in only 1 commit should land at the minimum size.

Decision: use **Size by Churn** in the UI. Use **Git history touch count** as the precise implementation/domain term.

## Glossary Alignment

These terms already exist in `CONTEXT.md` and should stay canonical:

- **Relationship Graph**: the graph CodeGraphy visualizes.
- **Visible Graph**: the graph shown in the **Graph View** after scope, filters, search, and view settings.
- **Timeline View**: where users inspect graph changes across git history.
- **Timeline Snapshot**: graph state for a specific commit.
- **Graph Revision**: the git revision whose files are used for the graph being shown.
- **Graph Cache**: repo-local `.codegraphy/graph.lbug` data.

Working terms for this plan:

- **Editor visit count**: the existing current-session/local visit source stored as `codegraphy.fileVisits`; this is slated for removal in this feature.
- **Git history touch count**: a derived count of how often a file appears as added, modified, or renamed while CodeGraphy indexes git history.
- **Churn**: the user-facing graph-sizing concept that makes high-change files visually stand out.

## Recommendation Before Grilling

Start with the smallest user-visible change:

- Replace the existing **Size by Access Count** control with **Size by Churn**.
- Use Git history touches as the sizing metric.
- Remove editor visit tracking and the `Visits` file-info/tooltip surface.
- Do not add a new UI control in the first slice.
- Do not run new git-history commands during normal graph refresh; only reuse valid data produced by Timeline indexing.

## Grill Log

### Superseded Question 1: Should Git history touches be folded into `accessCount`, or should they become a separate sizing mode?

Recommendation: fold them into `accessCount` for the first slice.

Reasoning: A user choosing **Size by Access Count** is probably asking, "which files are active enough to deserve visual weight?" Editor visits are one signal, but Git history touches are another strong activity signal. A separate sizing mode adds UI surface before we know users need to distinguish "I opened this" from "the repo changed this."

Superseded by the churn pivot. The user-facing mode is now **Size by Churn**, not **Size by Access Count**. The remaining implementation question is whether the code keeps a compatibility-shaped internal field/mode id temporarily or moves directly to churn naming.

### Superseded Question 2: If folded in, should there be a visible way to explain the source breakdown later?

Recommendation: keep the first slice quiet in the graph controls, but preserve the source split internally so a later tooltip/details panel can explain it.

Reasoning: the node sizing mode should stay simple. However, if users notice a file is large even though they have not opened it, CodeGraphy should eventually be able to say something like "Access Count: 12, from 2 editor visits and 10 Git history touches." That means the implementation should not throw away the source breakdown too early, even though the graph node still exposes one combined `accessCount`.

Superseded by the product pivot above. If editor visits are removed from this sizing mode, there is no editor/history source breakdown to preserve for the first slice.

### Question 1: Is the user-facing metric still **Access Count**, or should this become **Churn** / **History Touches**?

Recommendation: rename the sizing mode away from **Access Count**. Use **Size by Churn** if we want the product language to describe the user's interpretation, or **Size by History Touches** if we want the product language to describe the exact measurement.

My preference: **Size by Churn** for the UI, with **Git history touch count** as the implementation/domain term in the plan. Users care that high-churn files stand out; "history touches" is precise but a little mechanical.

Decision: use **Size by Churn** for the UI and **Git history touch count** for the measurement/domain term.

### Question 2: Should editor visits be removed entirely from graph sizing?

Code check: editor visits currently update `accessCount` and show separately as `Visits` in file info/tooltips.

Recommendation: remove editor visits from graph sizing, but do not delete visit tracking in this slice. **Size by Churn** should be history-only. Existing editor visit tracking can stay available for file info/tooltips until a separate cleanup decides whether it still earns its keep.

Decision: remove editor visits entirely. The implementation should remove editor visit tracking, the `codegraphy.fileVisits` usage, access-count update messages, and the `Visits` file-info/tooltip surface unless code exploration finds another required reason to keep a small compatibility adapter.

### Question 3: Should the implementation rename the internal field/mode from access count to churn?

Recommendation: yes, move to churn naming directly. If the feature is no longer about editor access, keeping `accessCount` and `access-count` as canonical names will confuse future work. If persisted settings need a transition, handle the old `access-count` value as a one-time migration to `churn`, not as an ongoing compatibility concept.

Decision: rename the internal field/mode from access count to churn. Replace `accessCount` / `access-count` as canonical names. Old persisted settings may migrate once to `churn`, but ongoing code should use churn language.

### Question 4: Should touch counts include only graphable **File Nodes**, or any path from git history?

Code check: current graph sizing operates on rendered graph nodes. **Folder Nodes** and **Package** nodes have different semantics from **File Nodes**, and git history can include paths CodeGraphy deliberately does not graph because of filters, unsupported file types, generated files, or disabled graph scope.

Recommendation: count only graphable **File Nodes** for this slice. **Size by Churn** should explain why visible file nodes are large or small, not keep hidden churn state for paths the **Relationship Graph** does not represent.

Decision: count only graphable **File Nodes**. Ignore paths that are not represented as file nodes in the graph for that graph revision.

### Question 5: Should history touches count commits that touched a file, raw file-change events, or both?

Recommendation: count commits that touched a graphable file node. If one commit changes `a.ts`, that is one touch for `a.ts`, even if the file has many line changes. This matches the product read: "which files keep coming up across repo history?" It also matches the example where 5 commits out of 10 touching `a.ts` should make it roughly 50% of the size range.

Decision: count one touch per graphable file per commit. A file changed in five indexed commits has a Git history touch count of five.

### Question 6: How should renames count?

Recommendation: follow Git rename status and carry the previous path's touch count forward to the new path, then count the rename commit as one touch for the new path. If Git does not report a rename, treat delete plus add as separate file histories.

Decision: follow Git rename status. Carry the old path's touch count to the new path, count the rename commit once for the new path, and treat delete plus add as separate histories when Git does not report a rename.

### Question 7: Should **Timeline Snapshots** show cumulative churn as of that commit, or the final cached churn value?

Recommendation: **Timeline Snapshots** should show cumulative churn as of that commit. If a user scrubs through history, node size should tell the truth for the selected **Graph Revision** rather than leaking future churn into the past.

Decision: **Timeline Snapshots** show cumulative churn as of their selected commit. The current/default graph uses the latest cached churn for the current **Graph Revision**.

### Question 8: What invalidates cached churn counts?

Recommendation: tie churn invalidation to Timeline cache invalidation for this slice. Git history touch counts are derived from the same commit walk, graphability rules, filters, and plugin signature as Timeline indexing, so the existing Timeline cache version/signature boundary should own it. If a later implementation stores churn somewhere separate from Timeline snapshots, it should still include the same invalidation inputs.

Decision: cached churn counts use the Timeline cache invalidation boundary for this slice.

### Question 9: Does **Size by Churn** require Git history indexing first?

Recommendation: yes. Do not make normal graph indexing run a Git history walk just because the user selected **Size by Churn**. If no valid Timeline/churn cache exists, the UI should make that dependency clear rather than silently showing misleading uniform/min-sized nodes.

Possible UX:

- Keep **Size by Churn** visible but disabled until Git history has been indexed.
- If a saved setting points at `churn` but the cache is missing or invalid, fall back to a neutral sizing mode and surface a lightweight prompt to index Git history.
- The **Timeline View** and **Size by Churn** should share the same "index Git history" workflow and cache.

Decision: **Size by Churn** requires valid Git history indexing. Hide the churn size option until Git history has been indexed. Do not trigger Timeline indexing implicitly from normal graph sizing.

## Open Questions

None. Major product decisions are resolved.

## Implementation Plan

1. [x] Replace the **Size by Access Count** mode with **Size by Churn**.
2. [x] Rename canonical internal types/fields from access count to churn, including node sizing mode ids and graph node metric fields. Migrate old persisted `access-count` settings once to `churn`.
3. [x] Remove editor visit tracking, `codegraphy.fileVisits`, access-count update messages, and the `Visits` file-info/tooltip surface.
4. [x] During Timeline indexing, compute Git history touch counts for graphable **File Nodes** only.
5. [x] Count one touch per graphable file per commit.
6. [x] Carry churn forward across Git-reported renames, count the rename commit once for the new path, and treat delete plus add as separate histories when Git does not report a rename.
7. [x] Store cumulative churn on each **Timeline Snapshot** as of that commit, and store the latest churn for the current/default **Graph Revision**.
8. [x] Invalidate churn with the Timeline cache boundary.
9. [x] Hide **Size by Churn** until valid Git history indexing exists.
