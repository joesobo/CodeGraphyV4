import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { e2eScenarios } from '../../../src/e2e/scenarios';
import { prepareScenarioWorkspacePlugins } from '../../../src/e2e/workspacePlugins';

const repoRoot = path.resolve(__dirname, '../../../../../');

describe('extension e2e scenarios', () => {
  it('points each scenario at a real example workspace', () => {
    for (const scenario of e2eScenarios) {
      const workspacePath = path.join(repoRoot, scenario.workspaceRelativePath);
      expect(fs.existsSync(workspacePath)).toBe(true);
    }
  });

  it('does not load headless plugin packages as VS Code extension development paths', () => {
    for (const scenario of e2eScenarios) {
      expect(scenario.pluginDevelopmentRelativePaths).toEqual([]);
    }
  });

  it('seeds installed package plugin records and workspace settings for the TypeScript scenario', () => {
    const scenario = e2eScenarios.find(entry => entry.name === 'typescript');
    expect(scenario).toBeDefined();

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-e2e-plugin-settings-'));
    const workspacePath = path.join(tempRoot, 'workspace');
    const homeDir = path.join(tempRoot, 'home');
    fs.mkdirSync(workspacePath, { recursive: true });

    try {
      prepareScenarioWorkspacePlugins(scenario!, repoRoot, workspacePath, homeDir, true);

      const pluginCache = JSON.parse(
        fs.readFileSync(path.join(homeDir, '.codegraphy/plugins.json'), 'utf-8'),
      ) as {
        plugins: Array<{ pluginId: string; package: string; packageRoot: string }>;
      };
      expect(pluginCache.plugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pluginId: 'codegraphy.typescript',
            package: '@codegraphy-dev/plugin-typescript',
            packageRoot: path.join(repoRoot, 'packages/plugin-typescript'),
          }),
        ]),
      );

      const workspaceSettings = JSON.parse(
        fs.readFileSync(path.join(workspacePath, '.codegraphy/settings.json'), 'utf-8'),
      ) as { plugins: Array<{ id: string; enabled: boolean }> };
      expect(workspaceSettings.plugins).toEqual(
        expect.arrayContaining([
          { id: 'codegraphy.markdown', enabled: true },
          { id: 'codegraphy.typescript', enabled: true },
        ]),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('can seed installed package plugin records without rewriting workspace settings', () => {
    const scenario = e2eScenarios.find(entry => entry.name === 'typescript');
    expect(scenario).toBeDefined();

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-e2e-cache-only-'));
    const workspacePath = path.join(tempRoot, 'workspace');
    const homeDir = path.join(tempRoot, 'home');
    fs.mkdirSync(workspacePath, { recursive: true });

    try {
      prepareScenarioWorkspacePlugins(scenario!, repoRoot, workspacePath, homeDir, false);

      expect(fs.existsSync(path.join(homeDir, '.codegraphy/plugins.json'))).toBe(true);
      expect(fs.existsSync(path.join(workspacePath, '.codegraphy/settings.json'))).toBe(false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
