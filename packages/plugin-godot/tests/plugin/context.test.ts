import { describe, expect, it } from 'vitest';
import { GDScriptPathResolver } from '../../src/PathResolver';
import { buildAnalysisContext } from '../../src/plugin/context';

describe('buildAnalysisContext', () => {
  it('builds workspace-relative file context with the nearest Godot project root', () => {
    const context = buildAnalysisContext(
      new GDScriptPathResolver('/workspace/game'),
      '/workspace/game/addons/tool/plugin.gd',
      '/workspace/game',
      new Set(['', 'addons/tool']),
    );

    expect(context.relativeFilePath).toBe('addons/tool/plugin.gd');
    expect(context.workspaceRoot).toBe('/workspace/game');
    expect(context.projectRoot).toBe('/workspace/game/addons/tool');
  });
});
