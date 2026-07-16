import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppBehaviorComponent, getAppBehaviorGraphStore, getAppBehaviorHarness, resetAppBehaviorHarness, sendAppMessage } from './fixture';

const App = getAppBehaviorComponent();

const graphStore = getAppBehaviorGraphStore();

const harness = getAppBehaviorHarness();

describe('App graph render stability', () => {
  beforeEach(() => resetAppBehaviorHarness());
  afterEach(() => vi.restoreAllMocks());

  it('does not rerender Graph for unchanged decorations after a refresh data update', async () => {
        graphStore.setState({
          graphData: {
            nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
            edges: [],
          },
          nodeDecorations: {},
          edgeDecorations: {},
        });
  
        render(<App />);
        expect(screen.getByTestId('mock-graph')).toBeInTheDocument();
  
        harness.graphRenderCount = 0;
  
        await act(async () => {
          sendAppMessage({
            type: 'GRAPH_DATA_UPDATED',
            payload: {
              nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
              edges: [],
            },
          });
        });
  
        expect(harness.graphRenderCount).toBe(1);
  
        await act(async () => {
          sendAppMessage({
            type: 'DECORATIONS_UPDATED',
            payload: {
              nodeDecorations: {},
              edgeDecorations: {},
            },
          });
        });
  
        expect(harness.graphRenderCount).toBe(1);
      });

  it('does not rerender Graph for unchanged legends before a refresh data update', async () => {
        graphStore.setState({
          graphData: {
            nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
            edges: [],
          },
          legends: [{ id: 'src-group', pattern: 'src/**', color: '#00ff00' }],
        });
  
        render(<App />);
        expect(screen.getByTestId('mock-graph')).toBeInTheDocument();
  
        harness.graphRenderCount = 0;
  
        await act(async () => {
          sendAppMessage({
            type: 'LEGENDS_UPDATED',
            payload: {
              legends: [{ id: 'src-group', pattern: 'src/**', color: '#00ff00' }],
            },
          });
        });
  
        expect(harness.graphRenderCount).toBe(0);
  
        await act(async () => {
          sendAppMessage({
            type: 'GRAPH_DATA_UPDATED',
            payload: {
              nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
              edges: [],
            },
          });
        });
  
        expect(harness.graphRenderCount).toBe(1);
      });
});
