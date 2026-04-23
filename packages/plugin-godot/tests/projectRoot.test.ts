import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectGodotProjectRoots, resolveGodotProjectRoot } from '../src/projectRoot';

describe('Godot project root resolution', () => {
  it('collects nested and workspace-root project markers', () => {
    expect(
      collectGodotProjectRoots([
        'project.godot',
        'apps/game/project.godot',
        'apps/game/scripts/player.gd',
      ]),
    ).toEqual(new Set(['', 'apps/game']));
  });

  it('resolves the nearest indexed project.godot root without reading the live filesystem', () => {
    const workspaceRoot = '/workspace';
    const projectRoots = new Set(['', 'apps/game']);

    expect(
      resolveGodotProjectRoot(
        path.join(workspaceRoot, 'apps/game/scripts/player.gd'),
        workspaceRoot,
        projectRoots,
      ),
    ).toBe(path.join(workspaceRoot, 'apps/game'));
  });

  it('falls back to the workspace root when no indexed project marker matches', () => {
    const workspaceRoot = '/workspace';

    expect(
      resolveGodotProjectRoot(
        path.join(workspaceRoot, 'misc/tools/helper.gd'),
        workspaceRoot,
        new Set(['apps/game']),
      ),
    ).toBe(workspaceRoot);
  });
});
