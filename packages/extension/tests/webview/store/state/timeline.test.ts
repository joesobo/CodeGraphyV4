import { describe, it, expect, beforeEach } from 'vitest';
import { createGraphStore } from '../../../../src/webview/store/state';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { ICommitInfo } from '../../../../src/shared/timeline/contracts';

describe('GraphStore: Timeline', () => {
  let store: ReturnType<typeof createGraphStore>;

  beforeEach(() => {
    store = createGraphStore();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it('has correct initial timeline state', () => {
    const state = store.getState();
    expect(state.timelineActive).toBe(false);
    expect(state.timelineCommits).toEqual([]);
    expect(state.currentCommitSha).toBeNull();
    expect(state.isIndexing).toBe(false);
    expect(state.indexProgress).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.playbackSpeed).toBe(1.0);
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  it('setPlaybackSpeed updates playback speed', () => {
    store.getState().setPlaybackSpeed(2);
    expect(store.getState().playbackSpeed).toBe(2);
  });

  it('setPlaybackSpeed handles fractional speeds', () => {
    store.getState().setPlaybackSpeed(0.5);
    expect(store.getState().playbackSpeed).toBe(0.5);
  });

  it('setIsPlaying updates playing state to true', () => {
    store.getState().setIsPlaying(true);
    expect(store.getState().isPlaying).toBe(true);
  });

  it('setIsPlaying updates playing state to false', () => {
    store.getState().setIsPlaying(true);
    store.getState().setIsPlaying(false);
    expect(store.getState().isPlaying).toBe(false);
  });

  // ── INDEX_PROGRESS ───────────────────────────────────────────────────────

  it('handles INDEX_PROGRESS message', () => {
    store.getState().handleExtensionMessage({
      type: 'INDEX_PROGRESS',
      payload: { phase: 'Scanning commits', current: 50, total: 200 },
    });

    const state = store.getState();
    expect(state.isIndexing).toBe(true);
    expect(state.indexProgress).toEqual({
      phase: 'Scanning commits',
      current: 50,
      total: 200,
    });
  });

  it('handles multiple INDEX_PROGRESS messages (progress updates)', () => {
    store.getState().handleExtensionMessage({
      type: 'INDEX_PROGRESS',
      payload: { phase: 'Scanning commits', current: 10, total: 100 },
    });
    store.getState().handleExtensionMessage({
      type: 'INDEX_PROGRESS',
      payload: { phase: 'Analyzing files', current: 75, total: 100 },
    });

    const state = store.getState();
    expect(state.isIndexing).toBe(true);
    expect(state.indexProgress).toEqual({
      phase: 'Analyzing files',
      current: 75,
      total: 100,
    });
  });

  // ── TIMELINE_DATA ────────────────────────────────────────────────────────

  it('handles TIMELINE_DATA message', () => {
    // First set indexing state
    store.getState().handleExtensionMessage({
      type: 'INDEX_PROGRESS',
      payload: { phase: 'Scanning', current: 90, total: 100 },
    });

    const commits: ICommitInfo[] = [
      { sha: 'aaa111', timestamp: 1000, message: 'Initial commit', author: 'Alice', parents: [] },
      { sha: 'bbb222', timestamp: 2000, message: 'Add feature', author: 'Bob', parents: ['aaa111'] },
      { sha: 'ccc333', timestamp: 3000, message: 'Fix bug', author: 'Alice', parents: ['bbb222'] },
    ];

    store.getState().handleExtensionMessage({
      type: 'TIMELINE_DATA',
      payload: { commits, currentSha: 'ccc333' },
    });

    const state = store.getState();
    expect(state.isIndexing).toBe(false);
    expect(state.indexProgress).toBeNull();
    expect(state.timelineActive).toBe(true);
    expect(state.timelineCommits).toEqual(commits);
    expect(state.currentCommitSha).toBe('ccc333');
  });

  // ── COMMIT_GRAPH_DATA ────────────────────────────────────────────────────

  it('handles COMMIT_GRAPH_DATA message', () => {
    const graphData: IGraphData = {
      nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' }],
      edges: [],
    };

    store.getState().handleExtensionMessage({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'abc123', graphData },
    });

    const state = store.getState();
    expect(state.currentCommitSha).toBe('abc123');
    expect(state.graphData).toEqual(graphData);
    expect(state.isLoading).toBe(false);
  });

  it('COMMIT_GRAPH_DATA updates currentCommitSha and graphData together', () => {
    // Set initial graph data
    const initialData: IGraphData = {
      nodes: [{ id: 'old.ts', label: 'old.ts', color: '#fff' }],
      edges: [],
    };
    store.setState({ graphData: initialData, currentCommitSha: 'old-sha' });

    const newData: IGraphData = {
      nodes: [{ id: 'new.ts', label: 'new.ts', color: '#000' }],
      edges: [],
    };

    store.getState().handleExtensionMessage({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'new-sha', graphData: newData },
    });

    expect(store.getState().currentCommitSha).toBe('new-sha');
    expect(store.getState().graphData).toEqual(newData);
  });

  // ── CACHE_INVALIDATED ────────────────────────────────────────────────────

  it('handles CACHE_INVALIDATED message', () => {
    // First, set up timeline state
    store.setState({
      timelineActive: true,
      timelineCommits: [
        { sha: 'aaa', timestamp: 1000, message: 'commit', author: 'a', parents: [] },
      ],
      currentCommitSha: 'aaa',
      isPlaying: true,
    });

    store.getState().handleExtensionMessage({ type: 'CACHE_INVALIDATED' });

    const state = store.getState();
    expect(state.timelineActive).toBe(false);
    expect(state.timelineCommits).toEqual([]);
    expect(state.currentCommitSha).toBeNull();
    expect(state.isPlaying).toBe(false);
  });

  it('CACHE_INVALIDATED does not affect non-timeline state', () => {
    store.setState({
      timelineActive: true,
      searchQuery: 'test-query',
      directionMode: 'none',
    });

    store.getState().handleExtensionMessage({ type: 'CACHE_INVALIDATED' });

    expect(store.getState().searchQuery).toBe('test-query');
    expect(store.getState().directionMode).toBe('none');
  });

  // ── PLAYBACK_ENDED ─────────────────────────────────────────────────

  it('handles PLAYBACK_ENDED message', () => {
    store.setState({ isPlaying: true });

    store.getState().handleExtensionMessage({ type: 'PLAYBACK_ENDED' });

    expect(store.getState().isPlaying).toBe(false);
  });

  it('PLAYBACK_ENDED does not affect timeline state', () => {
    store.setState({
      isPlaying: true,
      timelineActive: true,
      currentCommitSha: 'abc123',
      timelineCommits: [
        { sha: 'abc123', timestamp: 1000, message: 'commit', author: 'a', parents: [] },
      ],
    });

    store.getState().handleExtensionMessage({ type: 'PLAYBACK_ENDED' });

    expect(store.getState().isPlaying).toBe(false);
    expect(store.getState().timelineActive).toBe(true);
    expect(store.getState().currentCommitSha).toBe('abc123');
  });
});
