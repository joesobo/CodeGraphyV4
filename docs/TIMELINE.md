# Git Timeline

The timeline lets you visualize how your codebase's dependency graph evolved over git history.

![Timeline](./media/timeline-playback.gif)

## Getting started

1. Open a git repository in VS Code
2. Open CodeGraphy from the activity bar
3. Click **Index Repo** at the bottom of the graph view
4. Wait for indexing to complete (progress is shown inline)
5. Scrub, click, or play through the timeline

## How it works

Indexing analyzes the main branch's commit history (up to 500 commits). The first commit is fully analyzed, then each subsequent commit uses diff-based incremental analysis — only changed files are re-analyzed. Results are cached to disk so reopening the extension loads the timeline instantly.

The timeline respects your current settings:
- **Filter patterns** are applied during indexing
- **Disabled plugins and rules** are applied at display time — toggle a rule off and it's off across all commits
- **Show Orphans** filtering is applied at display time

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

## Double-click in timeline mode

Double-clicking a node during timeline mode opens a read-only preview of that file at the current commit, using VS Code's built-in git file viewer.

## Context menu

During timeline mode, destructive file actions (Delete, Rename, Create File, Add to Filter) are hidden from the context menu. Non-destructive actions (Open File, Reveal in Explorer, Copy Path, Toggle Favorite) remain available.

## Cache

Timeline data is cached in the extension's storage directory (`context.storageUri/git-cache/`). The cache is automatically invalidated when:
- Filter patterns change
- Disabled plugins or rules change (`codegraphy.disabledPlugins`, `codegraphy.disabledRules`)
- You click Index Repo again (re-indexes from scratch)

To force a fresh index, click **Index Repo** again.
