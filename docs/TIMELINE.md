# Git Timeline

The Timeline View lets you visualize how your codebase's Relationship Graph evolved over git history.

![Timeline](./media/timeline-playback.gif)

## Getting started

1. Open a git repository in VS Code
2. Open CodeGraphy from the activity bar
3. Click **Index Repo** in the toolbar
4. Wait for indexing to complete (progress is shown inline)
5. Scrub, click, or play through the timeline

## How it works

Indexing analyzes the main branch's commit history (up to 500 commits) and caches Timeline Snapshots to disk so reopening the extension does not need to rebuild unchanged history.

Timeline state is stored under `.codegraphy/` alongside the live Graph Cache and repo-local Settings.

Plugin analysis runs during timeline indexing too. Plugins that use the public analysis-hook `context.fileSystem` read files from the selected commit, so third-party plugins can contribute nodes and edges to historical snapshots without depending on the current `HEAD` workspace state.

## Controls

| Control | Action |
|---------|--------|
| Click on track | Jump to that point in time |
| Drag on track | Scrub through time continuously |
| Play button | Start playback from current position |
| Pause button | Stop playback |
| Current button | Jump to the latest commit |

When playing from the end of the timeline, playback automatically restarts from the beginning.

## Playback

Playback advances a smooth time cursor across the timeline. The graph updates each time the cursor crosses a commit boundary. At speed 1x, one real second covers two days of repo time.

The graph preserves node positions across commits — existing nodes stay in place while new nodes animate in via the physics simulation.

## Scrubbing

Click or drag anywhere on the track to position the time cursor at that exact point. The graph shows the state at the most recent commit before the cursor position. The blue indicator shows the precise time position, which can be between commits.

## Node click behavior in timeline mode

Single-clicking a File Node opens that file at the selected commit in temporary preview mode while keeping graph focus. Non-file nodes can still be selected and focused.

Double-clicking a File Node opens that file at the selected commit as a persistent editor tab and focuses the node in the graph.

## Context menu

During timeline mode, destructive file actions (Delete, Rename, Create File, Add to Filter) are hidden from the context menu. Non-destructive actions (Open File, Reveal in Explorer, Copy Path, Toggle Favorite) remain available.

## Refreshing

CodeGraphy keeps using cached Timeline Snapshot data until you intentionally ask for a full rebuild.

- Click **Re-index Repo** to force a full re-index from scratch.
- Click **Refresh Graph** to rerun graph physics/layout without rebuilding timeline or graph data.
- While CodeGraphy is open, normal file saves update the live Graph Cache incrementally.
- If files changed while CodeGraphy was closed, those pending changes are applied the next time you open it.
