/**
 * Settings panel e2e tests.
 *
 * Validates that settings-related webview messages round-trip correctly
 * through the extension host: the webview sends a message, the extension
 * processes it, and the updated value is either persisted in
 * `.codegraphy/settings.json` or reflected in a subsequent
 * SETTINGS_UPDATED broadcast.
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { IGroup } from '../../shared/settings/groups';

interface CodeGraphyAPI {
  getGraphData(): import('../../shared/graph/types').IGraphData;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  dispatchWebviewMessage(message: unknown): Promise<void>;
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
}

interface RepoSettingsFile {
  legend?: IGroup[];
  filterPatterns?: string[];
  showOrphans?: boolean;
  directionMode?: string;
}

function readRepoSettingsFile(settingsPath: string): RepoSettingsFile {
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as RepoSettingsFile;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAPI(): Promise<CodeGraphyAPI> {
  const ext = vscode.extensions.getExtension<CodeGraphyAPI>('codegraphy.codegraphy');
  assert.ok(ext, 'Extension not found');
  return ext.activate();
}

/** Wait for the extension to send a specific message type back to the webview. */
function waitForMessage(
  api: CodeGraphyAPI,
  type: string,
  timeoutMs = 10_000
): Promise<{ type: string; payload: unknown }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for message type '${type}'`)),
      timeoutMs
    );
    const disposable = api.onExtensionMessage((msg: unknown) => {
      const message = msg as { type: string; payload: unknown };
      if (message.type === type) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(message);
      }
    });
  });
}

suite('Settings: Physics', function () {
  this.timeout(30_000);

  test('UPDATE_PHYSICS_SETTING is accepted without error', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    // Should not throw
    await api.dispatchWebviewMessage({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'linkDistance', value: 200 },
    });

    await sleep(500);
    // No assertion needed — the test passes if no error was thrown
  });

  test('RESET_PHYSICS_SETTINGS is accepted without error', async function() {
    const api = await getAPI();
    await api.dispatchWebviewMessage({ type: 'RESET_PHYSICS_SETTINGS' });
    await sleep(500);
  });
});

suite('Settings: Filter Patterns', function () {
  this.timeout(30_000);

  test('UPDATE_FILTER_PATTERNS persists patterns via .codegraphy/settings.json', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const patterns = ['**/*.test.ts', '**/*.spec.ts'];
    await api.dispatchWebviewMessage({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns },
    });

    await sleep(1_000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected an open workspace folder');
    const settingsPath = path.join(workspaceFolder.uri.fsPath, '.codegraphy', 'settings.json');
    const stored = readRepoSettingsFile(settingsPath).filterPatterns ?? [];
    assert.deepStrictEqual(stored, patterns, 'Filter patterns should be persisted in settings');
  });
});

suite('Settings: Orphans', function () {
  this.timeout(30_000);

  test('UPDATE_SHOW_ORPHANS persists value and triggers refresh', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    await api.dispatchWebviewMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: false } });
    await sleep(1_000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected an open workspace folder');
    const settingsPath = path.join(workspaceFolder.uri.fsPath, '.codegraphy', 'settings.json');
    const stored = readRepoSettingsFile(settingsPath).showOrphans;
    assert.strictEqual(stored, false, 'showOrphans should be persisted as false');

    await api.dispatchWebviewMessage({
      type: 'UPDATE_SHOW_ORPHANS',
      payload: { showOrphans: true },
    });
    await sleep(1_000);
  });
});

suite('Settings: Direction Mode', function () {
  this.timeout(30_000);

  test('UPDATE_DIRECTION_MODE persists and echoes DIRECTION_SETTINGS_UPDATED', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const echo = waitForMessage(api, 'DIRECTION_SETTINGS_UPDATED');
    await api.dispatchWebviewMessage({
      type: 'UPDATE_DIRECTION_MODE',
      payload: { directionMode: 'particles' },
    });

    const msg = (await echo) as { type: string; payload: { directionMode: string; directionColor: string; particleSpeed: number; particleSize: number } };
    assert.strictEqual(msg.payload.directionMode, 'particles');

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected an open workspace folder');
    const settingsPath = path.join(workspaceFolder.uri.fsPath, '.codegraphy', 'settings.json');
    const stored = readRepoSettingsFile(settingsPath).directionMode;
    assert.strictEqual(stored, 'particles', 'directionMode should be persisted to repo settings');
  });
});

suite('Settings: Legends', function () {
  this.timeout(30_000);

  test('UPDATE_LEGENDS persists legend rules in .codegraphy/settings.json', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const legends = [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }];
    await api.dispatchWebviewMessage({ type: 'UPDATE_LEGENDS', payload: { legends } });
    await sleep(1_000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected an open workspace folder');
    const settingsPath = path.join(workspaceFolder.uri.fsPath, '.codegraphy', 'settings.json');
    const stored = readRepoSettingsFile(settingsPath).legend ?? [];
    assert.ok(
      stored.some((g) => g.pattern === 'src/**'),
      `Expected group with pattern 'src/**'. Got: ${JSON.stringify(stored)}`
    );

    // Cleanup
    const current = readRepoSettingsFile(settingsPath);
    current.legend = [];
    fs.writeFileSync(settingsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  });
});
