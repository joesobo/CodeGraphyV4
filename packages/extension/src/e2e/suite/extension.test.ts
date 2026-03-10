/**
 * Extension activation and command registration tests.
 * These run inside a real VS Code instance via @vscode/test-electron.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension: Activation', function () {
  this.timeout(30_000);

  test('extension is present in VS Code', function() {
    const ext = vscode.extensions.getExtension('joesobo.codegraphy');
    assert.ok(ext, 'Extension should be registered with VS Code');
  });

  test('extension activates without error', async function() {
    const ext = vscode.extensions.getExtension('joesobo.codegraphy');
    assert.ok(ext);
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true, 'Extension should be active after activate()');
  });

  test('all commands are registered', async function() {
    const ext = vscode.extensions.getExtension('joesobo.codegraphy');
    await ext!.activate();

    const all = await vscode.commands.getCommands(true);
    const expected = [
      'codegraphy.open',
      'codegraphy.fitView',
      'codegraphy.zoomIn',
      'codegraphy.zoomOut',
      'codegraphy.undo',
      'codegraphy.redo',
      'codegraphy.exportPng',
      'codegraphy.exportSvg',
      'codegraphy.exportJson',
      'codegraphy.clearCache',
    ];

    for (const cmd of expected) {
      assert.ok(all.includes(cmd), `Command '${cmd}' should be registered`);
    }
  });

  test('codegraphy.open command executes without throwing', async function() {
    try {
      await vscode.commands.executeCommand('codegraphy.open');
    } catch (err) {
      assert.fail(`codegraphy.open should not throw, but got: ${err}`);
    }
  });
});
