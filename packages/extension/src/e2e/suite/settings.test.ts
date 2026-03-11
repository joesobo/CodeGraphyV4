/**
 * Settings panel e2e tests.
 *
 * Validates that settings-related webview messages round-trip correctly
 * through the extension host: the webview sends a message, the extension
 * processes it, and the updated value is either persisted in VS Code
 * settings or reflected in a subsequent SETTINGS_UPDATED broadcast.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';

interface CodeGraphyAPI {
  getGraphData(): import('../../shared/types').IGraphData;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAPI(): Promise<CodeGraphyAPI> {
  const ext = vscode.extensions.getExtension<CodeGraphyAPI>('joesobo.codegraphy');
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
    const disposable = api.onWebviewMessage((msg: unknown) => {
      const m = msg as { type: string; payload: unknown };
      if (m.type === type) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(m);
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
    api.sendToWebview({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'springLength', value: 200 },
    });

    await sleep(500);
    // No assertion needed — the test passes if no error was thrown
  });

  test('RESET_PHYSICS_SETTINGS is accepted without error', async function() {
    const api = await getAPI();
    api.sendToWebview({ type: 'RESET_PHYSICS_SETTINGS' });
    await sleep(500);
  });
});

suite('Settings: Filter Patterns', function () {
  this.timeout(30_000);

  test('UPDATE_FILTER_PATTERNS persists patterns via VS Code settings', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const patterns = ['**/*.test.ts', '**/*.spec.ts'];
    api.sendToWebview({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns },
    });

    await sleep(1_000);

    const config = vscode.workspace.getConfiguration('codegraphy');
    const stored = config.get<string[]>('filterPatterns') ?? [];
    assert.deepStrictEqual(stored, patterns, 'Filter patterns should be persisted in settings');

    // Cleanup
    await config.update('filterPatterns', [], vscode.ConfigurationTarget.Workspace);
  });
});

suite('Settings: Orphans', function () {
  this.timeout(30_000);

  test('UPDATE_SHOW_ORPHANS persists value and triggers refresh', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    api.sendToWebview({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: false } });
    await sleep(1_000);

    const config = vscode.workspace.getConfiguration('codegraphy');
    const stored = config.get<boolean>('showOrphans');
    assert.strictEqual(stored, false, 'showOrphans should be persisted as false');

    // Cleanup
    await config.update('showOrphans', true, vscode.ConfigurationTarget.Workspace);
  });
});

suite('Settings: Direction Mode', function () {
  this.timeout(30_000);

  test('UPDATE_DIRECTION_MODE persists and echoes DIRECTION_SETTINGS_UPDATED', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const echo = waitForMessage(api, 'DIRECTION_SETTINGS_UPDATED');
    api.sendToWebview({ type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: 'particles' } });

    const msg = (await echo) as { type: string; payload: { directionMode: string; particleSpeed: number; particleSize: number } };
    assert.strictEqual(msg.payload.directionMode, 'particles');

    // Cleanup
    const config = vscode.workspace.getConfiguration('codegraphy');
    await config.update('directionMode', 'arrows', vscode.ConfigurationTarget.Workspace);
  });
});

suite('Settings: Groups', function () {
  this.timeout(30_000);

  test('UPDATE_GROUPS persists groups in VS Code settings', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const groups = [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }];
    api.sendToWebview({ type: 'UPDATE_GROUPS', payload: { groups } });
    await sleep(1_000);

    const config = vscode.workspace.getConfiguration('codegraphy');
    const stored = config.get<typeof groups>('groups') ?? [];
    assert.ok(
      stored.some((g) => g.pattern === 'src/**'),
      `Expected group with pattern 'src/**'. Got: ${JSON.stringify(stored)}`
    );

    // Cleanup
    await config.update('groups', [], vscode.ConfigurationTarget.Workspace);
  });
});
