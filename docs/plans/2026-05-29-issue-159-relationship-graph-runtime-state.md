# Issue 159: Relationship Graph Runtime State

## Goal

Deepen the Graph View runtime state boundary so callers ask for Relationship Graph behavior instead of reassembling refs, lifecycle details, render caches, timers, and Visible Graph data across the Graph View.

## Source

Trello card: https://trello.com/c/09objACH/159-architecture-deepen-relationship-graph-runtime-state

Recommendation strength: Strong

## Current Shape

`useGraphState` owns real runtime concerns, but its return type is still mostly a bag of implementation details:

- force graph refs
- selection refs and setters
- hover and highlight refs
- context menu state
- cursor and right-click timers
- file info, sprite, mesh, node decoration, and edge decoration caches
- computed force graph data and its backing ref

`Graph` then fans these details back out into interaction runtime setup, auto-fit, debug API setup, callback option building, and viewport props.

## Target Direction

Move toward a runtime module that exposes behavior-oriented surfaces, such as:

- rendered graph data access for surfaces that must render the Visible Graph
- selection behavior instead of raw selected-node refs and setters
- context-selection behavior instead of context-menu state plumbing
- renderer refs and lifecycle behavior instead of individual force graph refs scattered through callers
- render cache invalidation behavior instead of direct sprite, mesh, image-cache, and decoration refs

## Alignment Questions

1. Should this slice create one cohesive `graphRuntime` object, or a small set of named runtime facets such as `selection`, `renderer`, `contextSelection`, and `renderCaches`?
2. Which consumers are allowed to keep raw refs because they integrate with `react-force-graph`, and which should be forced through behavior methods?
3. Should the public boundary continue to use React hook language like `UseGraphStateResult`, or should this become a Graph View runtime model with hook implementation hidden behind it?
4. What behavior is in scope for the first TDD slice: selection pruning, timeline alpha application, image cache invalidation, or interaction/runtime setup?
5. Does this refactor need an ADR, or is the trade-off local and reversible enough to live only in this plan and tests?

## Decisions

- Return one named Graph View runtime object made of explicit facets, such as `selection`, `renderer`, `contextSelection`, and `renderCaches`. Avoid a flat `UseGraphStateResult` bag of refs, but also avoid one vague runtime object with unrelated behavior mixed together.

## First Slice Candidate

Start with tests around the behavior that currently leaks through `UseGraphStateResult`:

- selection is pruned when selected nodes leave the Visible Graph
- timeline alpha is applied through runtime behavior, not by callers knowing about 2D graph refs
- image cache invalidation is triggered through a named behavior rather than exposed setter details

Then narrow the interface exposed from `useGraphState` enough that `Graph` no longer passes every individual state ref by hand.
