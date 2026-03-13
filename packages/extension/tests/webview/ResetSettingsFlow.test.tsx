/**
 * @fileoverview Integration test for the full reset-settings flow.
 * Verifies: change settings → reset → defaults applied → undo → original values restored.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SettingsPanel from '../../src/webview/components/SettingsPanel';
import { graphStore } from '../../src/webview/store';
import type { IPhysicsSettings, ExtensionToWebviewMessage } from '../../src/shared/types';
import { DEFAULT_DIRECTION_COLOR, DEFAULT_FOLDER_NODE_COLOR } from '../../src/shared/types';

// Capture postMessage calls
const sentMessages: unknown[] = [];
vi.mock('../../src/webview/lib/vscodeApi', () => ({
  postMessage: (msg: unknown) => sentMessages.push(msg),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

/** Defaults matching package.json / store defaults */
const DEFAULTS = {
  physics: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 } as IPhysicsSettings,
  directionMode: 'arrows' as const,
  directionColor: DEFAULT_DIRECTION_COLOR,
  showLabels: true,
  showOrphans: true,
  bidirectionalMode: 'separate' as const,
  folderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
  particleSpeed: 0.005,
  particleSize: 4,
  nodeSizeMode: 'connections' as const,
  groups: [] as unknown[],
  filterPatterns: [] as string[],
};

/** Non-default values representing user changes */
const MODIFIED = {
  physics: { repelForce: 3, linkDistance: 300, linkForce: 0.8, damping: 0.2, centerForce: 0.9 } as IPhysicsSettings,
  directionMode: 'particles' as const,
  directionColor: '#FF0000',
  showLabels: false,
  showOrphans: false,
  bidirectionalMode: 'combined' as const,
  folderNodeColor: '#00FF00',
  particleSpeed: 0.001,
  particleSize: 10,
  nodeSizeMode: 'file-size' as const,
  groups: [{ id: 'g1', pattern: '*.ts', color: '#3B82F6' }],
  filterPatterns: ['**/*.test.ts'],
};

/** Helper to simulate an extension message arriving */
function simulateExtensionMessage(msg: ExtensionToWebviewMessage) {
  graphStore.getState().handleExtensionMessage(msg);
}

function setModifiedState() {
  graphStore.setState({
    physicsSettings: MODIFIED.physics,
    groups: MODIFIED.groups,
    filterPatterns: MODIFIED.filterPatterns,
    pluginFilterPatterns: [],
    showOrphans: MODIFIED.showOrphans,
    nodeSizeMode: MODIFIED.nodeSizeMode,
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    depthLimit: 1,
    directionMode: MODIFIED.directionMode,
    directionColor: MODIFIED.directionColor,
    particleSpeed: MODIFIED.particleSpeed,
    particleSize: MODIFIED.particleSize,
    showLabels: MODIFIED.showLabels,
    graphMode: '2d',
    maxFiles: 500,
    bidirectionalMode: MODIFIED.bidirectionalMode,
    folderNodeColor: MODIFIED.folderNodeColor,
  });
}

describe('Reset Settings Flow: change → reset → undo', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('user changes settings, clicks reset, then undoes reset', () => {
    // ── STEP 1: Start with modified (non-default) settings ─────────────────
    setModifiedState();
    const onClose = vi.fn();
    render(<SettingsPanel isOpen={true} onClose={onClose} />);

    // Verify store reflects the modified settings
    let state = graphStore.getState();
    expect(state.physicsSettings.repelForce).toBe(3);
    expect(state.directionMode).toBe('particles');
    expect(state.showLabels).toBe(false);
    expect(state.showOrphans).toBe(false);
    expect(state.nodeSizeMode).toBe('file-size');
    expect(state.groups).toHaveLength(1);
    expect(state.filterPatterns).toEqual(['**/*.test.ts']);

    // ── STEP 2: Click the Reset button ─────────────────────────────────────
    const resetButton = screen.getByTitle('Reset Settings');
    fireEvent.click(resetButton);

    // Verify RESET_ALL_SETTINGS was sent with current nodeSizeMode
    const resetMsg = sentMessages.find(
      (item: unknown) => (item as { type: string }).type === 'RESET_ALL_SETTINGS',
    ) as { type: string; payload: { nodeSizeMode: string } } | undefined;
    expect(resetMsg).toBeDefined();
    expect(resetMsg!.payload.nodeSizeMode).toBe('file-size');

    // ── STEP 3: Simulate extension responding with default settings ────────
    // (In real flow, ResetSettingsAction calls _sendAllSettings + _analyzeAndSendData)
    act(() => {
      simulateExtensionMessage({ type: 'PHYSICS_SETTINGS_UPDATED', payload: DEFAULTS.physics });
      simulateExtensionMessage({ type: 'SETTINGS_UPDATED', payload: { bidirectionalEdges: DEFAULTS.bidirectionalMode, showOrphans: DEFAULTS.showOrphans } });
      simulateExtensionMessage({ type: 'DIRECTION_SETTINGS_UPDATED', payload: {
        directionMode: DEFAULTS.directionMode,
        particleSpeed: DEFAULTS.particleSpeed,
        particleSize: DEFAULTS.particleSize,
        directionColor: DEFAULTS.directionColor,
      }});
      simulateExtensionMessage({ type: 'SHOW_LABELS_UPDATED', payload: { showLabels: DEFAULTS.showLabels } });
      simulateExtensionMessage({ type: 'FOLDER_NODE_COLOR_UPDATED', payload: { folderNodeColor: DEFAULTS.folderNodeColor } });
      simulateExtensionMessage({ type: 'GROUPS_UPDATED', payload: { groups: [] } });
      simulateExtensionMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { patterns: [], pluginPatterns: [] } });
      simulateExtensionMessage({ type: 'NODE_SIZE_MODE_UPDATED', payload: { nodeSizeMode: 'connections' } });
    });

    // Verify store now has defaults
    state = graphStore.getState();
    expect(state.physicsSettings).toEqual(DEFAULTS.physics);
    expect(state.directionMode).toBe('arrows');
    expect(state.showLabels).toBe(true);
    expect(state.showOrphans).toBe(true);
    expect(state.nodeSizeMode).toBe('connections');
    expect(state.groups).toEqual([]);
    expect(state.filterPatterns).toEqual([]);
    expect(state.bidirectionalMode).toBe('separate');
    expect(state.folderNodeColor).toBe(DEFAULT_FOLDER_NODE_COLOR);

    // ── STEP 4: Simulate Undo — extension sends back original values ───────
    act(() => {
      simulateExtensionMessage({ type: 'PHYSICS_SETTINGS_UPDATED', payload: MODIFIED.physics });
      simulateExtensionMessage({ type: 'SETTINGS_UPDATED', payload: { bidirectionalEdges: MODIFIED.bidirectionalMode, showOrphans: MODIFIED.showOrphans } });
      simulateExtensionMessage({ type: 'DIRECTION_SETTINGS_UPDATED', payload: {
        directionMode: MODIFIED.directionMode,
        particleSpeed: MODIFIED.particleSpeed,
        particleSize: MODIFIED.particleSize,
        directionColor: MODIFIED.directionColor,
      }});
      simulateExtensionMessage({ type: 'SHOW_LABELS_UPDATED', payload: { showLabels: MODIFIED.showLabels } });
      simulateExtensionMessage({ type: 'FOLDER_NODE_COLOR_UPDATED', payload: { folderNodeColor: MODIFIED.folderNodeColor } });
      simulateExtensionMessage({ type: 'GROUPS_UPDATED', payload: { groups: MODIFIED.groups } });
      simulateExtensionMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { patterns: MODIFIED.filterPatterns, pluginPatterns: [] } });
      simulateExtensionMessage({ type: 'NODE_SIZE_MODE_UPDATED', payload: { nodeSizeMode: MODIFIED.nodeSizeMode } });
    });

    // Verify store is back to the modified (pre-reset) values
    state = graphStore.getState();
    expect(state.physicsSettings).toEqual(MODIFIED.physics);
    expect(state.directionMode).toBe('particles');
    expect(state.showLabels).toBe(false);
    expect(state.showOrphans).toBe(false);
    expect(state.nodeSizeMode).toBe('file-size');
    expect(state.groups).toHaveLength(1);
    expect(state.filterPatterns).toEqual(['**/*.test.ts']);
    expect(state.bidirectionalMode).toBe('combined');
    expect(state.folderNodeColor).toBe('#00FF00');
    expect(state.directionColor).toBe('#FF0000');
  });
});
