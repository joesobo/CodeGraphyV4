import fs from 'fs';
import os from 'os';
import path from 'path';
import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCssSnippetMessage } from '../../../../../src/extension/graphView/webview/settingsMessages/cssSnippets';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

let workspaceRoot = '';

function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
    filterPatterns: [],
    workspaceRoot,
    asWebviewUri: uri => ({ toString: () => `webview:${uri.fsPath}` }),
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewSettingsMessageHandlers> = {},
): GraphViewSettingsMessageHandlers {
  return {
    getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
      if (key === 'cssSnippets') {
        return {
          '.codegraphy/snippets/base.css': false,
        } as T;
      }
      return defaultValue;
    }),
    updateConfig: vi.fn(() => Promise.resolve()),
    reloadWorkspacePlugins: vi.fn(() => Promise.resolve()),
    syncWorkspacePlugins: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    smartRebuild: vi.fn(),
    sendGraphControls: vi.fn(),
    reprocessGraphScope: vi.fn(() => Promise.resolve()),
    reprocessPluginFiles: vi.fn(() => Promise.resolve()),
    getPluginFilterPatterns: vi.fn(() => []),
    getPluginFilterGroups: vi.fn(() => []),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as GraphViewSettingsMessageHandlers;
}

describe('graph view CSS snippet settings message', () => {
  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-css-toggle-'));
    fs.mkdirSync(path.join(workspaceRoot, '.codegraphy', 'snippets'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, '.codegraphy', 'snippets', 'base.css'), 'body {}');
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it('persists the toggled snippet map and sends refreshed stylesheet URLs', async () => {
    const state = createState();
    const handlers = createHandlers();

    const handled = await applyCssSnippetMessage(
      {
        type: 'UPDATE_CSS_SNIPPET',
        payload: { path: '.codegraphy/snippets/base.css', enabled: true },
      },
      state,
      handlers,
    );

    const snippets = {
      '.codegraphy/snippets/base.css': true,
    };

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('cssSnippets', snippets);
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'CSS_SNIPPETS_UPDATED',
      payload: {
        snippets,
        stylesheets: [
          `webview:${vscode.Uri.file(path.join(workspaceRoot, '.codegraphy', 'snippets', 'base.css')).fsPath}`,
        ],
      },
    });
  });

  it('returns false for unrelated messages', async () => {
    await expect(applyCssSnippetMessage(
      { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
      createState(),
      createHandlers(),
    )).resolves.toBe(false);
  });
});
