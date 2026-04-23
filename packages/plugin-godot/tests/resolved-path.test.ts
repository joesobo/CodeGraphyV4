import { describe, expect, it } from 'vitest';
import { materializeResolvedPath } from '../src/resolved-path';

describe('materializeResolvedPath', () => {
	it('joins project-relative resource paths against the Godot project root', () => {
		expect(
			materializeResolvedPath({
				projectRoot: '/workspace/examples/example-godot',
				resolvedPath: 'resources/player_loadout.tres',
				workspaceRoot: '/workspace/examples',
			}),
		).toBe('/workspace/examples/example-godot/resources/player_loadout.tres');
	});

	it('keeps nested workspace-relative relative-path resolutions anchored to the workspace root', () => {
		expect(
			materializeResolvedPath({
				projectRoot: '/workspace/examples/example-godot',
				resolvedPath: 'example-godot/scripts/ui/loadout_preview.gd',
				workspaceRoot: '/workspace/examples',
			}),
		).toBe('/workspace/examples/example-godot/scripts/ui/loadout_preview.gd');
	});

	it('returns absolute resolved paths unchanged', () => {
		expect(
			materializeResolvedPath({
				projectRoot: '/workspace/examples/example-godot',
				resolvedPath: '/workspace/examples/example-godot/textures/player_card.png',
				workspaceRoot: '/workspace/examples',
			}),
		).toBe('/workspace/examples/example-godot/textures/player_card.png');
	});
});
